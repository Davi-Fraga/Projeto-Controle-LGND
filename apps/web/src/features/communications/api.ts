import { api } from '@/lib/api';
import type { InternalMessage, InternalMessageStatus, InternalMessageTargetType, MessageRecipient, PaginatedResponse } from '@central-da-manada/shared';

export type CommunicationPayload = {
  title: string;
  body: string;
  targetType: InternalMessageTargetType;
  targetId?: string | null;
  topEventId?: string | null;
  requiresConfirmation: boolean;
};

export type CommunicationFilters = {
  page?: number;
  perPage?: number;
  search?: string;
  status?: InternalMessageStatus | '';
};

function query(filters: Record<string, unknown>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  return params.toString();
}

export const getCommunications = (filters: CommunicationFilters) => api<PaginatedResponse<InternalMessage>>(`/communications${query(filters) ? `?${query(filters)}` : ''}`);
export const getCommunication = (id: string) => api<{ data: InternalMessage }>(`/communications/${id}`);
export const createCommunication = (payload: CommunicationPayload) => api<{ data: InternalMessage }>('/communications', { method: 'POST', body: JSON.stringify(clean(payload)) });
export const updateCommunication = (id: string, payload: CommunicationPayload) => api<{ data: InternalMessage }>(`/communications/${id}`, { method: 'PATCH', body: JSON.stringify(clean(payload)) });
export const sendCommunication = (id: string) => api<{ data: InternalMessage }>(`/communications/${id}/send`, { method: 'POST' });
export const cancelCommunication = (id: string) => api<{ data: InternalMessage }>(`/communications/${id}/cancel`, { method: 'PATCH' });
export const deleteCommunication = (id: string) => api<{ data: InternalMessage }>(`/communications/${id}`, { method: 'DELETE' });
export const getRecipients = (id: string) => api<{ data: MessageRecipient[] }>(`/communications/${id}/recipients`);
export const markRecipientRead = (messageId: string, recipientId: string) => api<{ data: MessageRecipient }>(`/communications/${messageId}/recipients/${recipientId}/read`, { method: 'PATCH' });
export const confirmRecipient = (messageId: string, recipientId: string) => api<{ data: MessageRecipient }>(`/communications/${messageId}/recipients/${recipientId}/confirm`, { method: 'PATCH' });

function clean(payload: CommunicationPayload) {
  return { ...payload, targetId: payload.targetId || null, topEventId: payload.topEventId || null };
}
