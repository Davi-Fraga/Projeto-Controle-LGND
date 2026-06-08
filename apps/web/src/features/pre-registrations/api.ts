import { api } from '@/lib/api';
import type { PaginatedResponse, TopPreRegistration } from '@central-da-manada/shared';

function query(filters: Record<string, unknown>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  return params.toString();
}

export type PendingCountEntry = {
  topEventId: string;
  count: number;
  topEvent: { id: string; name: string; number: number } | null;
};

export const getPreRegistrations = (topEventId: string, filters: Record<string, unknown> = {}) =>
  api<PaginatedResponse<TopPreRegistration>>(`/preregistrations?${query({ topEventId, ...filters })}`);

export const approvePreRegistration = (topEventId: string, id: string, payload: { legendaryId?: string; notes?: string } = {}) =>
  api<{ data: TopPreRegistration }>(`/tops/${topEventId}/pre-registrations/${id}/approve`, { method: 'POST', body: JSON.stringify(payload) });

export const rejectPreRegistration = (topEventId: string, id: string, payload: { notes?: string } = {}) =>
  api<{ data: TopPreRegistration }>(`/tops/${topEventId}/pre-registrations/${id}/reject`, { method: 'POST', body: JSON.stringify(payload) });

export const getPendingCount = () => api<{ data: PendingCountEntry[] }>(`/preregistrations/pending/count`);
