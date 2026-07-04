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
  });
});
