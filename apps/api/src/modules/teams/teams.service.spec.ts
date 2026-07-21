import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TeamMembershipStatus, TeamStatus } from '@central-da-manada/shared';
import { TeamsService } from './teams.service';

const adminUser = { sub: 'admin-id', email: 'admin@example.com', roles: ['COORDINATION_ADMIN'], permissions: [] };
const coordinatorUser = { sub: 'coord-id', email: 'coord@example.com', legendaryId: 'legendary-1', roles: ['TEAM_COORDINATOR'], permissions: [] };

describe('TeamsService', () => {
  let service: TeamsService;
  let prisma: any;
  let audit: any;
  let accessPolicy: any;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      team: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      legendary: { findFirst: jest.fn() },
      teamMembership: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    audit = { create: jest.fn() };
    accessPolicy = {
      resolveScope: jest.fn(),
      buildTeamWhere: jest.fn(),
    };
    service = new TeamsService(prisma, audit, accessPolicy);
  });

  it('findAll admin sees all without scope filter', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: true, churchIds: [], teamIds: [], legendaryIds: [] });
    prisma.team.findMany.mockResolvedValueOnce([{ id: 'team-1', name: 'Midia', _count: { memberships: 0 } }]);
    prisma.team.count.mockResolvedValueOnce(1);

    const result = await service.findAll({ page: 1, perPage: 10 }, adminUser);

    expect(result.meta.total).toBe(1);
    expect(accessPolicy.buildTeamWhere).not.toHaveBeenCalled();
    const [findManyCall] = prisma.team.findMany.mock.calls;
    expect(findManyCall[0].where.AND).toBeUndefined();
  });

  it('findAll scopes teams for coordinator via AND filter', async () => {
    const scopeFilter = { id: { in: ['team-1'] } };
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: false, churchIds: [], teamIds: ['team-1'], legendaryIds: [] });
    accessPolicy.buildTeamWhere.mockReturnValueOnce(scopeFilter);
    prisma.team.findMany.mockResolvedValueOnce([]);
    prisma.team.count.mockResolvedValueOnce(0);

    await service.findAll({ page: 1, perPage: 10 }, coordinatorUser);

    const [findManyCall] = prisma.team.findMany.mock.calls;
    expect(findManyCall[0].where.AND).toContainEqual(scopeFilter);
  });

  it('findOne returns 404 when team is outside scope', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: false, churchIds: [], teamIds: ['other-team'], legendaryIds: [] });
    accessPolicy.buildTeamWhere.mockReturnValueOnce({ id: { in: ['other-team'] } });
    prisma.team.findFirst.mockResolvedValueOnce(null);

    await expect(service.findOne('team-1', coordinatorUser)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findOne succeeds for admin regardless of scope', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: true, churchIds: [], teamIds: [], legendaryIds: [] });
    prisma.team.findFirst.mockResolvedValueOnce({ id: 'team-1', name: 'Midia', _count: { memberships: 0 } });

    const result = await service.findOne('team-1', adminUser);

    expect(result.name).toBe('Midia');
    expect(accessPolicy.buildTeamWhere).not.toHaveBeenCalled();
  });

  it('options applies the team scope for a restricted user', async () => {
    const scopeFilter = { id: { in: ['team-1'] } };
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: false, churchIds: [], teamIds: ['team-1'], legendaryIds: [] });
    accessPolicy.buildTeamWhere.mockReturnValueOnce(scopeFilter);
    prisma.team.findMany.mockResolvedValueOnce([{ id: 'team-1', name: 'Midia', status: TeamStatus.ACTIVE }]);

    const result = await service.options({ search: 'mid', limit: 5 }, coordinatorUser);

    expect(prisma.team.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        name: { contains: 'mid', mode: 'insensitive' },
        AND: [scopeFilter],
      }),
      take: 5,
    }));
    expect(result).toEqual([expect.objectContaining({ value: 'team-1', label: 'Midia' })]);
  });

  it('options keeps administrators unrestricted', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: true, churchIds: [], teamIds: [], legendaryIds: [] });
    prisma.team.findMany.mockResolvedValueOnce([]);

    await service.options({ limit: 20 }, adminUser);

    expect(accessPolicy.buildTeamWhere).not.toHaveBeenCalled();
    expect(prisma.team.findMany.mock.calls[0][0].where.AND).toBeUndefined();
  });

  it('findMembers returns 404 when teamId is outside scope', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: false, churchIds: [], teamIds: ['other-team'], legendaryIds: [] });

    await expect(
      service.findMembers('team-1', { page: 1, perPage: 10 }, coordinatorUser),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.team.findFirst).not.toHaveBeenCalled();
  });

  it('findMembers succeeds for admin for any team', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: true, churchIds: [], teamIds: [], legendaryIds: [] });
    prisma.team.findFirst.mockResolvedValueOnce({ id: 'team-1', name: 'Midia', _count: { memberships: 0 } });
    prisma.teamMembership.findMany.mockResolvedValueOnce([]);
    prisma.teamMembership.count.mockResolvedValueOnce(0);

    const result = await service.findMembers('team-1', { page: 1, perPage: 10 }, adminUser);

    expect(result.data).toEqual([]);
  });

  it('findMembers busca telefone nos formatos legado e canônico sem cláusula vazia', async () => {
    accessPolicy.resolveScope.mockResolvedValue({ isAdmin: true, churchIds: [], teamIds: [], legendaryIds: [] });
    prisma.team.findFirst.mockResolvedValue({ id: 'team-1', name: 'Midia', _count: { memberships: 0 } });
    prisma.teamMembership.findMany.mockResolvedValue([]);
    prisma.teamMembership.count.mockResolvedValue(0);

    await service.findMembers('team-1', { page: 1, perPage: 10, search: '64992485187' }, adminUser);

    const or = prisma.teamMembership.findMany.mock.calls[0][0].where.legendary.OR;
    expect(or).toContainEqual({ phone: { contains: '64992485187', mode: 'insensitive' } });
    expect(or).toContainEqual({ phone: { contains: '(64) 99248-5187', mode: 'insensitive' } });

    await service.findMembers('team-1', { page: 1, perPage: 10, search: 'João' }, adminUser);
    const textOr = prisma.teamMembership.findMany.mock.calls[1][0].where.legendary.OR;
    expect(textOr.some((clause: any) => clause.phone?.contains === '')).toBe(false);
  });

  it('creates a team', async () => {
    prisma.team.findFirst.mockResolvedValueOnce(null);
    prisma.team.create.mockResolvedValueOnce({
      id: 'team-1',
      name: 'Midia',
      status: TeamStatus.ACTIVE,
      _count: { memberships: 0 },
    });

    const result = await service.create({ name: 'Midia' });

    expect(result.name).toBe('Midia');
    expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'create' }));
  });

  it('blocks duplicated active team name', async () => {
    prisma.team.findFirst.mockResolvedValueOnce({ id: 'existing', name: 'Midia' });

    await expect(service.create({ name: 'Midia' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates team coordinators', async () => {
    prisma.team.findFirst
      .mockResolvedValueOnce({
        id: 'team-1',
        name: 'Midia',
        coordinatorLegendaryId: null,
        deputyCoordinatorLegendaryId: null,
        _count: { memberships: 0 },
      })
      .mockResolvedValueOnce(null);
    prisma.legendary.findFirst
      .mockResolvedValueOnce({ id: 'legendary-1' })
      .mockResolvedValueOnce({ id: 'legendary-2' });
    prisma.team.update.mockResolvedValueOnce({
      id: 'team-1',
      name: 'Midia',
      coordinatorLegendaryId: 'legendary-1',
      deputyCoordinatorLegendaryId: 'legendary-2',
      _count: { memberships: 0 },
    });

    const result = await service.update('team-1', {
      coordinatorLegendaryId: 'legendary-1',
      deputyCoordinatorLegendaryId: 'legendary-2',
    });

    expect(result.coordinatorLegendaryId).toBe('legendary-1');
    expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'update_coordinator' }));
  });

  it('blocks same coordinator and deputy coordinator', async () => {
    prisma.team.findFirst.mockResolvedValueOnce({
      id: 'team-1',
      name: 'Midia',
      _count: { memberships: 0 },
    });

    await expect(
      service.update('team-1', {
        coordinatorLegendaryId: 'legendary-1',
        deputyCoordinatorLegendaryId: 'legendary-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('adds a team member', async () => {
    prisma.team.findFirst.mockResolvedValueOnce({ id: 'team-1', name: 'Midia', _count: { memberships: 0 } });
    prisma.legendary.findFirst.mockResolvedValueOnce({ id: 'legendary-1' });
    prisma.teamMembership.findFirst.mockResolvedValueOnce(null);
    prisma.teamMembership.create.mockResolvedValueOnce({
      id: 'membership-1',
      teamId: 'team-1',
      legendaryId: 'legendary-1',
      role: 'Editor',
      status: TeamMembershipStatus.ACTIVE,
    });

    const result = await service.addMember('team-1', {
      legendaryId: 'legendary-1',
      role: 'Editor',
    });

    expect(result.role).toBe('Editor');
    expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'add_member' }));
  });

  it('blocks duplicated active membership', async () => {
    prisma.team.findFirst.mockResolvedValueOnce({ id: 'team-1', name: 'Midia', _count: { memberships: 0 } });
    prisma.legendary.findFirst.mockResolvedValueOnce({ id: 'legendary-1' });
    prisma.teamMembership.findFirst.mockResolvedValueOnce({ id: 'membership-1' });

    await expect(
      service.addMember('team-1', {
        legendaryId: 'legendary-1',
        role: 'Editor',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deactivates a member preserving history', async () => {
    prisma.team.findFirst.mockResolvedValueOnce({ id: 'team-1', name: 'Midia', _count: { memberships: 0 } });
    prisma.teamMembership.findFirst.mockResolvedValueOnce({
      id: 'membership-1',
      teamId: 'team-1',
      role: 'Editor',
      endedAt: null,
    });
    prisma.teamMembership.update.mockResolvedValueOnce({
      id: 'membership-1',
      status: TeamMembershipStatus.INACTIVE,
      endedAt: new Date(),
    });

    const result = await service.deactivateMember('team-1', 'membership-1');

    expect(result.status).toBe(TeamMembershipStatus.INACTIVE);
    expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'deactivate_member' }));
  });
});
