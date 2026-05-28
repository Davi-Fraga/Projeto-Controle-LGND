import { BadRequestException } from '@nestjs/common';
import { TeamMembershipStatus, TeamStatus } from '@central-da-manada/shared';
import { TeamsService } from './teams.service';

describe('TeamsService', () => {
  let service: TeamsService;
  let prisma: any;
  let audit: any;

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
    service = new TeamsService(prisma, audit);
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
