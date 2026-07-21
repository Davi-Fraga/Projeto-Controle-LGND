import { api } from '@/lib/api';
import type { Legendary, LegendaryFilters, PaginatedResponse } from '@central-da-manada/shared';
import type {
  TeamFilters,
  TeamMemberPayload,
  TeamMembersResponse,
  TeamPayload,
  TeamResponse,
  TeamsResponse,
} from './types';

function buildQuery(filters: Record<string, unknown>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  return params.toString();
}

export function getTeams(filters: TeamFilters) {
  const query = buildQuery(filters);
  return api<TeamsResponse>(`/teams${query ? `?${query}` : ''}`);
}

export function getTeam(id: string) {
  return api<TeamResponse>(`/teams/${id}`);
}

export type TeamOption = {
  id: string;
  label: string;
  value: string;
  metadata?: { status?: string };
};

export function getTeamOptions(search: string, limit = 20) {
  const query = buildQuery({ search: search.trim() || undefined, limit });
  return api<{ data: TeamOption[] }>(`/teams/options?${query}`);
}

export function createTeam(payload: TeamPayload) {
  return api<TeamResponse>('/teams', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateTeam(id: string, payload: TeamPayload) {
  return api<TeamResponse>(`/teams/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function deactivateTeam(id: string) {
  return api<TeamResponse>(`/teams/${id}/deactivate`, { method: 'PATCH' });
}

export function getTeamMembers(teamId: string, filters: Record<string, unknown>) {
  const query = buildQuery(filters);
  return api<TeamMembersResponse>(`/teams/${teamId}/members${query ? `?${query}` : ''}`);
}

export function addTeamMember(teamId: string, payload: TeamMemberPayload) {
  return api(`/teams/${teamId}/members`, { method: 'POST', body: JSON.stringify(payload) });
}

export function updateTeamMember(teamId: string, membershipId: string, payload: TeamMemberPayload) {
  return api(`/teams/${teamId}/members/${membershipId}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function deactivateTeamMember(teamId: string, membershipId: string) {
  return api(`/teams/${teamId}/members/${membershipId}/deactivate`, { method: 'PATCH' });
}

export function searchLegendarios(filters: LegendaryFilters) {
  const query = buildQuery(filters);
  return api<PaginatedResponse<Legendary>>(`/legendarios${query ? `?${query}` : ''}`);
}
