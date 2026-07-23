import { MapService } from './map.service';

// Contrato de escopo da tela Mapa (change access-scope-semantics-hardening): as consultas
// de legendário carregam o filtro geográfico (buildLegendaryWhere), fail-closed para não-admin.
describe('MapService (escopo)', () => {
  let prisma: any;
  let accessPolicy: any;
  let service: MapService;
  const user = { sub: 'u1' } as any;

  beforeEach(() => {
    prisma = {
      legendary: {
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      church: { findMany: jest.fn().mockResolvedValue([]) },
    };
    accessPolicy = { resolveScope: jest.fn(), buildLegendaryWhere: jest.fn().mockReturnValue({ __leg: true }) };
    service = new MapService(prisma, accessPolicy);
  });

  it('não-admin: aplica o escopo geográfico (fail-closed) nas consultas de legendário', async () => {
    accessPolicy.resolveScope.mockResolvedValue({ isAdmin: false });

    await service.rotaDoCerrado(user);

    expect(JSON.stringify(prisma.legendary.groupBy.mock.calls[0][0].where)).toContain('__leg');
    expect(JSON.stringify(prisma.legendary.count.mock.calls[0][0].where)).toContain('__leg');
  });

  it('admin: sem filtro de escopo', async () => {
    accessPolicy.resolveScope.mockResolvedValue({ isAdmin: true });

    await service.rotaDoCerrado(user);

    expect(prisma.legendary.groupBy.mock.calls[0][0].where.AND).toBeUndefined();
  });
});
