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

  // change painel-escopo-legivel-e-higiene: o escopo vale também para AGREGADOS. A contagem
  // por igreja ficou de fora do recorte e entregava o total REAL da igreja a quem é escopado.
  describe('contagem por igreja respeita o escopo', () => {
    beforeEach(() => {
      // Faz a consulta de igrejas acontecer: há legendário com churchId no recorte.
      prisma.legendary.findMany.mockResolvedValue([{ churchId: 'church-1' }]);
      prisma.church.findMany.mockResolvedValue([
        { id: 'church-1', name: 'Igreja Central', city: 'Goiânia', latitude: null, longitude: null, _count: { legendarios: 3 } },
      ]);
    });

    const countWhere = () =>
      prisma.church.findMany.mock.calls[0][0].select._count.select.legendarios.where;

    it('não-admin: a contagem carrega o mesmo filtro geográfico da listagem', async () => {
      accessPolicy.resolveScope.mockResolvedValue({ isAdmin: false });

      await service.rotaDoCerrado(user);

      expect(JSON.stringify(countWhere())).toContain('__leg');
    });

    it('admin: a contagem segue sem filtro de escopo', async () => {
      accessPolicy.resolveScope.mockResolvedValue({ isAdmin: true });

      await service.rotaDoCerrado(user);

      expect(JSON.stringify(countWhere())).not.toContain('__leg');
    });
  });
});
