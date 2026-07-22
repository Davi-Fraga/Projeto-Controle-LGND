import { ReportsService } from './reports.service';

const adminUser = { sub: 'admin-id', email: 'a@x.com', roles: ['COORDINATION_ADMIN'], permissions: [] } as any;
const restrictedUser = { sub: 'user-id', email: 'u@x.com', roles: ['SPIRITUAL_LEADER'], permissions: [] } as any;

describe('ReportsService (scope / PII)', () => {
  let service: ReportsService;
  let prisma: any;
  let audit: any;
  let accessPolicy: any;

  beforeEach(() => {
    prisma = {
      topParticipant: { findMany: jest.fn().mockResolvedValue([]) },
      legendary: { findMany: jest.fn().mockResolvedValue([]) },
      topEvent: { findMany: jest.fn().mockResolvedValue([]) },
      topFamily: { findMany: jest.fn().mockResolvedValue([]) },
      topFamilyMember: { findMany: jest.fn().mockResolvedValue([]) },
    };
    audit = { create: jest.fn() };
    accessPolicy = { resolveScope: jest.fn(), buildLegendaryWhere: jest.fn() };
    service = new ReportsService(prisma, audit, accessPolicy);
  });

  it('topParticipants: admin has no legendary scope filter', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: true });

    await service.topParticipants('top-1', adminUser);

    const where = prisma.topParticipant.findMany.mock.calls[0][0].where;
    expect(where.legendary).toBeUndefined();
    expect(accessPolicy.buildLegendaryWhere).not.toHaveBeenCalled();
  });

  it('topParticipants: restricted user filters PII by legendary scope', async () => {
    const filter = { OR: [{ churchId: { in: ['c1'] } }] };
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: false });
    accessPolicy.buildLegendaryWhere.mockReturnValueOnce(filter);

    await service.topParticipants('top-1', restrictedUser);

    const where = prisma.topParticipant.findMany.mock.calls[0][0].where;
    expect(where.legendary).toEqual(filter);
  });

  it('pendingReview: restricted user scopes the legendarios subquery', async () => {
    const filter = { OR: [{ churchId: { in: ['c1'] } }] };
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: false });
    accessPolicy.buildLegendaryWhere.mockReturnValueOnce(filter);

    await service.pendingReview(restrictedUser);

    const where = prisma.legendary.findMany.mock.calls[0][0].where;
    expect(where.AND).toContainEqual(filter);
  });

  it('pendingReview: admin has no scope on the legendarios subquery', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: true });

    await service.pendingReview(adminUser);

    const where = prisma.legendary.findMany.mock.calls[0][0].where;
    expect(where.AND).toBeUndefined();
  });

  it('pendingReview: observação do membro de família usa somente notes (sem sourceNotes)', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: true });
    prisma.topFamilyMember.findMany.mockResolvedValueOnce([
      { id: 'm1', notes: 'nota geral', sourceNotes: 'texto de origem', topFamily: { name: 'Fam' }, topParticipant: { legendary: { fullName: 'João' } } },
    ]);

    const rows = await service.pendingReview(adminUser);
    const member = rows.find((r: any) => r.tipo === 'Membro de família');

    expect(member?.observacao).toBe('nota geral');
  });
});
