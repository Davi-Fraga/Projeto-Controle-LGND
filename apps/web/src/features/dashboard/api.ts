import { api } from '@/lib/api';
import type { TopEvent } from '@central-da-manada/shared';

// Cada contador é `number | null`: `null` = usuário sem permissão de tela da entidade
// (o backend omite a contagem, nunca vaza o global). `0` = tem acesso, escopo vazio.
export type DashboardSummary = {
  totals: {
    legendarios: number | null;
    activeLegendarios: number | null;
    activeTeams: number | null;
    tops: number | null;
    families: number | null;
    churches: number | null;
    cities: number | null;
    expertises: number | null;
    socialActionInterest: number | null;
    plannedSocialActions: number | null;
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
  } | null;
};

export function getDashboardSummary() {
  return api<{ data: DashboardSummary }>('/dashboard/summary');
}
