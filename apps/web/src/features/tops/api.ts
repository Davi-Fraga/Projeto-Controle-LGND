import { api } from '@/lib/api';
import type { Legendary, LegendaryFilters, PaginatedResponse, TeamFilters } from '@central-da-manada/shared';
import type {
  TeamsOptionsResponse,
  TopFilters,
  TopFamiliesResponse,
  TopFamilyMemberPayload,
  TopFamilyMembersResponse,
  TopFamilyPayload,
  TopFamilyResponse,
  OptionsResponse,
  TopParticipantPayload,
  TopParticipantsResponse,
  TopPayload,
  TopResponse,
  TopServantPayload,
  TopServantsResponse,
  TopTeamPayload,
  TopTeamsResponse,
  TopsResponse,
} from './types';

function query(filters: Record<string, unknown>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  return params.toString();
}

export const getTops = (filters: TopFilters) => api<TopsResponse>(`/tops${query(filters) ? `?${query(filters)}` : ''}`);
export const getTop = (id: string) => api<TopResponse>(`/tops/${id}`);
export const createTop = (payload: TopPayload) => api<TopResponse>('/tops', { method: 'POST', body: JSON.stringify(payload) });
export const updateTop = (id: string, payload: TopPayload) => api<TopResponse>(`/tops/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const deactivateTop = (id: string) => api<TopResponse>(`/tops/${id}/deactivate`, { method: 'PATCH' });
export const getTopFamilies = (id: string) => api<TopFamiliesResponse>(`/tops/${id}/families`);
export const getTopFamilyOptions = (id: string, filters: Record<string, unknown> = {}) => api<OptionsResponse>(`/tops/${id}/families/options${query(filters) ? `?${query(filters)}` : ''}`);
export const getTopFamily = (id: string, familyId: string) => api<TopFamilyResponse>(`/tops/${id}/families/${familyId}`);
export const createTopFamily = (id: string, payload: TopFamilyPayload) => api<TopFamilyResponse>(`/tops/${id}/families`, { method: 'POST', body: JSON.stringify(payload) });
export const updateTopFamily = (id: string, familyId: string, payload: TopFamilyPayload) => api<TopFamilyResponse>(`/tops/${id}/families/${familyId}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const deactivateTopFamily = (id: string, familyId: string) => api<TopFamilyResponse>(`/tops/${id}/families/${familyId}/deactivate`, { method: 'PATCH' });
export const getTopFamilyMembers = (id: string, familyId: string) => api<TopFamilyMembersResponse>(`/tops/${id}/families/${familyId}/members`);
export const addTopFamilyMember = (id: string, familyId: string, payload: TopFamilyMemberPayload) => api(`/tops/${id}/families/${familyId}/members`, { method: 'POST', body: JSON.stringify(payload) });
export const updateTopFamilyMember = (id: string, familyId: string, memberId: string, payload: TopFamilyMemberPayload) => api(`/tops/${id}/families/${familyId}/members/${memberId}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const deactivateTopFamilyMember = (id: string, familyId: string, memberId: string) => api(`/tops/${id}/families/${familyId}/members/${memberId}/deactivate`, { method: 'PATCH' });
export const transferTopFamilyMember = (id: string, familyId: string, memberId: string, targetFamilyId: string, notes?: string) => api(`/tops/${id}/families/${familyId}/members/${memberId}/transfer`, { method: 'POST', body: JSON.stringify({ targetFamilyId, notes }) });
export const getTopTeams = (id: string) => api<TopTeamsResponse>(`/tops/${id}/teams`);
export const addTopTeam = (id: string, payload: TopTeamPayload) => api(`/tops/${id}/teams`, { method: 'POST', body: JSON.stringify(payload) });
export const updateTopTeam = (id: string, topTeamId: string, payload: TopTeamPayload) => api(`/tops/${id}/teams/${topTeamId}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const removeTopTeam = (id: string, topTeamId: string) => api(`/tops/${id}/teams/${topTeamId}`, { method: 'DELETE' });
export const getTopParticipants = (id: string, filters: Record<string, unknown>) => api<TopParticipantsResponse>(`/tops/${id}/participants${query(filters) ? `?${query(filters)}` : ''}`);
export const getTopParticipantOptions = (id: string, filters: Record<string, unknown> = {}) => api<OptionsResponse>(`/tops/${id}/participants/options${query(filters) ? `?${query(filters)}` : ''}`);
export const addTopParticipant = (id: string, payload: TopParticipantPayload) => api(`/tops/${id}/participants`, { method: 'POST', body: JSON.stringify(payload) });
export const updateTopParticipant = (id: string, participantId: string, payload: TopParticipantPayload) => api(`/tops/${id}/participants/${participantId}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const cancelTopParticipant = (id: string, participantId: string) => api(`/tops/${id}/participants/${participantId}/cancel`, { method: 'PATCH' });
export const getTopServants = (id: string, filters: Record<string, unknown>) => api<TopServantsResponse>(`/tops/${id}/servants${query(filters) ? `?${query(filters)}` : ''}`);
export const addTopServant = (id: string, payload: TopServantPayload) => api(`/tops/${id}/servants`, { method: 'POST', body: JSON.stringify(payload) });
export const updateTopServant = (id: string, servantId: string, payload: TopServantPayload) => api(`/tops/${id}/servants/${servantId}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const cancelTopServant = (id: string, servantId: string) => api(`/tops/${id}/servants/${servantId}/cancel`, { method: 'PATCH' });
export const searchLegendarios = (filters: LegendaryFilters) => api<PaginatedResponse<Legendary>>(`/legendarios${query(filters) ? `?${query(filters)}` : ''}`);
export const getLegendarioOptions = (filters: Record<string, unknown> = {}) => api<OptionsResponse>(`/legendarios/options${query(filters) ? `?${query(filters)}` : ''}`);
export const getTeamsOptions = (filters: TeamFilters) => api<TeamsOptionsResponse>(`/teams${query(filters) ? `?${query(filters)}` : ''}`);
export const getTopOptions = (filters: Record<string, unknown> = {}) => api<OptionsResponse>(`/tops/options${query(filters) ? `?${query(filters)}` : ''}`);
export const getTeamsOptionsList = (filters: Record<string, unknown> = {}) => api<OptionsResponse>(`/teams/options${query(filters) ? `?${query(filters)}` : ''}`);
