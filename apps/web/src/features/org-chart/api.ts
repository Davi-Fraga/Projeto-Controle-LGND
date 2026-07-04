import { api } from '@/lib/api';
import type { OrgChartNode, OrgChartView } from '@central-da-manada/shared';

export type OrgChartResponse = { data: OrgChartNode };

export type CitiesMode = 'legendaries' | 'churches';

export const getOrgChart = (topId: string, view: OrgChartView) =>
  api<OrgChartResponse>(`/tops/${topId}/org-chart?view=${view}`);

export const getTeamOrgChart = (teamId: string) =>
  api<OrgChartResponse>(`/org-chart/teams/${teamId}`);

export const getCoordinatorsOrgChart = () =>
  api<OrgChartResponse>('/org-chart/coordinators');

export type CityOption = { value: string; label: string; count: number };

export const getCityOrgChartOptions = () =>
  api<{ data: CityOption[] }>('/org-chart/cities/options');

// Seletores de equipe/TOP do organograma — já restritos ao escopo do usuário.
export type OrgOptionItem = { id: string; label: string; value: string; metadata?: Record<string, unknown> };

export const getTeamOrgChartOptions = () =>
  api<{ data: OrgOptionItem[] }>('/org-chart/teams/options');

export const getTopOrgChartOptions = () =>
  api<{ data: OrgOptionItem[] }>('/org-chart/tops/options');

export const getCitiesOrgChart = (mode: CitiesMode, city: string) =>
  api<OrgChartResponse>(`/org-chart/cities?mode=${mode}&city=${encodeURIComponent(city)}`);
