import { api } from '@/lib/api';
import type { Legendary, PaginatedResponse, SocialAction, SocialActionParticipant, SocialActionParticipantStatus, SocialActionStatus } from '@central-da-manada/shared';
import type { LegendarioOption } from '@/features/legendarios/api';

export type VolunteerSuggestion = Pick<Legendary, 'id' | 'fullName' | 'lgndNumber' | 'city'> & {
  profession?: { id: string; name: string } | null;
};

export type SocialActionPayload = {
  title: string;
  description?: string | null;
  location?: string | null;
  city?: string | null;
  startDate: string;
  endDate: string;
  status: SocialActionStatus;
  responsibleLegendaryId: string;
  notes?: string | null;
  resultSummary?: string | null;
};

export type SocialActionParticipantPayload = {
  legendaryId?: string;
  role?: string | null;
  status?: SocialActionParticipantStatus;
  attended?: boolean;
  notes?: string | null;
};

export type SocialActionFilters = {
  page?: number;
  perPage?: number;
  search?: string;
  status?: SocialActionStatus | '';
  city?: string;
};

function query(filters: Record<string, unknown>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  return params.toString();
}

export const getSocialActions = (filters: SocialActionFilters) => api<PaginatedResponse<SocialAction>>(`/social-actions${query(filters) ? `?${query(filters)}` : ''}`);
export const getSocialAction = (id: string) => api<{ data: SocialAction }>(`/social-actions/${id}`);
export const createSocialAction = (payload: SocialActionPayload) => api<{ data: SocialAction }>('/social-actions', { method: 'POST', body: JSON.stringify(payload) });
export const updateSocialAction = (id: string, payload: SocialActionPayload) => api<{ data: SocialAction }>(`/social-actions/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const completeSocialAction = (id: string, resultSummary: string) => api<{ data: SocialAction }>(`/social-actions/${id}/complete`, { method: 'PATCH', body: JSON.stringify({ resultSummary }) });
export const cancelSocialAction = (id: string) => api<{ data: SocialAction }>(`/social-actions/${id}/cancel`, { method: 'PATCH' });
export const deleteSocialAction = (id: string) => api<{ data: SocialAction }>(`/social-actions/${id}`, { method: 'DELETE' });
export const getSocialActionParticipants = (id: string) => api<{ data: SocialActionParticipant[] }>(`/social-actions/${id}/participants`);
export const addSocialActionParticipant = (id: string, payload: SocialActionParticipantPayload) => api<{ data: SocialActionParticipant }>(`/social-actions/${id}/participants`, { method: 'POST', body: JSON.stringify(payload) });
export const updateSocialActionParticipant = (id: string, participantId: string, payload: SocialActionParticipantPayload) => api<{ data: SocialActionParticipant }>(`/social-actions/${id}/participants/${participantId}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const removeSocialActionParticipant = (id: string, participantId: string) => api<{ data: SocialActionParticipant }>(`/social-actions/${id}/participants/${participantId}`, { method: 'DELETE' });
export const getVolunteerSuggestions = (filters: Record<string, unknown>) => api<PaginatedResponse<VolunteerSuggestion>>(`/social-actions/volunteers/suggestions${query(filters) ? `?${query(filters)}` : ''}`);

/**
 * Candidatos a participante DESTA ação. Autorizado por `social-actions.participants.add` — não
 * exige `legendarios.read`. Exclui quem já participa; cidade não restringe.
 * Não confundir com `getVolunteerSuggestions`, que é a curadoria por interesse/profissão.
 */
export const getSocialActionParticipantCandidateOptions = (id: string, search: string, limit = 20) => {
  const qs = query({ search: search.trim() || undefined, limit });
  return api<{ data: LegendarioOption[] }>(`/social-actions/${id}/participant-candidates/options${qs ? `?${qs}` : ''}`);
};
