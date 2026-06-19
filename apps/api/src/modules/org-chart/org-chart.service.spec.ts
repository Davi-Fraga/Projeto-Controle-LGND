import { NotFoundException } from '@nestjs/common';
import { OrgChartService } from './org-chart.service';

describe('OrgChartService', () => {
  let service: OrgChartService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      team: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      legendary: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new OrgChartService(prisma);
  });

  describe('getTeamChart', () => {
    it('builds group(team) -> coordinator(leader, holds members) + deputy(sibling leader)', async () => {
      prisma.team.findFirst.mockResolvedValueOnce({
        id: 't1',
        name: 'ADM',
        coordinatorLegendaryId: 'c1',
        coordinator: { fullName: 'Coordenador' },
        deputyCoordinatorLegendaryId: 'd1',
        deputyCoordinator: { fullName: 'Sub' },
        memberships: [
          { id: 'm1', legendaryId: 'l1', legendary: { fullName: 'Membro 1' }, role: 'Servo' },
          { id: 'm2', legendaryId: 'c1', legendary: { fullName: 'Coordenador' }, role: 'Coord' },
        ],
      });

      const root = await service.getTeamChart('t1');

      expect(root.id).toBe('team:t1');
      expect(root.kind).toBe('group');
      expect(root.leaderId).toBe('c1');

      const coord = root.children.find((n) => n.id === 'leader:t1')!;
      expect(coord.kind).toBe('leader');
      expect(coord.subtitle).toBe('Coordenador');
      expect(coord.children.find((n) => n.id === 'member:m1')).toBeDefined();
      expect(coord.children.find((n) => n.id === 'member:m2')).toBeUndefined(); // coordinator excluded from members
      expect(coord.count).toBe(1); // only membro 1

      const deputy = root.children.find((n) => n.id === 'deputy:t1')!;
      expect(deputy.kind).toBe('leader');
      expect(deputy.subtitle).toBe('Vice-coordenador');
      expect(deputy.children).toHaveLength(0); // deputy holds no members

      expect(root.count).toBe(1); // single person (membro 1); leaders are not persons
    });

    it('renders team without coordinator with members directly under the group and no leaderId', async () => {
      prisma.team.findFirst.mockResolvedValueOnce({
        id: 't2',
        name: 'Voz',
        coordinatorLegendaryId: null,
        coordinator: null,
        deputyCoordinatorLegendaryId: null,
        deputyCoordinator: null,
        memberships: [{ id: 'm9', legendaryId: 'l9', legendary: { fullName: 'Membro 9' }, role: 'Servo' }],
      });
      const root = await service.getTeamChart('t2');
      expect(root.leaderId).toBeUndefined();
      expect(root.children.find((n) => n.id === 'member:m9')).toBeDefined(); // directly under the group
      expect(root.count).toBe(1);
    });

    it('strips the "TOP #<n> | " prefix from the team name label', async () => {
      prisma.team.findFirst.mockResolvedValueOnce({ id: 't9', name: 'TOP #1910 | Coordenação', coordinatorLegendaryId: null, coordinator: null, deputyCoordinatorLegendaryId: null, deputyCoordinator: null, memberships: [] });
      const root = await service.getTeamChart('t9');
      expect(root.label).toBe('Coordenação');
    });

    it('throws 404 when the team does not exist', async () => {
      prisma.team.findFirst.mockResolvedValueOnce(null);
      await expect(service.getTeamChart('nope')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getCoordinatorsChart', () => {
    it('puts the director on top, one coordinator per team, and omits teams without coordinator', async () => {
      prisma.team.findMany.mockResolvedValueOnce([
        { id: 't0', name: 'Coordenação', coordinatorLegendaryId: 'c0', coordinator: { fullName: 'Diretor' } },
        { id: 't1', name: 'ADM', coordinatorLegendaryId: 'c1', coordinator: { fullName: 'Coord ADM' } },
        { id: 't2', name: 'Voz', coordinatorLegendaryId: null, coordinator: null },
      ]);

      const root = await service.getCoordinatorsChart();

      expect(root.id).toBe('director');
      expect(root.label).toBe('Coordenação'); // top node uses the DB team name, not a synthesized label
      expect(root.leaderId).toBe('c0'); // director from "Coordenação" team
      expect(root.children.find((n) => n.id === 'coordinator:t0')).toBeUndefined(); // coordination team is the root, not a child
      expect(root.children.find((n) => n.id === 'coordinator:t1')).toBeDefined();
      expect(root.children.find((n) => n.id === 'coordinator:t2')).toBeUndefined(); // no coordinator -> omitted
      expect(root.children.find((n) => n.id === 'coordinator:t1')!.subtitle).toBe('ADM');
    });

    it('uses a neutral root when no coordination team exists', async () => {
      prisma.team.findMany.mockResolvedValueOnce([{ id: 't1', name: 'ADM', coordinatorLegendaryId: 'c1', coordinator: { fullName: 'Coord ADM' } }]);
      const root = await service.getCoordinatorsChart();
      expect(root.label).toBe('Coordenação');
      expect(root.leaderId).toBeUndefined();
      expect(root.children).toHaveLength(1);
    });
  });

  describe('getCityOptions', () => {
    it('lists distinct normalized cities (merging spellings) plus "Sem cidade"', async () => {
      prisma.legendary.findMany.mockResolvedValueOnce([
        { city: 'Goiânia' },
        { city: 'goiania ' },
        { city: 'Brasília' },
        { city: null },
      ]);
      const options = await service.getCityOptions();
      const goiania = options.find((o) => o.value === 'goiania')!;
      expect(goiania.count).toBe(2);
      expect(options.find((o) => o.value === '__none__')).toMatchObject({ label: 'Sem cidade', count: 1 });
      expect(options.find((o) => o.value === 'brasilia')).toBeDefined();
    });
  });

  describe('getCitiesChart (one city at a time)', () => {
    it('mode=legendaries returns a single city node grouping equivalent spellings', async () => {
      prisma.legendary.findMany.mockResolvedValueOnce([
        { id: 'l1', fullName: 'A', city: 'Goiânia' },
        { id: 'l2', fullName: 'B', city: 'goiania ' },
        { id: 'l3', fullName: 'C', city: 'Brasília' },
      ]);

      const root = await service.getCitiesChart('legendaries', 'goiania');

      expect(root.id).toBe('city:goiania');
      expect(root.kind).toBe('city');
      expect(root.count).toBe(2); // both Goiânia spellings, Brasília excluded
    });

    it('city="__none__" returns the "Sem cidade" group', async () => {
      prisma.legendary.findMany.mockResolvedValueOnce([
        { id: 'l1', fullName: 'A', city: 'Goiânia' },
        { id: 'l3', fullName: 'C', city: null },
      ]);
      const root = await service.getCitiesChart('legendaries', '__none__');
      expect(root.id).toBe('city:none');
      expect(root.count).toBe(1);
    });

    it('mode=churches nests the selected city -> church -> legendary with "Sem igreja"', async () => {
      prisma.legendary.findMany.mockResolvedValueOnce([
        { id: 'l1', fullName: 'A', city: 'Goiânia', churchId: 'ch1', church: { name: 'Igreja X' } },
        { id: 'l2', fullName: 'B', city: 'Goiânia', churchId: null, church: null },
        { id: 'l3', fullName: 'C', city: 'Brasília', churchId: 'ch9', church: { name: 'Outra' } },
      ]);

      const root = await service.getCitiesChart('churches', 'goiania');

      expect(root.id).toBe('city:goiania');
      expect(root.count).toBe(2);
      expect(root.children.find((n) => n.id === 'church:ch1')!.count).toBe(1);
      expect(root.children.find((n) => n.id.startsWith('church:none'))!.label).toBe('Sem igreja');
    });
  });

  it('returns the same OrgChartNode shape across the global views (contract)', async () => {
    prisma.team.findFirst.mockResolvedValue({ id: 't1', name: 'ADM', coordinatorLegendaryId: 'c1', coordinator: { fullName: 'C' }, deputyCoordinatorLegendaryId: null, deputyCoordinator: null, memberships: [] });
    const assertShape = (node: any) => {
      expect(typeof node.id).toBe('string');
      expect(['root', 'group', 'leader', 'person', 'city']).toContain(node.kind);
      expect(typeof node.label).toBe('string');
      expect(typeof node.count).toBe('number');
      expect(Array.isArray(node.children)).toBe(true);
      node.children.forEach(assertShape);
    };
    prisma.legendary.findMany.mockResolvedValue([{ id: 'l1', fullName: 'A', city: 'Goiânia', churchId: 'ch1', church: { name: 'Igreja X' } }]);
    assertShape(await service.getTeamChart('t1'));
    assertShape(await service.getCoordinatorsChart());
    assertShape(await service.getCitiesChart('legendaries', 'goiania'));
    assertShape(await service.getCitiesChart('churches', 'goiania'));
  });
});
