import { api } from '@/lib/api';

export type InviteScope = { type: 'CITY' | 'TEAM' | 'CHURCH' | 'TOP'; value: string };

export type CreateInvitePayload = {
  email: string;
  roles: string[];
  legendaryId?: string | null;
  scopes?: InviteScope[];
};

export type CreateInviteResponse = { data: { link: string; email: string; expiresAt: string } };
export type ValidateInviteResponse = { data: { email: string } };
export type AcceptInviteResponse = { data: { id: string; email: string } };

export function createInvite(payload: CreateInvitePayload) {
  return api<CreateInviteResponse>('/auth/invites', { method: 'POST', body: JSON.stringify(payload) });
}

// Públicos: sem Authorization (auth: false).
export function validateInvite(token: string) {
  return api<ValidateInviteResponse>(`/auth/invites/${token}`, { auth: false });
}

export function acceptInvite(token: string, payload: { name: string; password: string }) {
  return api<AcceptInviteResponse>(`/auth/invites/${token}/accept`, {
    method: 'POST',
    body: JSON.stringify(payload),
    auth: false,
  });
}
