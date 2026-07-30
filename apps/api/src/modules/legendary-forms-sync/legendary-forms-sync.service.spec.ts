import { BadRequestException } from '@nestjs/common';
import { LegendaryFormsSyncService } from './legendary-forms-sync.service';
import { ProfessionsService } from '../professions/professions.service';
import { FormsSyncWebhookDto } from './dto/forms-sync-webhook.dto';

/** Payload canônico válido e completo — base para variações nos cenários. */
function validPayload(over: Partial<FormsSyncWebhookDto> = {}): FormsSyncWebhookDto {
  return {
    responseId: 'resp-1',
    responseTimestamp: '2026-07-09T12:00:00.000Z',
    fullName: 'João da Silva',
    lgndNumber: '12.345',
    phone: '+55 64 99988-7766',
    team: 'Mídia',
    email: 'joao@x.com',
    emailConfirmation: 'joao@x.com',
    birthDate: '1990-05-20',
    district: 'Centro',
    city: 'Caldas novas GO',
    state: 'GO',
    churchName: 'Igreja X',
    profession: 'Pedreiro',
    relativeName: 'Maria',
    isSpiritualLeader: false,
    ...over,
  };
}

describe('LegendaryFormsSyncService', () => {
  let service: LegendaryFormsSyncService;
  let prisma: any;
  let audit: any;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn((cb: any) => cb(prisma)),
      legendary: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args: any) => Promise.resolve({ id: 'leg-new', ...args.data })),
        update: jest.fn().mockImplementation((args: any) => Promise.resolve({ id: args.where.id, ...args.data })),
      },
      team: { findMany: jest.fn().mockResolvedValue([{ id: 'tm-midia', name: 'Mídia' }]) },
      church: { findMany: jest.fn().mockResolvedValue([{ id: 'ch-x', name: 'Igreja X' }]) },
      churchAlias: { findUnique: jest.fn().mockResolvedValue(null) },
      profession: {
        findMany: jest.fn().mockResolvedValue([{ id: 'pr-ped', name: 'Pedreiro' }]),
        // Provam que o resolvedor NUNCA cria profissão a partir do Forms.
        create: jest.fn(),
        upsert: jest.fn(),
      },
      teamMembership: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
      legendaryHistory: { create: jest.fn() },
    };
    audit = { create: jest.fn() };
    service = new LegendaryFormsSyncService(prisma, audit, new ProfessionsService(prisma, audit));
  });

  // 7.8 (parte) — âncoras de identidade
  it('rejeita quando falta número de legendário (sem dígitos)', async () => {
    await expect(service.ingest(validPayload({ lgndNumber: 'ABC' }))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita quando falta nome', async () => {
    await expect(service.ingest(validPayload({ fullName: '   ' }))).rejects.toBeInstanceOf(BadRequestException);
  });

  // 7.1 — cria novo com marcadores e normalização
  it('cria novo Legendary com marcadores e dados normalizados', async () => {
    const res = await service.ingest(validPayload());

    expect(res.result).toBe('created');
    expect(prisma.legendary.create).toHaveBeenCalledTimes(1);
    const data = prisma.legendary.create.mock.calls[0][0].data;
    expect(data.isFromRotaDoCerrado).toBe(true);
    expect(data.status).toBe('ACTIVE');
    expect(data.lgndNumber).toBe('12345'); // só dígitos
    expect(data.phone).toBe('(64) 99988-7766'); // formato único
    expect(data.city).toBe('Caldas Novas'); // canonicalizada
    expect(data.formsResponseId).toBe('resp-1');
    expect(data.lastFormsSyncAt).toBeInstanceOf(Date);
    expect(data.needsReview).toBe(false); // tudo casou, sem issues
    expect(res.issues).toEqual([]);
  });

  /**
   * Profissão em texto livre (change profissao-livre-vinculo-catalogo). O sync usa o MESMO
   * resolvedor do cadastro manual e agora persiste no perfil o texto que não casou — antes
   * ele ficava só nos metadados da inconsistência.
   */
  describe('profissão do Forms', () => {
    it('match único grava o vínculo e não deixa texto residual', async () => {
      await service.ingest(validPayload({ profession: '  pedreiro  ' }));

      const data = prisma.legendary.create.mock.calls[0][0].data;
      expect(data.professionId).toBe('pr-ped');
      expect(data.professionText).toBeNull();
      expect(data.needsReview).toBe(false);
    });

    it('sem match persiste o texto no perfil, registra a issue e marca needsReview', async () => {
      const res = await service.ingest(validPayload({ profession: 'Domador de Leões' }));

      const data = prisma.legendary.create.mock.calls[0][0].data;
      expect(data.professionId).toBeNull();
      expect(data.professionText).toBe('Domador de Leões');
      expect(data.needsReview).toBe(true);
      expect(res.issues).toContain('Profissão não encontrada: Domador de Leões');
    });

    it('colisão normalizada no catálogo é ambígua: preserva texto, não escolhe id', async () => {
      prisma.profession.findMany.mockResolvedValueOnce([
        { id: 'pr-a', name: 'Pedreiro' },
        { id: 'pr-b', name: 'pedreiro' },
      ]);

      const res = await service.ingest(validPayload({ profession: 'Pedreiro' }));

      const data = prisma.legendary.create.mock.calls[0][0].data;
      expect(data.professionId).toBeNull();
      expect(data.professionText).toBe('Pedreiro');
      expect(data.needsReview).toBe(true);
      expect(res.issues).toContain('Profissão ambígua no catálogo: Pedreiro');
    });

    it('nunca cria profissão a partir do Forms', async () => {
      await service.ingest(validPayload({ profession: 'Domador de Leões' }));

      expect(prisma.profession.create).not.toHaveBeenCalled();
      expect(prisma.profession.upsert).not.toHaveBeenCalled();
    });
  });

  // 7.2 — mesmo número + nome tolerante atualiza (não duplica)
  it('atualiza quando o número existe e o nome bate (comparação tolerante)', async () => {
    prisma.legendary.findUnique.mockResolvedValueOnce({
      id: 'leg-1', fullName: 'JOAO DA SILVA', formsResponseId: 'old', lastFormsSyncAt: new Date('2026-07-01T00:00:00Z'), needsReview: false, notes: null,
    });

    const res = await service.ingest(validPayload({ responseId: 'resp-2' }));

    expect(res.result).toBe('updated');
    expect(prisma.legendary.update).toHaveBeenCalledTimes(1);
    expect(prisma.legendary.create).not.toHaveBeenCalled();
  });

  // 7.3 — reenvio do mesmo responseId é no-op idempotente
  it('é idempotente: reenvio do mesmo responseId não altera nada', async () => {
    prisma.legendary.findUnique.mockResolvedValueOnce({
      id: 'leg-1', fullName: 'João da Silva', formsResponseId: 'resp-1', lastFormsSyncAt: new Date('2026-07-09T12:00:00Z'), needsReview: false, notes: null,
    });

    const res = await service.ingest(validPayload({ responseId: 'resp-1' }));

    expect(res).toEqual({ result: 'skipped', reason: 'duplicate', legendaryId: 'leg-1' });
    expect(prisma.legendary.update).not.toHaveBeenCalled();
    expect(prisma.legendary.create).not.toHaveBeenCalled();
  });

  // 7.4 — resposta mais antiga não sobrescreve (last-write-wins)
  it('ignora resposta com timestamp mais antigo que a última sincronização', async () => {
    prisma.legendary.findUnique.mockResolvedValueOnce({
      id: 'leg-1', fullName: 'João da Silva', formsResponseId: 'resp-0', lastFormsSyncAt: new Date('2026-07-10T00:00:00Z'), needsReview: false, notes: null,
    });

    const res = await service.ingest(validPayload({ responseId: 'resp-late', responseTimestamp: '2026-07-09T12:00:00.000Z' }));

    expect(res).toEqual({ result: 'skipped', reason: 'stale', legendaryId: 'leg-1' });
    expect(prisma.legendary.update).not.toHaveBeenCalled();
  });

  // 7.5 — número existe mas nome diverge → conflito, sem overwrite
  it('marca conflito e NÃO sobrescreve identidade quando o nome diverge', async () => {
    const existing = { id: 'leg-1', fullName: 'Pedro Alves', formsResponseId: 'x', lastFormsSyncAt: new Date('2026-01-01T00:00:00Z'), needsReview: false, notes: null };
    prisma.legendary.findUnique.mockResolvedValueOnce(existing);

    const res = await service.ingest(validPayload({ responseId: 'resp-9' }));

    expect(res.result).toBe('conflict');
    expect(res.needsReview).toBe(true);
    // update chamado só com needsReview/notes/formsResponseId — nunca com fullName
    const data = prisma.legendary.update.mock.calls[0][0].data;
    expect(data.needsReview).toBe(true);
    expect(data.fullName).toBeUndefined();
    expect(data.lastFormsSyncAt).toBeUndefined(); // não avança a sincronização
  });

  // 7.6 — equipe conhecida vincula; desconhecida vira needsReview sem falhar
  it('vincula TeamMembership para equipe conhecida', async () => {
    await service.ingest(validPayload());
    expect(prisma.teamMembership.create).toHaveBeenCalledTimes(1);
    expect(prisma.teamMembership.create.mock.calls[0][0].data.teamId).toBe('tm-midia');
  });

  it('não falha e marca needsReview quando a equipe é desconhecida', async () => {
    const res = await service.ingest(validPayload({ team: 'Equipe Inexistente' }));
    expect(res.result).toBe('created');
    expect(res.needsReview).toBe(true);
    expect(res.issues).toEqual(expect.arrayContaining([expect.stringContaining('Equipe não encontrada')]));
    expect(prisma.teamMembership.create).not.toHaveBeenCalled();
  });

  // 7.7 — email de confirmação divergente marca needsReview
  it('marca needsReview quando e-mail e confirmação divergem', async () => {
    const res = await service.ingest(validPayload({ email: 'a@x.com', emailConfirmation: 'b@x.com' }));
    expect(res.needsReview).toBe(true);
    expect(res.issues).toEqual(expect.arrayContaining([expect.stringContaining('confirmação divergem')]));
  });

  // Auditoria/histórico
  it('registra auditoria e histórico com origem google-forms', async () => {
    await service.ingest(validPayload());
    expect(audit.create).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Legendary', action: 'forms_sync' }),
      prisma,
    );
    const hist = prisma.legendaryHistory.create.mock.calls[0][0].data;
    expect(hist.type).toBe('LEGENDARY_CREATED');
    expect(hist.metadata.source).toBe('google-forms');
    expect(hist.metadata.responseId).toBe('resp-1');
  });
});
