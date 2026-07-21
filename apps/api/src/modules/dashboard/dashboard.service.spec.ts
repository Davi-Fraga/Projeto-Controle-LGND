import { DashboardService } from './dashboard.service';

// Escopo do dashboard (change user-access-control, task 10.3): não-admin não pode
// ver agregados globais — as contagens devem carregar o filtro de escopo.
describe('DashboardService (escopo)', () => {
  let prisma: any;
  let accessPolicy: any;
  let service: DashboardService;

  beforeEach(() => {
    prisma = {
      legendary: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      team: { count: jest.fn().mockResolvedValue(0) },
      topEvent: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      topFamily: { count: jest.fn().mockResolvedValue(0) },
      church: { count: jest.fn().mockResolvedValue(0) },
      expertise: { count: jest.fn().mockResolvedValue(0) },
      socialAction: { count: jest.fn().mockResolvedValue(0) },
      topParticipant: { count: jest.fn().mockResolvedValue(0) },
      topServant: { count: jest.fn().mockResolvedValue(0) },
      topTeam: { count: jest.fn().mockResolvedValue(0) },
      topPreRegistration: { count: jest.fn().mockResolvedValue(0) },
    };
    accessPolicy = {
      resolveScope: jest.fn(),
      buildLegendaryWhere: jest.fn().mockReturnValue({ __leg: true }),
      buildTeamWhere: jest.fn().mockReturnValue({ __team: true }),
      buildTopWhere: jest.fn().mockReturnValue({ __top: true }),
      buildChurchWhere: jest.fn().mockReturnValue({ __church: true }),
      buildCityWhere: jest.fn().mockReturnValue({ __city: true }),
    };
    service = new DashboardService(prisma, accessPolicy);
  });

  const user = { sub: 'u1' } as any;

  it('admin: contagens globais, sem filtro de escopo', async () => {
    accessPolicy.resolveScope.mockResolvedValue({ isAdmin: true });
    await service.summary(user);

    const legWhere = prisma.legendary.count.mock.calls[0][0].where;
    expect(legWhere.AND).toBeUndefined();
    expect(JSON.stringify(prisma.team.count.mock.calls[0][0].where)).not.toContain('__team');
  });

  it('não-admin: aplica escopo nas contagens de legendários/equipe/TOP/igreja/cidade', async () => {
    accessPolicy.resolveScope.mockResolvedValue({ isAdmin: false });
    await service.summary(user);

    expect(JSON.stringify(prisma.legendary.count.mock.calls[0][0].where)).toContain('__leg');
    expect(JSON.stringify(prisma.team.count.mock.calls[0][0].where)).toContain('__team');
    expect(JSON.stringify(prisma.topEvent.count.mock.calls[0][0].where)).toContain('__top');
    expect(JSON.stringify(prisma.church.count.mock.calls[0][0].where)).toContain('__church');
    expect(JSON.stringify(prisma.socialAction.count.mock.calls[0][0].where)).toContain('__city');
    // cidades distintas também escopadas
    expect(JSON.stringify(prisma.legendary.findMany.mock.calls[0][0].where)).toContain('__leg');
  });

  it('não-admin: o TOP em destaque é filtrado pelo escopo de TOP', async () => {
    accessPolicy.resolveScope.mockResolvedValue({ isAdmin: false });
    await service.summary(user);
    // findFirst do topEvent (destaque/próximo) carrega o filtro de escopo de TOP
    expect(JSON.stringify(prisma.topEvent.findFirst.mock.calls[0][0].where)).toContain('__top');
  });
});
