import { Injectable, NotFoundException } from '@nestjs/common';
import { LegendaryStatus, TeamMembershipStatus, TeamStatus, teamDisplayName } from '@central-da-manada/shared';
import type { OrgChartNode } from '@central-da-manada/shared';
import { PrismaService } from '../../database/prisma.service';
import { annotateCounts, normalizeCityKey, orgNode } from '../../common/org-chart/org-chart.util';
import type { CitiesMode } from './dto/cities-query.dto';

// Sentinel slug used by the city selector for legendaries without a city.
export const NO_CITY = '__none__';

@Injectable()
export class OrgChartService {
  constructor(private readonly prisma: PrismaService) {}

  // Team (group) -> coordinator (leader) holding the members; deputy is a sibling leader without members.
  async getTeamChart(teamId: string): Promise<OrgChartNode> {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, deletedAt: null },
      include: {
        coordinator: true,
        deputyCoordinator: true,
        memberships: { where: { status: TeamMembershipStatus.ACTIVE, deletedAt: null }, include: { legendary: true }, orderBy: { startedAt: 'asc' } },
      },
    });
    if (!team) throw new NotFoundException('Team not found.');

    // The whole team branch shares the coordinator's color.
    const branchLeaderId = team.coordinatorLegendaryId ?? undefined;
    const root = orgNode(`team:${team.id}`, 'group', teamDisplayName(team.name), { subtitle: 'Equipe', leaderId: branchLeaderId });
    const excluded = new Set([team.coordinatorLegendaryId, team.deputyCoordinatorLegendaryId].filter(Boolean) as string[]);
    const memberNodes = team.memberships
      .filter((m: any) => !excluded.has(m.legendaryId))
      .map((m: any) => orgNode(`member:${m.id}`, 'person', m.legendary?.fullName ?? 'Sem nome', { subtitle: m.role || undefined }));

    if (team.coordinatorLegendaryId) {
      const coordNode = orgNode(`leader:${team.id}`, 'leader', team.coordinator?.fullName ?? 'Coordenador', { subtitle: 'Coordenador', leaderId: branchLeaderId });
      coordNode.children.push(...memberNodes);
      root.children.push(coordNode);
      if (team.deputyCoordinatorLegendaryId) {
        root.children.push(orgNode(`deputy:${team.id}`, 'leader', team.deputyCoordinator?.fullName ?? 'Vice-coordenador', { subtitle: 'Vice-coordenador', leaderId: branchLeaderId }));
      }
    } else {
      root.children.push(...memberNodes);
    }
    annotateCounts(root);
    return root;
  }

  // Coordination team (DB name) on top -> one coordinator node per other team that has a coordinator.
  async getCoordinatorsChart(): Promise<OrgChartNode> {
    const teams = await this.prisma.team.findMany({
      where: { deletedAt: null, status: TeamStatus.ACTIVE },
      include: { coordinator: true },
      orderBy: { name: 'asc' },
    });

    // The coordination team is the one whose name reads as "coordenação"/"direção".
    // The top node keeps that team's name exactly as stored in the database.
    const directorTeam = teams.find((t: any) => {
      const key = normalizeCityKey(t.name);
      return key.includes('coordena') || key.includes('direc');
    });
    const root = directorTeam
      ? orgNode('director', 'root', teamDisplayName(directorTeam.name), { subtitle: directorTeam.coordinator?.fullName ?? undefined, leaderId: directorTeam.coordinatorLegendaryId ?? undefined })
      : orgNode('director', 'root', 'Coordenação');

    for (const team of teams) {
      if (directorTeam && team.id === directorTeam.id) continue; // already the root
      if (!team.coordinator) continue;
      root.children.push(orgNode(`coordinator:${team.id}`, 'leader', team.coordinator.fullName, { subtitle: teamDisplayName(team.name), leaderId: team.coordinatorLegendaryId ?? undefined }));
    }
    annotateCounts(root);
    return root;
  }

  // Distinct cities (normalized) for the city selector, plus "Sem cidade" when applicable.
  async getCityOptions(): Promise<{ value: string; label: string; count: number }[]> {
    const rows = await this.prisma.legendary.findMany({
      where: { deletedAt: null, status: { not: LegendaryStatus.INACTIVE } },
      select: { city: true },
    });
    const map = new Map<string, { label: string; count: number }>();
    let noCity = 0;
    for (const row of rows) {
      const city = row.city?.trim();
      if (!city) {
        noCity += 1;
        continue;
      }
      const slug = normalizeCityKey(city);
      const entry = map.get(slug);
      if (entry) entry.count += 1;
      else map.set(slug, { label: city, count: 1 });
    }
    const options = [...map.entries()]
      .map(([value, v]) => ({ value, label: v.label, count: v.count }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
    if (noCity > 0) options.push({ value: NO_CITY, label: 'Sem cidade', count: noCity });
    return options;
  }

  // Cities (global): one city at a time. city -> legendary, or city -> church -> legendary.
  async getCitiesChart(mode: CitiesMode, city: string): Promise<OrgChartNode> {
    const legendaries = await this.prisma.legendary.findMany({
      where: { deletedAt: null, status: { not: LegendaryStatus.INACTIVE } },
      include: mode === 'churches' ? { church: true } : undefined,
      orderBy: { fullName: 'asc' },
    });

    if (city === NO_CITY) {
      const root = orgNode('city:none', 'group', 'Sem cidade');
      this.populateCityNode(root, legendaries.filter((l: any) => !l.city?.trim()), mode);
      annotateCounts(root);
      return root;
    }

    const inCity = legendaries.filter((l: any) => l.city?.trim() && normalizeCityKey(l.city) === city);
    const label = inCity.find((l: any) => l.city?.trim())?.city?.trim() ?? city;
    const root = orgNode(`city:${city}`, 'city', label);
    this.populateCityNode(root, inCity, mode);
    annotateCounts(root);
    return root;
  }

  private populateCityNode(cityNode: OrgChartNode, legendaries: any[], mode: CitiesMode): void {
    for (const legendary of legendaries) {
      const personNode = orgNode(`legendary:${legendary.id}`, 'person', legendary.fullName);
      if (mode === 'legendaries') {
        cityNode.children.push(personNode);
        continue;
      }
      // churches mode: city -> church -> legendary
      if (legendary.churchId && legendary.church) {
        const churchId = `church:${legendary.churchId}`;
        let churchNode = cityNode.children.find((c) => c.id === churchId);
        if (!churchNode) {
          churchNode = orgNode(churchId, 'group', legendary.church.name);
          cityNode.children.push(churchNode);
        }
        churchNode.children.push(personNode);
      } else {
        const noChurchId = `church:none:${cityNode.id}`;
        let noChurch = cityNode.children.find((c) => c.id === noChurchId);
        if (!noChurch) {
          noChurch = orgNode(noChurchId, 'group', 'Sem igreja');
          cityNode.children.push(noChurch);
        }
        noChurch.children.push(personNode);
      }
    }
  }
}
