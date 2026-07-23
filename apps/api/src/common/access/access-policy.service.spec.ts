import { ForbiddenException } from '@nestjs/common';
import { AccessPolicyService } from './access-policy.service';

describe('AccessPolicyService', () => {
  let prisma: any;
  let service: AccessPolicyService;

  beforeEach(() => {
    prisma = {
      church: { findMany: jest.fn() },
      team: { findMany: jest.fn() },
      user: { findFirst: jest.fn() },
      userScope: { findMany: jest.fn().mockResolvedValue([]) },
      userScopePolicy: { findMany: jest.fn().mockResolvedValue([]) },
      legendary: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new AccessPolicyService(prisma);
  });

  it('resolves admin access as unrestricted', async () => {
    const scope = await service.resolveScope({
      sub: 'user-admin',
      email: 'admin@example.com',
      roles: ['COORDINATION_ADMIN'],
      permissions: [],
    });

    expect(scope).toEqual({
      isAdmin: true,
      churchIds: [],
      teamIds: [],
      legendaryIds: [],
      cityKeys: [],
      legendaryCities: [],
      topIds: [],
    });
    expect(prisma.church.findMany).not.toHaveBeenCalled();
    expect(prisma.team.findMany).not.toHaveBeenCalled();
    expect(prisma.userScope.findMany).not.toHaveBeenCalled();
  });

  it('resolves spiritual leader churches from the linked user', async () => {
    prisma.church.findMany.mockResolvedValueOnce([{ id: 'church-1' }, { id: 'church-2' }]);
    prisma.team.findMany.mockResolvedValueOnce([]);

    const scope = await service.resolveScope({
      sub: 'pastor-user',
      email: 'pastor@example.com',
      roles: ['SPIRITUAL_LEADER'],
      permissions: [],
    });

    expect(prisma.church.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null, spiritualLeaderUserId: 'pastor-user' },
      select: { id: true },
    });
    expect(scope.churchIds).toEqual(['church-1', 'church-2']);
    expect(scope.teamIds).toEqual([]);
  });

  it('resolves team leader teams using coordinator or deputy coordinator fields', async () => {
    prisma.church.findMany.mockResolvedValueOnce([]);
    prisma.team.findMany.mockResolvedValueOnce([{ id: 'team-1' }, { id: 'team-2' }]);

    const scope = await service.resolveScope({
      sub: 'team-user',
      email: 'team@example.com',
      legendaryId: 'legendary-1',
      roles: ['TEAM_COORDINATOR'],
      permissions: [],
    });

    expect(prisma.team.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        OR: [
          { coordinatorLegendaryId: 'legendary-1' },
          { deputyCoordinatorLegendaryId: 'legendary-1' },
        ],
      },
      select: { id: true },
    });
    expect(scope.teamIds).toEqual(['team-1', 'team-2']);
  });

  it('does not query team leadership when the team role has no legendary link', async () => {
    prisma.church.findMany.mockResolvedValueOnce([]);

    const scope = await service.resolveScope({
      sub: 'team-user',
      email: 'team@example.com',
      roles: ['TEAM_COORDINATOR'],
      permissions: [],
    });

    expect(prisma.team.findMany).not.toHaveBeenCalled();
    expect(scope.teamIds).toEqual([]);
  });

  it('does not expose the linked legendary when the team leader has no led teams', async () => {
    prisma.church.findMany.mockResolvedValueOnce([]);
    prisma.team.findMany.mockResolvedValueOnce([]);

    const scope = await service.resolveScope({
      sub: 'team-user',
      email: 'team@example.com',
      legendaryId: 'legendary-1',
      roles: ['TEAM_COORDINATOR'],
      permissions: [],
    });

    expect(service.buildLegendaryWhere(scope)).toEqual({ id: { in: [] } });
  });

  it('monta filtro GEOGRÁFICO de legendários (cidade ∪ igreja), sem equipe', () => {
    const where = service.buildLegendaryWhere({
      isAdmin: false,
      churchIds: ['church-1'],
      teamIds: ['team-1'], // escopo de equipe NÃO entra no filtro de legendários
      legendaryIds: [],
      cityKeys: ['caldas novas'],
      legendaryCities: ['Caldas Novas'],
      topIds: [],
    });

    expect(where).toEqual({
      OR: [
        { churchId: { in: ['church-1'] } },
        { city: { in: ['Caldas Novas'] } },
      ],
    });
  });

  describe('buildChurchScopeWhere', () => {
    const baseScope = {
      teamIds: [],
      legendaryIds: [],
      cityKeys: [],
      topIds: [],
    };

    it('mantém o administrador irrestrito', () => {
      expect(service.buildChurchScopeWhere({
        ...baseScope,
        isAdmin: true,
        churchIds: [],
        legendaryCities: [],
      })).toEqual({});
    });

    it('combina cidades e igrejas explícitas por OR', () => {
      expect(service.buildChurchScopeWhere({
        ...baseScope,
        isAdmin: false,
        churchIds: ['church-1'],
        legendaryCities: ['Goiânia', 'Anápolis'],
      })).toEqual({
        OR: [
          { city: { in: ['Goiânia', 'Anápolis'] } },
          { id: { in: ['church-1'] } },
        ],
      });
    });

    it('fecha o acesso quando não existe cidade nem igreja no escopo', () => {
      expect(service.buildChurchScopeWhere({
        ...baseScope,
        isAdmin: false,
        churchIds: [],
        legendaryCities: [],
      })).toEqual({ id: { in: [] } });
    });
  });

  it('legendário só com escopo de equipe não vê legendários (equipe vale em Equipes/Organograma)', () => {
    const where = service.buildLegendaryWhere({
      isAdmin: false,
      churchIds: [],
      teamIds: ['team-1'],
      legendaryIds: [],
      cityKeys: [],
      legendaryCities: [],
      topIds: [],
    });
    expect(where).toEqual({ id: { in: [] } });
  });

  it('allows detail through an active membership without widening the list', () => {
    const scope = {
      isAdmin: false,
      churchIds: [],
      teamIds: ['team-1'],
      legendaryIds: [],
      cityKeys: [],
      legendaryCities: [],
      topIds: [],
    };

    expect(service.buildLegendaryWhere(scope)).toEqual({ id: { in: [] } });
    expect(service.buildLegendaryDetailWhere(scope)).toEqual({
      OR: [
        { id: { in: [] } },
        {
          teamMemberships: {
            some: {
              teamId: { in: ['team-1'] },
              status: 'ACTIVE',
              deletedAt: null,
              team: { deletedAt: null },
            },
          },
        },
      ],
    });
  });

  it('keeps detail closed without geographic or team scope', () => {
    const scope = {
      isAdmin: false,
      churchIds: [],
      teamIds: [],
      legendaryIds: [],
      cityKeys: [],
      legendaryCities: [],
      topIds: [],
    };

    expect(service.buildLegendaryDetailWhere(scope)).toEqual({ id: { in: [] } });
  });

  it('builds an impossible membership filter for an out-of-scope team', () => {
    const scope = {
      isAdmin: false,
      churchIds: [],
      teamIds: ['team-1'],
      legendaryIds: [],
      cityKeys: [],
      legendaryCities: [],
      topIds: [],
    };

    expect(service.buildTeamMembershipWhere(scope, 'team-2')).toEqual({
      teamId: { in: [] },
    });
  });

  describe('city scope', () => {
    it('resolves multiple city scopes into concrete legendary cities', async () => {
      prisma.church.findMany.mockResolvedValueOnce([]);
      prisma.userScope.findMany.mockResolvedValueOnce([
        { type: 'CITY', value: 'piracanjuba' },
        { type: 'CITY', value: 'morrinhos' },
      ]);
      // Distinct cities in DB include a third one that must NOT leak.
      prisma.legendary.findMany.mockResolvedValueOnce([
        { city: 'Piracanjuba' },
        { city: 'Morrinhos' },
        { city: 'Goiânia' },
      ]);

      const scope = await service.resolveScope({
        sub: 'gestor-cidade',
        email: 'gestor@example.com',
        roles: ['MEMBER'],
        permissions: [],
      });

      expect(scope.cityKeys).toEqual(['piracanjuba', 'morrinhos']);
      expect(scope.legendaryCities).toEqual(['Piracanjuba', 'Morrinhos']);
      expect(service.buildLegendaryWhere(scope)).toEqual({
        OR: [{ city: { in: ['Piracanjuba', 'Morrinhos'] } }],
      });
    });

    it('allows a city in scope and denies one out of scope (IDOR)', () => {
      const scope = {
        isAdmin: false,
        churchIds: [],
        teamIds: [],
        legendaryIds: [],
        cityKeys: ['piracanjuba'],
        legendaryCities: ['Piracanjuba'],
        topIds: [],
      };

      expect(service.isCityRestricted(scope)).toBe(true);
      expect(() => service.assertCityAllowed(scope, 'piracanjuba')).not.toThrow();
      expect(() => service.assertCityAllowed(scope, 'goiania')).toThrow(ForbiddenException);
    });

    it('resolves multiple TOP scopes and builds a scoped TOP filter', async () => {
      prisma.church.findMany.mockResolvedValueOnce([]);
      prisma.userScope.findMany.mockResolvedValueOnce([
        { type: 'TOP', value: 'top-1' },
        { type: 'TOP', value: 'top-2' },
      ]);

      const scope = await service.resolveScope({
        sub: 'rep-top',
        email: 'rep@example.com',
        roles: ['MEMBER'],
        permissions: [],
      });

      expect(scope.topIds).toEqual(['top-1', 'top-2']);
      expect(service.buildTopWhere(scope)).toEqual({ id: { in: ['top-1', 'top-2'] } });
      expect(service.isTopRestricted(scope)).toBe(true);
      expect(() => service.assertTopAllowed(scope, 'top-1')).not.toThrow();
      expect(() => service.assertTopAllowed(scope, 'top-9')).toThrow(ForbiddenException);
    });

    it('denies a team out of scope (IDOR) and allows one in scope', async () => {
      prisma.church.findMany.mockResolvedValueOnce([]);
      prisma.userScope.findMany.mockResolvedValueOnce([{ type: 'TEAM', value: 'team-seg' }]);

      const scope = await service.resolveScope({
        sub: 'coord-seg',
        email: 'coord@example.com',
        roles: ['MEMBER'],
        permissions: [],
      });

      expect(scope.teamIds).toEqual(['team-seg']);
      expect(service.isTeamRestricted(scope)).toBe(true);
      expect(() => service.assertTeamAllowed(scope, 'team-seg')).not.toThrow();
      expect(() => service.assertTeamAllowed(scope, 'team-x')).toThrow(ForbiddenException);
    });

    it('does not restrict cities for an admin', () => {
      const scope = {
        isAdmin: true,
        churchIds: [],
        teamIds: [],
        legendaryIds: [],
        cityKeys: [],
        legendaryCities: [],
        topIds: [],
      };

      expect(service.isCityRestricted(scope)).toBe(false);
      expect(() => service.assertCityAllowed(scope, 'qualquer')).not.toThrow();
    });

    // Semântica única fail-closed (change access-scope-semantics-hardening): não-admin SEM
    // escopo daquele tipo é RESTRITO e o assert NEGA — antes era no-op (fail-open = IDOR).
    it('non-admin without a scope of the type is restricted and denied (fail-closed)', () => {
      const scope = {
        isAdmin: false,
        churchIds: [],
        teamIds: [],
        legendaryIds: [],
        cityKeys: [],
        legendaryCities: [],
        topIds: [],
      };

      expect(service.isCityRestricted(scope)).toBe(true);
      expect(service.isTeamRestricted(scope)).toBe(true);
      expect(service.isChurchRestricted(scope)).toBe(true);
      expect(service.isTopRestricted(scope)).toBe(true);

      expect(() => service.assertCityAllowed(scope, 'goiania')).toThrow(ForbiddenException);
      expect(() => service.assertTeamAllowed(scope, 'team-x')).toThrow(ForbiddenException);
      expect(() => service.assertChurchAllowed(scope, 'church-x')).toThrow(ForbiddenException);
      expect(() => service.assertTopAllowed(scope, 'top-x')).toThrow(ForbiddenException);
    });

    it('build*Where are fail-closed for a non-admin without scope (empty in-list)', () => {
      const scope = {
        isAdmin: false,
        churchIds: [],
        teamIds: [],
        legendaryIds: [],
        cityKeys: [],
        legendaryCities: [],
        topIds: [],
      };

      expect(service.buildChurchWhere(scope)).toEqual({ id: { in: [] } });
      expect(service.buildTeamWhere(scope)).toEqual({ id: { in: [] } });
      expect(service.buildTopWhere(scope)).toEqual({ id: { in: [] } });
      expect(service.buildCityWhere(scope)).toEqual({ id: { in: [] } });
    });
  });
});

