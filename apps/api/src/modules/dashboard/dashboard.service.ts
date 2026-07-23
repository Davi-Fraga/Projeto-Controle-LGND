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
    // Autorização por contador (change access-scope-semantics-hardening): cada agregado
    // respeita (1) a PERMISSÃO de tela da entidade e (2) o ESCOPO do usuário. Sem a
    // permissão, o contador vem `null` (omitido no front) — NUNCA a contagem global.
    // Isso fecha o vazamento do dashboard (ex.: Expertises, que era sempre global). Admin
    // (irrestrito) vê tudo. O escopo é fail-closed via build*Where.
    const scope = await this.accessPolicy.resolveScope(user);
    const perms = new Set(user.permissions ?? []);
    const can = (key: string) => scope.isAdmin || perms.has(key);

    const withLeg = (base: any) => (scope.isAdmin ? base : { ...base, AND: [this.accessPolicy.buildLegendaryWhere(scope)] });
    const withTeam = (base: any) => (scope.isAdmin ? base : { ...base, ...this.accessPolicy.buildTeamWhere(scope) });
    const withTop = (base: any) => (scope.isAdmin ? base : { ...base, ...this.accessPolicy.buildTopWhere(scope) });
    const withChurch = (base: any) => (scope.isAdmin ? base : { ...base, ...this.accessPolicy.buildChurchWhere(scope) });
    const withCity = (base: any) => (scope.isAdmin ? base : { ...base, ...this.accessPolicy.buildCityWhere(scope) });

    const canLeg = can('legendarios.read');
    const canTeams = can('teams.read');
    const canTops = can('tops.read');
    const canFamilies = can('tops.families.read');
    const canChurches = can('churches.read');
    const canExpertises = can('expertises.read');
    const canSocial = can('social-actions.read');

    const topScopeWhere = scope.isAdmin ? {} : this.accessPolicy.buildTopWhere(scope);
    const highlightedTop = canTops ? await this.findHighlightedTop(topScopeWhere) : null;
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
      canLeg ? this.prisma.legendary.count({ where: withLeg({ deletedAt: null }) }) : Promise.resolve(null),
      canLeg ? this.prisma.legendary.count({ where: withLeg({ deletedAt: null, status: LegendaryStatus.ACTIVE }) }) : Promise.resolve(null),
      canTeams ? this.prisma.team.count({ where: withTeam({ deletedAt: null, status: 'ACTIVE' }) }) : Promise.resolve(null),
      canTops ? this.prisma.topEvent.count({ where: withTop({ deletedAt: null }) }) : Promise.resolve(null),
      canFamilies ? this.prisma.topFamily.count({ where: scope.isAdmin ? { deletedAt: null } : { deletedAt: null, topEvent: this.accessPolicy.buildTopWhere(scope) } }) : Promise.resolve(null),
      canChurches ? this.prisma.church.count({ where: withChurch({ deletedAt: null }) }) : Promise.resolve(null),
      canLeg ? this.prisma.legendary.findMany({ where: withLeg({ deletedAt: null, city: { not: null } }), select: { city: true }, distinct: ['city'] }) : Promise.resolve(null),
      canExpertises ? this.prisma.expertise.count({ where: { deletedAt: null } }) : Promise.resolve(null),
      canLeg ? this.prisma.legendary.count({ where: withLeg({ deletedAt: null, socialActionInterest: true }) }) : Promise.resolve(null),
      canSocial ? this.prisma.socialAction.count({ where: withCity({ deletedAt: null, status: 'PLANNED' }) }) : Promise.resolve(null),
      canTops ? this.prisma.topParticipant.count({ where: { topEventId: topId ?? EMPTY_UUID, deletedAt: null, status: { not: 'CANCELLED' } } }) : Promise.resolve(0),
      canTops ? this.prisma.topServant.count({ where: { topEventId: topId ?? EMPTY_UUID, deletedAt: null, status: { not: 'CANCELLED' } } }) : Promise.resolve(0),
      canTops ? this.prisma.topTeam.count({ where: { topEventId: topId ?? EMPTY_UUID, deletedAt: null } }) : Promise.resolve(0),
      canTops ? this.prisma.topFamily.count({ where: { topEventId: topId ?? EMPTY_UUID, deletedAt: null } }) : Promise.resolve(0),
      canTops ? this.prisma.topPreRegistration.count({ where: { topEventId: topId ?? EMPTY_UUID, status: TopPreRegistrationStatus.PENDING, deletedAt: null } }) : Promise.resolve(0),
      canTops ? this.findNextTop(topScopeWhere) : Promise.resolve(null),
    ]);

    return {
      totals: {
        legendarios: totalLegendarios,
        activeLegendarios,
        activeTeams,
        tops: totalTops,
        families: totalFamilies,
        churches: totalChurches,
        cities: cities === null ? null : cities.length,
        expertises: totalExpertises,
        socialActionInterest,
        plannedSocialActions,
      },
      nextTop,
      highlightedTop,
      highlightedTopMetrics: highlightedTop
        ? {
            participants: highlightedParticipants,
            servants: highlightedServants,
            teams: highlightedTeams,
            families: highlightedFamilies,
            preRegistrations: highlightedPreRegistrations,
            totalEsperado: highlightedParticipants + highlightedPreRegistrations,
          }
        : null,
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
