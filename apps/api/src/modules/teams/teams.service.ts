import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LegendaryHistoryType, TeamMembershipStatus, TeamStatus } from '@central-da-manada/shared';
import { AccessPolicyService } from '../../common/access/access-policy.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { getPagination, toPaginatedResponse } from '../../common/pagination/pagination.dto';
import { OptionsQueryDto } from '../../common/options/options-query.dto';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AddTeamMemberDto } from './dto/add-team-member.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import { TeamMembersQueryDto } from './dto/team-members-query.dto';
import { TeamQueryDto } from './dto/team-query.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

const includeTeam = {
  coordinator: true,
  deputyCoordinator: true,
  _count: {
    select: {
      memberships: {
        where: {
          status: TeamMembershipStatus.ACTIVE,
          deletedAt: null,
        },
      },
    },
  },
};

const includeMember = {
  legendary: true,
  team: true,
};

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly accessPolicy: AccessPolicyService,
  ) {}

  async findAll(query: TeamQueryDto, user: AuthenticatedUser) {
    const { page, perPage, skip, take } = getPagination(query);
    const where: any = {
      deletedAt: null,
      status: query.status,
      coordinatorLegendaryId: query.coordinatorLegendaryId,
    };

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const scope = await this.accessPolicy.resolveScope(user);
    if (!scope.isAdmin) {
      where.AND = [...(where.AND ?? []), this.accessPolicy.buildTeamWhere(scope)];
    }

    const orderBy = { [query.orderBy ?? 'name']: query.orderDirection ?? 'asc' };
    const [items, total] = await Promise.all([
      this.prisma.team.findMany({ where, include: includeTeam, orderBy, skip, take }),
      this.prisma.team.count({ where }),
    ]);

    return toPaginatedResponse(items.map((item: any) => this.toTeamResponse(item)), total, page, perPage);
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const scope = await this.accessPolicy.resolveScope(user);
    const where: any = { id, deletedAt: null };
    if (!scope.isAdmin) {
      where.AND = [this.accessPolicy.buildTeamWhere(scope)];
    }

    const team = await this.prisma.team.findFirst({
      where,
      include: {
        ...includeTeam,
        memberships: {
          where: { status: TeamMembershipStatus.ACTIVE, deletedAt: null },
          include: includeMember,
          orderBy: { legendary: { fullName: 'asc' } },
        },
      },
    });

    if (!team) throw new NotFoundException('Team not found.');
    return this.toTeamResponse(team);
  }

  async options(query: OptionsQueryDto, user: AuthenticatedUser) {
    const where: any = { deletedAt: null };
    if (query.activeOnly !== false) where.status = TeamStatus.ACTIVE;
    if (query.search) where.name = { contains: query.search, mode: 'insensitive' };

    const scope = await this.accessPolicy.resolveScope(user);
    if (!scope.isAdmin) {
      where.AND = [...(where.AND ?? []), this.accessPolicy.buildTeamWhere(scope)];
    }

    const items = await this.prisma.team.findMany({
      where,
      select: { id: true, name: true, status: true },
      orderBy: { name: 'asc' },
      take: query.limit ?? 20,
    });

    return items.map((item: any) => ({
      id: item.id,
      label: item.name,
      value: item.id,
      metadata: { status: item.status },
    }));
  }

  async create(dto: CreateTeamDto, actorUserId?: string) {
    await this.ensureTeamNameAvailable(dto.name);
    await this.validateCoordinators(dto);

    const team = await this.prisma.team.create({
      data: this.toTeamData(dto),
      include: includeTeam,
    });

    await this.audit.create({ actorUserId, entityType: 'Team', entityId: team.id, action: 'create', after: this.toTeamResponse(team) });
    return this.toTeamResponse(team);
  }

  async update(id: string, dto: UpdateTeamDto, actorUserId?: string) {
    const before = await this.findExistingTeam(id);
    if (dto.name) await this.ensureTeamNameAvailable(dto.name, id);
    await this.validateCoordinators(dto);

    const after = await this.prisma.team.update({
      where: { id },
      data: this.toTeamData(dto),
      include: includeTeam,
    });

    await this.audit.create({
      actorUserId,
      entityType: 'Team',
      entityId: id,
      action: 'update',
      before: this.toTeamResponse(before),
      after: this.toTeamResponse(after),
    });

    if (
      'coordinatorLegendaryId' in dto &&
      before.coordinatorLegendaryId !== after.coordinatorLegendaryId
    ) {
      await this.audit.create({
        actorUserId,
        entityType: 'Team',
        entityId: id,
        action: 'update_coordinator',
        before: { coordinatorLegendaryId: before.coordinatorLegendaryId },
        after: { coordinatorLegendaryId: after.coordinatorLegendaryId },
      });
    }

    if (
      'deputyCoordinatorLegendaryId' in dto &&
      before.deputyCoordinatorLegendaryId !== after.deputyCoordinatorLegendaryId
    ) {
      await this.audit.create({
        actorUserId,
        entityType: 'Team',
        entityId: id,
        action: 'update_deputy_coordinator',
        before: { deputyCoordinatorLegendaryId: before.deputyCoordinatorLegendaryId },
        after: { deputyCoordinatorLegendaryId: after.deputyCoordinatorLegendaryId },
      });
    }

    return this.toTeamResponse(after);
  }

  async deactivate(id: string, actorUserId?: string) {
    const before = await this.findExistingTeam(id);
    const after = await this.prisma.team.update({
      where: { id },
      data: { deletedAt: new Date(), status: TeamStatus.INACTIVE },
      include: includeTeam,
    });
    await this.audit.create({ actorUserId, entityType: 'Team', entityId: id, action: 'deactivate', before: this.toTeamResponse(before), after: this.toTeamResponse(after) });
    return this.toTeamResponse(after);
  }

  async restore(id: string, actorUserId?: string) {
    const before = await this.findExistingTeamWithDeleted(id);
    await this.ensureTeamNameAvailable(before.name, id);
    const after = await this.prisma.team.update({ where: { id }, data: { deletedAt: null }, include: includeTeam });
    await this.audit.create({ actorUserId, entityType: 'Team', entityId: id, action: 'restore', before: this.toTeamResponse(before), after: this.toTeamResponse(after) });
    return this.toTeamResponse(after);
  }

  async findMembers(teamId: string, query: TeamMembersQueryDto, user: AuthenticatedUser) {
    const scope = await this.accessPolicy.resolveScope(user);
    if (!scope.isAdmin && !scope.teamIds.includes(teamId)) {
      throw new NotFoundException('Team not found.');
    }
    await this.findExistingTeam(teamId);
    const { page, perPage, skip, take } = getPagination(query);
    const where: any = {
      teamId,
      deletedAt: null,
      status: query.status,
      role: query.role ? { contains: query.role, mode: 'insensitive' } : undefined,
    };

    if (query.search) {
      where.legendary = {
        OR: [
          { fullName: { contains: query.search, mode: 'insensitive' } },
          { lgndNumber: { contains: query.search, mode: 'insensitive' } },
          { phone: { contains: query.search.replace(/\D/g, ''), mode: 'insensitive' } },
        ],
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.teamMembership.findMany({
        where,
        include: includeMember,
        orderBy: { legendary: { fullName: 'asc' } },
        skip,
        take,
      }),
      this.prisma.teamMembership.count({ where }),
    ]);

    return toPaginatedResponse(items, total, page, perPage);
  }

  async addMember(teamId: string, dto: AddTeamMemberDto, actorUserId?: string) {
    await this.findExistingTeam(teamId);
    await this.ensureLegendaryExists(dto.legendaryId);
    await this.ensureActiveMembershipAvailable(teamId, dto.legendaryId);

    const membership = await this.prisma.teamMembership.create({
      data: {
        teamId,
        legendaryId: dto.legendaryId,
        role: dto.role.trim(),
        startedAt: dto.startedAt ?? new Date(),
        notes: dto.notes?.trim() || null,
      },
      include: includeMember,
    });

    await this.audit.create({ actorUserId, entityType: 'TeamMembership', entityId: membership.id, action: 'add_member', after: membership });
    await this.createHistory(membership.legendaryId, LegendaryHistoryType.TEAM_JOINED, 'Entrou em equipe', `Entrou na equipe ${membership.team?.name ?? ''}.`.trim(), actorUserId, { teamId });
    return membership;
  }

  async updateMember(teamId: string, membershipId: string, dto: UpdateTeamMemberDto, actorUserId?: string) {
    await this.findExistingTeam(teamId);
    const before = await this.findExistingMembership(teamId, membershipId);

    const after = await this.prisma.teamMembership.update({
      where: { id: membershipId },
      data: {
        role: dto.role?.trim(),
        status: dto.status,
        startedAt: dto.startedAt,
        endedAt: dto.endedAt,
        notes: dto.notes === null ? null : (dto.notes !== undefined ? dto.notes.trim() : undefined),
      },
      include: includeMember,
    });

    await this.audit.create({ actorUserId, entityType: 'TeamMembership', entityId: membershipId, action: 'update_member', before, after });
    if (dto.role && before.role !== after.role) await this.createHistory(after.legendaryId, LegendaryHistoryType.TEAM_ROLE_CHANGED, 'Funcao em equipe alterada', `Funcao alterada para ${after.role}.`, actorUserId, { teamId });
    return after;
  }

  async deactivateMember(teamId: string, membershipId: string, actorUserId?: string) {
    await this.findExistingTeam(teamId);
    const before = await this.findExistingMembership(teamId, membershipId);
    const after = await this.prisma.teamMembership.update({
      where: { id: membershipId },
      data: {
        status: TeamMembershipStatus.INACTIVE,
        endedAt: before.endedAt ?? new Date(),
        deletedAt: new Date(),
      },
      include: includeMember,
    });

    await this.audit.create({ actorUserId, entityType: 'TeamMembership', entityId: membershipId, action: 'deactivate_member', before, after });
    await this.createHistory(after.legendaryId, LegendaryHistoryType.TEAM_LEFT, 'Saiu de equipe', `Saiu da equipe ${after.team?.name ?? ''}.`.trim(), actorUserId, { teamId });
    return after;
  }

  private async validateCoordinators(dto: Partial<CreateTeamDto>) {
    if (
      dto.coordinatorLegendaryId &&
      dto.deputyCoordinatorLegendaryId &&
      dto.coordinatorLegendaryId === dto.deputyCoordinatorLegendaryId
    ) {
      throw new BadRequestException('Coordinator and deputy coordinator must be different.');
    }

    if (dto.coordinatorLegendaryId) await this.ensureLegendaryExists(dto.coordinatorLegendaryId);
    if (dto.deputyCoordinatorLegendaryId) await this.ensureLegendaryExists(dto.deputyCoordinatorLegendaryId);
  }

  private async ensureLegendaryExists(id: string) {
    const legendary = await this.prisma.legendary.findFirst({ where: { id, deletedAt: null } });
    if (!legendary) throw new BadRequestException('Legendary does not exist.');
  }

  private async ensureTeamNameAvailable(name: string, currentId?: string) {
    const existing = await this.prisma.team.findFirst({
      where: { deletedAt: null, name: { equals: name.trim(), mode: 'insensitive' } },
    });
    if (existing && existing.id !== currentId) throw new BadRequestException('Active team already exists.');
  }

  private async ensureActiveMembershipAvailable(teamId: string, legendaryId: string) {
    const existing = await this.prisma.teamMembership.findFirst({
      where: { teamId, legendaryId, status: TeamMembershipStatus.ACTIVE, deletedAt: null },
    });
    if (existing) throw new BadRequestException('Legendary already has an active membership in this team.');
  }

  private async findExistingTeam(id: string) {
    const team = await this.prisma.team.findFirst({ where: { id, deletedAt: null }, include: includeTeam });
    if (!team) throw new NotFoundException('Team not found.');
    return team;
  }

  private async findExistingTeamWithDeleted(id: string) {
    const team = await this.prisma.team.findUnique({ where: { id }, include: includeTeam });
    if (!team) throw new NotFoundException('Team not found.');
    return team;
  }

  private async findExistingMembership(teamId: string, membershipId: string) {
    const membership = await this.prisma.teamMembership.findFirst({
      where: { id: membershipId, teamId, deletedAt: null },
      include: includeMember,
    });
    if (!membership) throw new NotFoundException('Team membership not found.');
    return membership;
  }

  private toTeamData(dto: Partial<CreateTeamDto>) {
    const data: any = {};
    if ('name' in dto) data.name = dto.name?.trim();
    if ('description' in dto) data.description = dto.description?.trim() || null;
    if ('status' in dto) data.status = dto.status;
    if ('coordinatorLegendaryId' in dto) data.coordinatorLegendaryId = dto.coordinatorLegendaryId || null;
    if ('deputyCoordinatorLegendaryId' in dto) data.deputyCoordinatorLegendaryId = dto.deputyCoordinatorLegendaryId || null;
    return data;
  }

  private toTeamResponse(team: any) {
    return {
      ...team,
      activeMembersCount: team._count?.memberships ?? team.memberships?.filter((item: any) => item.status === TeamMembershipStatus.ACTIVE && !item.deletedAt).length ?? 0,
    };
  }
  private async createHistory(legendaryId: string, type: LegendaryHistoryType, title: string, description: string, actorUserId: string | undefined, context: { teamId?: string }) {
    if (!this.prisma.legendaryHistory) return;
    await this.prisma.legendaryHistory.create({ data: { legendaryId, type, title, description, actorUserId, teamId: context.teamId } });
  }
}
