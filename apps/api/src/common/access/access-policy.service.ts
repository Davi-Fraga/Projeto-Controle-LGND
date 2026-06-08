import { Injectable } from '@nestjs/common';
import { TeamMembershipStatus } from '@central-da-manada/shared';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { PrismaService } from '../../database/prisma.service';

export type AccessScope = {
  isAdmin: boolean;
  churchIds: string[];
  teamIds: string[];
  legendaryIds: string[];
};

@Injectable()
export class AccessPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveScope(user: AuthenticatedUser): Promise<AccessScope> {
    if (this.isAdmin(user)) {
      return this.unrestrictedScope();
    }

    const [churchIds, teamIds] = await Promise.all([
      this.resolveSpiritualLeaderChurchIds(user),
      this.resolveTeamLeaderTeamIds(user),
    ]);

    return {
      isAdmin: false,
      churchIds,
      teamIds,
      legendaryIds: [],
    };
  }

  buildLegendaryWhere(scope: AccessScope) {
    if (scope.isAdmin) return {};

    const OR: any[] = [];

    if (scope.churchIds.length) {
      OR.push({ churchId: { in: scope.churchIds } });
    }

    if (scope.teamIds.length) {
      OR.push({
        teamMemberships: {
          some: {
            deletedAt: null,
            status: TeamMembershipStatus.ACTIVE,
            teamId: { in: scope.teamIds },
          },
        },
      });
    }

    if (scope.legendaryIds.length) {
      OR.push({ id: { in: scope.legendaryIds } });
    }

    return OR.length ? { OR } : { id: { in: [] } };
  }

  buildTeamWhere(scope: AccessScope) {
    if (scope.isAdmin) return {};
    return scope.teamIds.length ? { id: { in: scope.teamIds } } : { id: { in: [] } };
  }

  buildChurchWhere(scope: AccessScope) {
    if (scope.isAdmin) return {};
    return scope.churchIds.length ? { id: { in: scope.churchIds } } : { id: { in: [] } };
  }

  private isAdmin(user: AuthenticatedUser) {
    return (
      user.roles.includes('COORDINATION_ADMIN') ||
      user.roles.includes('COORDINATION_USER')
    );
  }

  private unrestrictedScope(): AccessScope {
    return {
      isAdmin: true,
      churchIds: [],
      teamIds: [],
      legendaryIds: [],
    };
  }

  private async resolveSpiritualLeaderChurchIds(user: AuthenticatedUser) {
    if (!user.roles.includes('SPIRITUAL_LEADER')) return [];

    const churches = await this.prisma.church.findMany({
      where: { deletedAt: null, spiritualLeaderUserId: user.sub },
      select: { id: true },
    });

    return churches.map((church) => church.id);
  }

  private async resolveTeamLeaderTeamIds(user: AuthenticatedUser) {
    if (!user.roles.includes('TEAM_COORDINATOR') || !user.legendaryId) return [];

    const teams = await this.prisma.team.findMany({
      where: {
        deletedAt: null,
        OR: [
          { coordinatorLegendaryId: user.legendaryId },
          { deputyCoordinatorLegendaryId: user.legendaryId },
        ],
      },
      select: { id: true },
    });

    return teams.map((team) => team.id);
  }
}
