import { Injectable } from '@nestjs/common';
import { LegendaryStatus, TopEventStatus, TopPreRegistrationStatus } from '@central-da-manada/shared';
import { PrismaService } from '../../database/prisma.service';
import { AccessPolicyService } from '../../common/access/access-policy.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

const EMPTY_UUID = '00000000-0000-0000-0000-000000000000';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicy: AccessPolicyService,
  ) {}

  async summary(user: AuthenticatedUser) {
    // Escopo (change user-access-control, task 10.3): não-admin vê agregados apenas
    // do seu escopo (geográfico p/ legendários/cidades/social; equipe/TOP/igreja p/
    // as demais entidades). Admin vê tudo. `mergeScope` acopla o filtro ou não.
    const scope = await this.accessPolicy.resolveScope(user);
    const withLeg = (base: any) => (scope.isAdmin ? base : { ...base, AND: [this.accessPolicy.buildLegendaryWhere(scope)] });
    const withTeam = (base: any) => (scope.isAdmin ? base : { ...base, ...this.accessPolicy.buildTeamWhere(scope) });
    const withTop = (base: any) => (scope.isAdmin ? base : { ...base, ...this.accessPolicy.buildTopWhere(scope) });
    const withChurch = (base: any) => (scope.isAdmin ? base : { ...base, ...this.accessPolicy.buildChurchWhere(scope) });
    const withCity = (base: any) => (scope.isAdmin ? base : { ...base, ...this.accessPolicy.buildCityWhere(scope) });
    const topScopeWhere = scope.isAdmin ? {} : this.accessPolicy.buildTopWhere(scope);

    const highlightedTop = await this.findHighlightedTop(topScopeWhere);
    const topId = highlightedTop?.id;
    const [
      totalLegendarios,
      activeLegendarios,
      activeTeams,
      totalTops,
      totalFamilies,
      totalChurches,
      cities,
      totalExpertises,
      socialActionInterest,
      plannedSocialActions,
      highlightedParticipants,
      highlightedServants,
      highlightedTeams,
      highlightedFamilies,
      highlightedPreRegistrations,
      nextTop,
    ] = await Promise.all([
      this.prisma.legendary.count({ where: withLeg({ deletedAt: null }) }),
      this.prisma.legendary.count({ where: withLeg({ deletedAt: null, status: LegendaryStatus.ACTIVE }) }),
      this.prisma.team.count({ where: withTeam({ deletedAt: null, status: 'ACTIVE' }) }),
      this.prisma.topEvent.count({ where: withTop({ deletedAt: null }) }),
      this.prisma.topFamily.count({ where: scope.isAdmin ? { deletedAt: null } : { deletedAt: null, topEvent: this.accessPolicy.buildTopWhere(scope) } }),
      this.prisma.church.count({ where: withChurch({ deletedAt: null }) }),
      this.prisma.legendary.findMany({ where: withLeg({ deletedAt: null, city: { not: null } }), select: { city: true }, distinct: ['city'] }),
      this.prisma.expertise.count({ where: { deletedAt: null } }),
      this.prisma.legendary.count({ where: withLeg({ deletedAt: null, socialActionInterest: true }) }),
      this.prisma.socialAction.count({ where: withCity({ deletedAt: null, status: 'PLANNED' }) }),
      this.prisma.topParticipant.count({ where: { topEventId: topId ?? EMPTY_UUID, deletedAt: null, status: { not: 'CANCELLED' } } }),
      this.prisma.topServant.count({ where: { topEventId: topId ?? EMPTY_UUID, deletedAt: null, status: { not: 'CANCELLED' } } }),
      this.prisma.topTeam.count({ where: { topEventId: topId ?? EMPTY_UUID, deletedAt: null } }),
      this.prisma.topFamily.count({ where: { topEventId: topId ?? EMPTY_UUID, deletedAt: null } }),
      this.prisma.topPreRegistration.count({ where: { topEventId: topId ?? EMPTY_UUID, status: TopPreRegistrationStatus.PENDING, deletedAt: null } }),
      this.findNextTop(topScopeWhere),
    ]);

    return {
      totals: {
        legendarios: totalLegendarios,
        activeLegendarios,
        activeTeams,
        tops: totalTops,
        families: totalFamilies,
        churches: totalChurches,
        cities: cities.length,
        expertises: totalExpertises,
        socialActionInterest,
        plannedSocialActions,
      },
      nextTop,
      highlightedTop,
      highlightedTopMetrics: {
        participants: highlightedParticipants,
        servants: highlightedServants,
        teams: highlightedTeams,
        families: highlightedFamilies,
        preRegistrations: highlightedPreRegistrations,
        totalEsperado: highlightedParticipants + highlightedPreRegistrations,
      },
    };
  }

  private async findHighlightedTop(topScopeWhere: any = {}) {
    const include = { representative: true, deputyRepresentative: true, _count: { select: { participants: true, servants: true, teams: true, families: true } } };
    const top = await this.prisma.topEvent.findFirst({
      where: {
        deletedAt: null,
        startDate: { gte: new Date() },
        status: { notIn: [TopEventStatus.CANCELLED, TopEventStatus.COMPLETED] },
        ...topScopeWhere,
      },
      include,
      orderBy: { startDate: 'asc' },
    });
    return top ? this.toTopResponse(top) : null;
  }

  private async findNextTop(topScopeWhere: any = {}) {
    const top = await this.prisma.topEvent.findFirst({
      where: {
        deletedAt: null,
        startDate: { gte: new Date() },
        status: { notIn: [TopEventStatus.CANCELLED, TopEventStatus.COMPLETED] },
        ...topScopeWhere,
      },
      orderBy: { startDate: 'asc' },
    });
    return top ? this.toTopResponse(top) : null;
  }

  private toTopResponse(top: any) {
    return { ...top, participantsCount: top._count?.participants ?? 0, servantsCount: top._count?.servants ?? 0, teamsCount: top._count?.teams ?? 0, familiesCount: top._count?.families ?? 0 };
  }
}
