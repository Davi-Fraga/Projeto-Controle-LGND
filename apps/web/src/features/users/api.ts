import { api } from '@/lib/api';
import type { PaginatedResponse } from '@central-da-manada/shared';

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  legendaryId?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  roles: string[];
  permissions: string[];
  createdAt: string;
  updatedAt: string;
};

export type UsersResponse = PaginatedResponse<UserSummary>;
export type UserResponse = { data: UserSummary };

// Edição administrativa NÃO inclui senha (o admin nunca define senha de terceiros).
// Criação de conta é só por convite.
export type UpdateUserPayload = {
  name?: string;
  email?: string;
  legendaryId?: string | null;
  roles?: string[];
};

function buildQuery(filters: Record<string, unknown>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  return params.toString();
}

export function getUsers(filters: Record<string, unknown> = { perPage: 200 }) {
  const query = buildQuery(filters);
  return api<UsersResponse>(`/users${query ? `?${query}` : ''}`);
}

export function getUser(id: string) {
  return api<UserResponse>(`/users/${id}`);
}

export function updateUser(id: string, payload: UpdateUserPayload) {
  return api<UserResponse>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function deactivateUser(id: string) {
  return api<UserResponse>(`/users/${id}/deactivate`, { method: 'PATCH' });
}
