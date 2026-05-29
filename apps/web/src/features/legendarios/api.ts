import { api } from '@/lib/api';
import type {
  Church,
  Expertise,
  LegendarioPayload,
  LegendarioResponse,
  LegendariosResponse,
  LegendaryFilters,
  LegendaryHistoryResponse,
  OptionResponse,
  Profession,
  ChurchPayload,
} from './types';

function buildQuery(filters: LegendaryFilters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });

  return params.toString();
}

export function getLegendarios(filters: LegendaryFilters) {
  const query = buildQuery(filters);
  return api<LegendariosResponse>(`/legendarios${query ? `?${query}` : ''}`);
}

export function getLegendario(id: string) {
  return api<LegendarioResponse>(`/legendarios/${id}`);
}

export function getLegendarioHistory(id: string, type?: string) {
  return api<LegendaryHistoryResponse>(`/legendarios/${id}/history${type ? `?type=${type}` : ''}`);
}

export function addLegendarioHistoryNote(id: string, payload: { title: string; description?: string }) {
  return api('/legendarios/' + id + '/history', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createLegendario(payload: LegendarioPayload) {
  return api<LegendarioResponse>('/legendarios', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateLegendario(id: string, payload: LegendarioPayload) {
  return api<LegendarioResponse>(`/legendarios/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deactivateLegendario(id: string) {
  return api<LegendarioResponse>(`/legendarios/${id}/deactivate`, {
    method: 'PATCH',
  });
}

export function getChurches() {
  return api<OptionResponse<Church>>('/churches');
}

export function createChurch(payload: ChurchPayload) {
  return api<{ data: Church }>('/churches', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getProfessions() {
  return api<OptionResponse<Profession>>('/professions');
}

export function getExpertises() {
  return api<OptionResponse<Expertise>>('/expertises');
}
