import { Injectable } from '@nestjs/common';
import { LegendaryStatus, TopEventStatus, TopPreRegistrationStatus } from '@central-da-manada/shared';
import { PrismaService } from '../../database/prisma.service';

const EMPTY_UUID = '00000000-0000-0000-0000-000000000000';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const highlightedTop = await this.findHighlightedTop();
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
      this.prisma.legendary.count({ where: { deletedAt: null } }),
      this.prisma.legendary.count({ where: { deletedAt: null, status: LegendaryStatus.ACTIVE } }),
      this.prisma.team.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
      this.prisma.topEvent.count({ where: { deletedAt: null } }),
      this.prisma.topFamily.count({ where: { deletedAt: null } }),
      this.prisma.church.count({ where: { deletedAt: null } }),
      this.prisma.legendary.findMany({ where: { deletedAt: null, city: { not: null } }, select: { city: true }, distinct: ['city'] }),
      this.prisma.expertise.count({ where: { deletedAt: null } }),
      this.prisma.legendary.count({ where: { deletedAt: null, socialActionInterest: true } }),
      this.prisma.socialAction.count({ where: { deletedAt: null, status: 'PLANNED' } }),
      this.prisma.topParticipant.count({ where: { topEventId: topId ?? EMPTY_UUID, deletedAt: null, status: { not: 'CANCELLED' } } }),
      this.prisma.topServant.count({ where: { topEventId: topId ?? EMPTY_UUID, deletedAt: null, status: { not: 'CANCELLED' } } }),
      this.prisma.topTeam.count({ where: { topEventId: topId ?? EMPTY_UUID, deletedAt: null } }),
      this.prisma.topFamily.count({ where: { topEventId: topId ?? EMPTY_UUID, deletedAt: null } }),
      this.prisma.topPreRegistration.count({ where: { topEventId: topId ?? EMPTY_UUID, status: TopPreRegistrationStatus.PENDING, deletedAt: null } }),
      this.findNextTop(),
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

  private async findHighlightedTop() {
    const include = { representative: true, deputyRepresentative: true, _count: { select: { participants: true, servants: true, teams: true, families: true } } };
    const top = await this.prisma.topEvent.findFirst({
      where: {
        deletedAt: null,
        startDate: { gte: new Date() },
        status: { notIn: [TopEventStatus.CANCELLED, TopEventStatus.COMPLETED] },
      },
      include,
      orderBy: { startDate: 'asc' },
    });
    return top ? this.toTopResponse(top) : null;
  }

  private async findNextTop() {
    const top = await this.prisma.topEvent.findFirst({
      where: {
        deletedAt: null,
        startDate: { gte: new Date() },
        status: { notIn: [TopEventStatus.CANCELLED, TopEventStatus.COMPLETED] },
      },
      orderBy: { startDate: 'asc' },
    });
    return top ? this.toTopResponse(top) : null;
  }

  private toTopResponse(top: any) {
    return { ...top, participantsCount: top._count?.participants ?? 0, servantsCount: top._count?.servants ?? 0, teamsCount: top._count?.teams ?? 0, familiesCount: top._count?.families ?? 0 };
  }
}
