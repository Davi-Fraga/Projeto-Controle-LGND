import { LegendaryFormsSyncService } from './legendary-forms-sync.service';
import { FormsSyncWebhookDto } from './dto/forms-sync-webhook.dto';

/**
 * Resolução de igreja por nome canônico OU alias (change church-name-aliases).
 * Prisma mockado no mesmo estilo do service.spec. `normalizeName` do canônico
 * "Primeira Igreja Batista (PIB) — Caldas Novas" != "primeira batista", então a
 * variante só casa via alias.
 */
function payload(over: Partial<FormsSyncWebhookDto> = {}): FormsSyncWebhookDto {
  return {
    responseId: 'r-1',
    responseTimestamp: '2026-07-16T12:00:00.000Z',
    fullName: 'João da Silva',
    lgndNumber: '12345',
    churchName: 'Primeira Batista',
    ...over,
  };
}

function makePrisma(aliasRow: any) {
  const prisma: any = {
    $transaction: jest.fn((cb: any) => cb(prisma)),
    legendary: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((args: any) => Promise.resolve({ id: 'leg-new', ...args.data })),
      update: jest.fn().mockImplementation((args: any) => Promise.resolve({ id: args.where.id, ...args.data })),
    },
    team: { findMany: jest.fn().mockResolvedValue([]) },
    church: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'ch-pib', name: 'Primeira Igreja Batista (PIB) — Caldas Novas' },
      ]),
    },
    churchAlias: { findUnique: jest.fn().mockResolvedValue(aliasRow) },
    profession: { findMany: jest.fn().mockResolvedValue([]) },
    teamMembership: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
    legendaryHistory: { create: jest.fn() },
  };
  return prisma;
}

describe('LegendaryFormsSyncService — resolução de igreja por alias', () => {
  it('casa a variante por ALIAS e vincula ao churchId canônico', async () => {
    const prisma = makePrisma({ churchId: 'ch-pib', church: { deletedAt: null } });
    const service = new LegendaryFormsSyncService(prisma, { create: jest.fn() } as any);

    await service.ingest(payload());

    const data = prisma.legendary.create.mock.calls[0][0].data;
    expect(data.churchId).toBe('ch-pib');
    // consultou o alias pela forma normalizada da variante
    expect(prisma.churchAlias.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { normalizedAlias: 'primeira batista' } }),
    );
  });

  it('alias inexistente → churchId nulo e needsReview (comportamento atual)', async () => {
    const prisma = makePrisma(null);
    const service = new LegendaryFormsSyncService(prisma, { create: jest.fn() } as any);

    const res = await service.ingest(payload({ churchName: 'Igreja Desconhecida' }));

    const data = prisma.legendary.create.mock.calls[0][0].data;
    expect(data.churchId).toBeNull();
    expect(res.needsReview).toBe(true);
    expect(res.issues).toEqual(expect.arrayContaining([expect.stringContaining('Igreja não encontrada')]));
  });

  it('precedência: nome canônico casa sem consultar alias', async () => {
    const prisma = makePrisma(null);
    const service = new LegendaryFormsSyncService(prisma, { create: jest.fn() } as any);

    await service.ingest(payload({ churchName: 'Primeira Igreja Batista (PIB) — Caldas Novas' }));

    const data = prisma.legendary.create.mock.calls[0][0].data;
    expect(data.churchId).toBe('ch-pib');
    expect(prisma.churchAlias.findUnique).not.toHaveBeenCalled();
  });

  it('alias de igreja soft-deleted NÃO resolve', async () => {
    const prisma = makePrisma({ churchId: 'ch-pib', church: { deletedAt: new Date('2026-01-01') } });
    const service = new LegendaryFormsSyncService(prisma, { create: jest.fn() } as any);

    const res = await service.ingest(payload());

    const data = prisma.legendary.create.mock.calls[0][0].data;
    expect(data.churchId).toBeNull();
    expect(res.needsReview).toBe(true);
  });
});

/** Payload completo (sem outras issues) para isolar o efeito da igreja no needsReview. */
function fullPayload(over: Partial<FormsSyncWebhookDto> = {}): FormsSyncWebhookDto {
  return {
    responseId: 'r-1',
    responseTimestamp: '2026-07-16T12:00:00.000Z',
    fullName: 'João da Silva',
    lgndNumber: '12345',
    churchName: 'Primeira Batista',
    phone: '(64) 99988-7766',
    email: 'joao@x.com',
    emailConfirmation: 'joao@x.com',
    district: 'Centro',
    city: 'Caldas Novas',
    state: 'GO',
    profession: 'Pedreiro',
    relativeName: 'Maria',
    isSpiritualLeader: false,
    ...over,
  };
}

describe('LegendaryFormsSyncService — reconcileReferences (retroativo)', () => {
  function makeReconcilePrisma(existing: any, aliasRow: any) {
    const prisma: any = {
      $transaction: jest.fn((cb: any) => cb(prisma)),
      legendary: {
        findUnique: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockImplementation((args: any) => Promise.resolve({ id: args.where.id, ...args.data })),
      },
      team: { findMany: jest.fn().mockResolvedValue([]) },
      church: { findMany: jest.fn().mockResolvedValue([{ id: 'ch-pib', name: 'Primeira Igreja Batista (PIB) — Caldas Novas' }]) },
      churchAlias: { findUnique: jest.fn().mockResolvedValue(aliasRow) },
      profession: { findMany: jest.fn().mockResolvedValue([{ id: 'pr-ped', name: 'Pedreiro' }]) },
      teamMembership: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
    };
    return prisma;
  }

  it('vincula churchId por alias e limpa needsReview quando não há outras issues', async () => {
    const prisma = makeReconcilePrisma(
      { id: 'leg-1', churchId: null, professionId: null, needsReview: true },
      { churchId: 'ch-pib', church: { deletedAt: null } },
    );
    const service = new LegendaryFormsSyncService(prisma, { create: jest.fn() } as any);

    const res = await service.reconcileReferences(fullPayload());

    expect(res.result).toBe('reconciled');
    const data = prisma.legendary.update.mock.calls[0][0].data;
    expect(data.churchId).toBe('ch-pib');
    expect(data.needsReview).toBe(false);
  });

  it('é idempotente: nada muda quando já está casado', async () => {
    const prisma = makeReconcilePrisma(
      { id: 'leg-1', churchId: 'ch-pib', professionId: 'pr-ped', needsReview: false },
      { churchId: 'ch-pib', church: { deletedAt: null } },
    );
    const service = new LegendaryFormsSyncService(prisma, { create: jest.fn() } as any);

    const res = await service.reconcileReferences(fullPayload());

    expect(res.result).toBe('unchanged');
    expect(prisma.legendary.update).not.toHaveBeenCalled();
  });

  it('no-op quando o legendário não existe', async () => {
    const prisma = makeReconcilePrisma(null, null);
    const service = new LegendaryFormsSyncService(prisma, { create: jest.fn() } as any);

    const res = await service.reconcileReferences(fullPayload({ lgndNumber: '99999' }));

    expect(res.result).toBe('not_found');
    expect(prisma.legendary.update).not.toHaveBeenCalled();
  });
});
