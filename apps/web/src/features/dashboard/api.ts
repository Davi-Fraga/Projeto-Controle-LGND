import { api } from '@/lib/api';
import type { TopEvent } from '@central-da-manada/shared';

export type DashboardSummary = {
  totals: {
    legendarios: number;
    activeLegendarios: number;
    activeTeams: number;
    tops: number;
    families: number;
    churches: number;
    cities: number;
    expertises: number;
    socialActionInterest: number;
    plannedSocialActions: number;
  };
  nextTop: TopEvent | null;
  highlightedTop: TopEvent | null;
  highlightedTopMetrics: {
    participants: number;
    servants: number;
    teams: number;
    families: number;
    preRegistrations: number;
    totalEsperado: number;
  };
};

export function getDashboardSummary() {
  return api<{ data: DashboardSummary }>('/dashboard/summary');
}
