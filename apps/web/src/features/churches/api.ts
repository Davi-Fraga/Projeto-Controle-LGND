import { api } from '@/lib/api';
import type { Church } from '@central-da-manada/shared';

export type { Church };

export type ChurchesResponse = { data: Church[] };
export type ChurchResponse = { data: Church };

export type ChurchPayload = {
  name: string;
  city?: string | null;
  spiritualLeaderName?: string | null;
  spiritualLeaderPhone?: string | null;
  spiritualLeaderUserId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
};

export function getChurches() {
  return api<ChurchesResponse>('/churches');
}

export function createChurch(payload: ChurchPayload) {
  return api<ChurchResponse>('/churches', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateChurch(id: string, payload: ChurchPayload) {
  return api<ChurchResponse>(`/churches/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}