// change access-scope-bulk-selection: modo ALL por dimensão.
describe('AccessPolicyService — tri-estado ALL', () => {
  let prisma: any;
  let service: AccessPolicyService;

  beforeEach(() => {
    prisma = {
      church: { findMany: jest.fn().mockResolvedValue([]) },
      team: { findMany: jest.fn().mockResolvedValue([]) },
      user: { findFirst: jest.fn() },
      userScope: { findMany: jest.fn().mockResolvedValue([]) },
      userScopePolicy: { findMany: jest.fn().mockResolvedValue([]) },
      legendary: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new AccessPolicyService(prisma);
  });

  const allScope = (over: any) => ({
    isAdmin: false, churchIds: [], teamIds: [], legendaryIds: [], cityKeys: [], legendaryCities: [], topIds: [], ...over,
  });

  it('ALL libera build*Where (sem predicado) por dimensão', () => {
    expect(service.buildChurchWhere(allScope({ allChurches: true }))).toEqual({});
    expect(service.buildTeamWhere(allScope({ allTeams: true }))).toEqual({});
    expect(service.buildTopWhere(allScope({ allTops: true }))).toEqual({});
    expect(service.buildCityWhere(allScope({ allCities: true }))).toEqual({});
  });

  it('CITY=ALL = todos os Legendários (buildLegendaryWhere sem predicado)', () => {
    expect(service.buildLegendaryWhere(allScope({ allCities: true }))).toEqual({});
  });

  it('CHURCH=ALL entra na geografia de legendário como churchId not null', () => {
    expect(service.buildLegendaryWhere(allScope({ allChurches: true }))).toEqual({ OR: [{ churchId: { not: null } }] });
  });

  it('ALL libera assert*Allowed para qualquer id', () => {
    expect(() => service.assertChurchAllowed(allScope({ allChurches: true }), 'x')).not.toThrow();
    expect(() => service.assertTeamAllowed(allScope({ allTeams: true }), 'x')).not.toThrow();
    expect(() => service.assertTopAllowed(allScope({ allTops: true }), 'x')).not.toThrow();
    expect(() => service.assertCityAllowed(allScope({ allCities: true }), 'x')).not.toThrow();
  });

  it('resolveScope: política CHURCH=ALL → allChurches e ignora a lista explícita', async () => {
    prisma.userScope.findMany.mockResolvedValueOnce([{ type: 'CHURCH', value: 'church-1' }]);
    prisma.userScopePolicy.findMany.mockResolvedValueOnce([{ type: 'CHURCH', mode: 'ALL' }]);

    const scope = await service.resolveScope({ sub: 'u1', email: 'a@b.c', roles: ['MEMBER'], permissions: [] } as any);

    expect(scope.allChurches).toBe(true);
    expect(scope.churchIds).toEqual([]);
    expect(service.buildChurchWhere(scope)).toEqual({});
  });

  it('resolveScope: SELECTED mantém fail-closed pela lista', async () => {
    prisma.userScope.findMany.mockResolvedValueOnce([{ type: 'TOP', value: 'top-1' }]);
    prisma.userScopePolicy.findMany.mockResolvedValueOnce([{ type: 'TOP', mode: 'SELECTED' }]);

    const scope = await service.resolveScope({ sub: 'u1', email: 'a@b.c', roles: ['MEMBER'], permissions: [] } as any);

    expect(scope.allTops).toBe(false);
    expect(scope.topIds).toEqual(['top-1']);
    expect(service.buildTopWhere(scope)).toEqual({ id: { in: ['top-1'] } });
  });
});
