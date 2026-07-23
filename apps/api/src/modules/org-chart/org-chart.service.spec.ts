import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrgChartService } from './org-chart.service';

describe('OrgChartService', () => {
  let service: OrgChartService;
  let prisma: any;
  let accessPolicy: any;
  const user = { sub: 'u1', email: 'a@b.c', roles: ['COORDINATION_ADMIN'], permissions: [] } as any;

  beforeEach(() => {
    prisma = {
      team: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      legendary: { findMany: jest.fn().mockResolvedValue([]) },
    };
    // Admin/irrestrito por padrão: sem filtro de cidade e sem barreira de IDOR.
    accessPolicy = {
      resolveScope: jest.fn().mockResolvedValue({ isAdmin: true, churchIds: [], teamIds: [], legendaryIds: [], cityKeys: [], legendaryCities: [], topIds: [] }),
      buildLegendaryWhere: jest.fn().mockReturnValue({}),
      buildTeamWhere: jest.fn().mockReturnValue({ id: { in: [] } }),
      isCityRestricted: jest.fn().mockReturnValue(false),
      assertCityAllowed: jest.fn(),
      assertTeamAllowed: jest.fn(),
    };
    service = new OrgChartService(prisma, accessPolicy);
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

      const root = await service.getTeamChart('t1', user);

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
      const root = await service.getTeamChart('t2', user);
      expect(root.leaderId).toBeUndefined();
      expect(root.children.find((n) => n.id === 'member:m9')).toBeDefined(); // directly under the group
      expect(root.count).toBe(1);
    });

    it('aninha integrantes sob o sub-coordenador (managerMembershipId) — hierarquia derivada', async () => {
      prisma.team.findFirst.mockResolvedValueOnce({
        id: 't3',
        name: 'ADM',
        coordinatorLegendaryId: 'c1',
        coordinator: { fullName: 'Coordenador' },
        deputyCoordinatorLegendaryId: null,
        deputyCoordinator: null,
        memberships: [
          { id: 'sub', legendaryId: 'l1', legendary: { fullName: 'Sub' }, role: 'Sub-coordenador', managerMembershipId: null },
          { id: 'int', legendaryId: 'l2', legendary: { fullName: 'Integrante' }, role: 'Integrante', managerMembershipId: 'sub' },
        ],
      });

      const root = await service.getTeamChart('t3', user);
      const coord = root.children.find((n) => n.id === 'leader:t3')!;
      const sub = coord.children.find((n) => n.id === 'member:sub')!;
      expect(sub.kind).toBe('leader'); // gerencia alguém → vira nó de liderança
      expect(sub.children.find((n) => n.id === 'member:int')).toBeDefined();
      expect(coord.children.find((n) => n.id === 'member:int')).toBeUndefined(); // não fica direto no coordenador
    });

    it('strips the "TOP #<n> | " prefix from the team name label', async () => {
      prisma.team.findFirst.mockResolvedValueOnce({ id: 't9', name: 'TOP #1910 | Coordenação', coordinatorLegendaryId: null, coordinator: null, deputyCoordinatorLegendaryId: null, deputyCoordinator: null, memberships: [] });
      const root = await service.getTeamChart('t9', user);
      expect(root.label).toBe('Coordenação');
    });

    it('throws 404 when the team does not exist', async () => {
      prisma.team.findFirst.mockResolvedValueOnce(null);
      await expect(service.getTeamChart('nope', user)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('denies a team out of scope (IDOR) for a team-restricted user', async () => {
      accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: false, teamIds: ['team-seg'] });
      accessPolicy.assertTeamAllowed.mockImplementationOnce(() => { throw new ForbiddenException('Team out of scope.'); });
      await expect(service.getTeamChart('team-x', user)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('refId nos nós de pessoa/líder (Fase 2 painel)', () => {
    it('team: membro carrega refId=legendaryId e coordenador refId=coordinatorLegendaryId', async () => {
      prisma.team.findFirst.mockResolvedValueOnce({
        id: 't1', name: 'ADM', coordinatorLegendaryId: 'c1', coordinator: { fullName: 'Coord' },
        deputyCoordinatorLegendaryId: null, deputyCoordinator: null,
        memberships: [{ id: 'm1', legendaryId: 'l1', legendary: { fullName: 'Membro 1' }, role: 'Servo' }],
      });
      const root = await service.getTeamChart('t1', user);
      const coord = root.children.find((n) => n.id === 'leader:t1')!;
      expect(coord.refId).toBe('c1');
      expect(coord.children.find((n) => n.id === 'member:m1')!.refId).toBe('l1');
    });

    it('city: líder e gerido carregam refId=legendaryId', async () => {
      prisma.legendary.findMany.mockResolvedValueOnce([
        { id: 'lead', fullName: 'Líder', city: 'Goiânia', cityLeaderId: null },
        { id: 'led', fullName: 'Gerido', city: 'Goiânia', cityLeaderId: 'lead' },
      ]);
      const root = await service.getCitiesChart('legendaries', 'goiania', user);
      const leaderNode = root.children.find((n) => n.id === 'leader:legendary:lead')!;
      expect(leaderNode.refId).toBe('lead');
      expect(leaderNode.children.find((n) => n.id === 'legendary:led')!.refId).toBe('led');
    });
  });

  describe('getCoordinatorsChart', () => {
    it('puts the director on top, one coordinator per team, and omits teams without coordinator', async () => {
      prisma.team.findMany.mockResolvedValueOnce([
        { id: 't0', name: 'Coordenação', coordinatorLegendaryId: 'c0', coordinator: { fullName: 'Diretor' } },
        { id: 't1', name: 'ADM', coordinatorLegendaryId: 'c1', coordinator: { fullName: 'Coord ADM' } },
        { id: 't2', name: 'Voz', coordinatorLegendaryId: null, coordinator: null },
      ]);

      const root = await service.getCoordinatorsChart(user);

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
      const root = await service.getCoordinatorsChart(user);
      expect(root.label).toBe('Coordenação');
      expect(root.leaderId).toBeUndefined();
      expect(root.children).toHaveLength(1);
    });

    it('escopa por equipe: não-admin sem escopo de equipe recebe estrutura vazia (fail-closed)', async () => {
      accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: false, teamIds: [] });
      accessPolicy.buildTeamWhere.mockReturnValueOnce({ id: { in: [] } });
      prisma.team.findMany.mockResolvedValueOnce([]); // filtro fail-closed → nenhuma equipe

      const root = await service.getCoordinatorsChart(user);

      expect(prisma.team.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: { in: [] }, deletedAt: null }) }),
      );
      expect(root.children).toHaveLength(0);
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
      const options = await service.getCityOptions(user);
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

      const root = await service.getCitiesChart('legendaries', 'goiania', user);

      expect(root.id).toBe('city:goiania');
      expect(root.kind).toBe('city');
      expect(root.count).toBe(2); // both Goiânia spellings, Brasília excluded
    });

    it('mode=legendaries deriva cidade -> Líder -> geridos + nó "Sem gestor"', async () => {
      prisma.legendary.findMany.mockResolvedValueOnce([
        { id: 'lead', fullName: 'Líder', city: 'Goiânia', cityLeaderId: null },
        { id: 'led', fullName: 'Gerido', city: 'Goiânia', cityLeaderId: 'lead' },
        { id: 'solo', fullName: 'Sem gestor', city: 'Goiânia', cityLeaderId: null },
      ]);

      const root = await service.getCitiesChart('legendaries', 'goiania', user);

      const leaderNode = root.children.find((n) => n.id === 'leader:legendary:lead')!;
      expect(leaderNode.kind).toBe('leader');
      expect(leaderNode.subtitle).toBe('Líder');
      expect(leaderNode.children.find((n) => n.id === 'legendary:led')).toBeDefined();
      const semGestor = root.children.find((n) => n.label === 'Sem gestor')!;
      expect(semGestor.children.find((n) => n.id === 'legendary:solo')).toBeDefined();
      expect(semGestor.children.find((n) => n.id === 'legendary:lead')).toBeUndefined(); // Líder não entra em "Sem gestor"
    });

    it('denies an out-of-scope city for a city-restricted user (IDOR)', async () => {
      // Simula a barreira do AccessPolicyService para cidade fora do escopo.
      accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: false, churchIds: [], teamIds: [], legendaryIds: [], cityKeys: ['piracanjuba'], legendaryCities: ['Piracanjuba'] });
      accessPolicy.assertCityAllowed.mockImplementationOnce(() => { throw new ForbiddenException('City out of scope.'); });

      await expect(service.getCitiesChart('legendaries', 'goiania', user)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('city="__none__" returns the "Sem cidade" group', async () => {
      prisma.legendary.findMany.mockResolvedValueOnce([
        { id: 'l1', fullName: 'A', city: 'Goiânia' },
        { id: 'l3', fullName: 'C', city: null },
      ]);
      const root = await service.getCitiesChart('legendaries', '__none__', user);
      expect(root.id).toBe('city:none');
      expect(root.count).toBe(1);
    });

    it('mode=churches nests the selected city -> church -> legendary with "Sem igreja"', async () => {
      prisma.legendary.findMany.mockResolvedValueOnce([
        { id: 'l1', fullName: 'A', city: 'Goiânia', churchId: 'ch1', church: { name: 'Igreja X' } },
        { id: 'l2', fullName: 'B', city: 'Goiânia', churchId: null, church: null },
        { id: 'l3', fullName: 'C', city: 'Brasília', churchId: 'ch9', church: { name: 'Outra' } },
      ]);

      const root = await service.getCitiesChart('churches', 'goiania', user);

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
    assertShape(await service.getTeamChart('t1', user));
    assertShape(await service.getCoordinatorsChart(user));
    assertShape(await service.getCitiesChart('legendaries', 'goiania', user));
    assertShape(await service.getCitiesChart('churches', 'goiania', user));
  });
});
