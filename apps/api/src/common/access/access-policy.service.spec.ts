import { AccessPolicyService } from './access-policy.service';

describe('AccessPolicyService', () => {
  let prisma: any;
  let service: AccessPolicyService;

  beforeEach(() => {
    prisma = {
      church: {
        findMany: jest.fn(),
      },
      team: {
        findMany: jest.fn(),
      },
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
    });
    expect(prisma.church.findMany).not.toHaveBeenCalled();
    expect(prisma.team.findMany).not.toHaveBeenCalled();
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

  it('builds a scoped legendary filter combining church and team membership scopes', () => {
    const where = service.buildLegendaryWhere({
      isAdmin: false,
      churchIds: ['church-1'],
      teamIds: ['team-1'],
      legendaryIds: [],
    });

    expect(where).toEqual({
      OR: [
        { churchId: { in: ['church-1'] } },
        {
          teamMemberships: {
            some: {
              deletedAt: null,
              status: 'ACTIVE',
              teamId: { in: ['team-1'] },
            },
          },
        },
      ],
    });
  });
});
