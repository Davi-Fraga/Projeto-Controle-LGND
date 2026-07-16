import { LegendaryFormsSyncService } from '../legendary-forms-sync.service';
import { COLUMN_MAP, rowToPayload } from './forms-row-mapper';

/**
 * Teste do BACKFILL passando pelo SERVIÇO REAL (Prisma mockado no mesmo estilo do
 * legendary-forms-sync.service.spec). Prova que uma linha da planilha, montada pelo
 * mapper, produz no serviço o MESMO resultado que a resposta teria pelo webhook:
 * criação, atualização da mesma pessoa sem duplicar, e conflito de nome → needsReview.
 */
function record(over: Record<string, string> = {}): Record<string, string> {
  const base: Record<string, string> = {};
  for (const { header } of COLUMN_MAP) base[header] = '';
  return {
    ...base,
    'Carimbo de data/hora': '14/07/2026 13:45:22',
    'Nome completo': 'João da Silva',
    'Número de telefone (WhatsApp)': '(64) 99988-7766',
    'Número de Legendário': '12.345',
    'Faço parte ou quero fazer parte da equipe': 'Mídia',
    'E-mail': 'joao@x.com',
    'Confirmação de e-mail': 'joao@x.com',
    'Data de nascimento': '20/05/1990',
    Bairro: 'Centro',
    Cidade: 'Caldas Novas',
    Estado: 'GO',
    'Nome da igreja que frequenta': 'Igreja X',
    Profissão: 'Pedreiro',
    'Nome da esposa ou mãe': 'Maria',
    'É líder espiritual?': 'Não',
    ...over,
  };
}

describe('backfill-from-forms (serviço real)', () => {
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
      profession: { findMany: jest.fn().mockResolvedValue([{ id: 'pr-ped', name: 'Pedreiro' }]) },
      teamMembership: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
      legendaryHistory: { create: jest.fn() },
    };
    audit = { create: jest.fn() };
    service = new LegendaryFormsSyncService(prisma, audit);
  });

  it('cria um novo legendário a partir da linha da planilha', async () => {
    const { payload } = rowToPayload(record());
    const res = await service.ingest(payload);

    expect(res.result).toBe('created');
    expect(prisma.legendary.create).toHaveBeenCalledTimes(1);
    expect(prisma.legendary.create.mock.calls[0][0].data.lgndNumber).toBe('12345');
    expect(prisma.legendary.create.mock.calls[0][0].data.formsResponseId).toBe(payload.responseId);
  });

  it('atualiza a MESMA pessoa (2ª resposta) sem duplicar', async () => {
    prisma.legendary.findUnique.mockResolvedValueOnce({
      id: 'leg-1',
      fullName: 'JOAO DA SILVA',
      formsResponseId: 'backfill:antigo',
      lastFormsSyncAt: new Date('2026-07-01T00:00:00-03:00'),
      needsReview: false,
      notes: null,
    });

    const { payload } = rowToPayload(record({ Cidade: 'Morrinhos' }));
    const res = await service.ingest(payload);

    expect(res.result).toBe('updated');
    expect(prisma.legendary.update).toHaveBeenCalledTimes(1);
    expect(prisma.legendary.create).not.toHaveBeenCalled();
  });

  it('nome divergente para o mesmo número → conflito e needsReview (sem sobrescrever nome)', async () => {
    prisma.legendary.findUnique.mockResolvedValueOnce({
      id: 'leg-1',
      fullName: 'Pedro Alves',
      formsResponseId: 'x',
      lastFormsSyncAt: new Date('2026-01-01T00:00:00-03:00'),
      needsReview: false,
      notes: null,
    });

    const { payload } = rowToPayload(record());
    const res = await service.ingest(payload);

    expect(res.result).toBe('conflict');
    expect(res.needsReview).toBe(true);
    expect(prisma.legendary.update.mock.calls[0][0].data.fullName).toBeUndefined();
  });

  it('rodar 2x a mesma linha é idempotente (mesmo responseId → skipped/duplicate)', async () => {
    const { payload } = rowToPayload(record());
    prisma.legendary.findUnique.mockResolvedValueOnce({
      id: 'leg-1',
      fullName: 'João da Silva',
      formsResponseId: payload.responseId,
      lastFormsSyncAt: new Date('2026-07-14T13:45:22-03:00'),
      needsReview: false,
      notes: null,
    });

    const res = await service.ingest(payload);
    expect(res).toEqual({ result: 'skipped', reason: 'duplicate', legendaryId: 'leg-1' });
    expect(prisma.legendary.update).not.toHaveBeenCalled();
  });

  it('colisão com o Forms ao vivo (responseId real já aplicado, mesmo instante) → skipped/stale, sem duplicar', async () => {
    const { payload } = rowToPayload(record());
    prisma.legendary.findUnique.mockResolvedValueOnce({
      id: 'leg-1',
      fullName: 'João da Silva',
      formsResponseId: 'FORMS_REAL_ID', // veio pelo webhook, não pelo backfill
      lastFormsSyncAt: new Date('2026-07-14T13:45:22-03:00'), // mesmo carimbo
      needsReview: false,
      notes: null,
    });

    const res = await service.ingest(payload);
    expect(res).toEqual({ result: 'skipped', reason: 'stale', legendaryId: 'leg-1' });
    expect(prisma.legendary.create).not.toHaveBeenCalled();
    expect(prisma.legendary.update).not.toHaveBeenCalled();
  });

  it('em dry-run usa a transação injetada (db) e NÃO abre a própria $transaction', async () => {
    const tx = {
      legendary: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args: any) => Promise.resolve({ id: 'leg-new', ...args.data })),
        update: jest.fn(),
      },
      teamMembership: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
      legendaryHistory: { create: jest.fn() },
    };

    const { payload } = rowToPayload(record());
    const res = await service.ingest(payload, tx as any);

    expect(res.result).toBe('created');
    expect(tx.legendary.create).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.legendary.create).not.toHaveBeenCalled();
    // auditoria/histórico escrevem na transação injetada
    expect(tx.legendaryHistory.create).toHaveBeenCalledTimes(1);
    expect(audit.create).toHaveBeenCalledWith(expect.anything(), tx);
  });
});
