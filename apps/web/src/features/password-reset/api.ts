import { api } from '@/lib/api';

export type CreatePasswordResetResponse = { data: { link: string; email: string; expiresAt: string } };
export type ValidatePasswordResetResponse = { data: { email: string } };

// Admin gera o link de redefinição para um usuário.
export function createPasswordReset(userId: string) {
  return api<CreatePasswordResetResponse>('/auth/password-reset', { method: 'POST', body: JSON.stringify({ userId }) });
}

// Públicos: sem Authorization.
export function validatePasswordReset(token: string) {
  return api<ValidatePasswordResetResponse>(`/auth/password-reset/${token}`, { auth: false });
}

export function resetPassword(token: string, password: string) {
  return api<{ data: { ok: boolean } }>(`/auth/password-reset/${token}/reset`, {
    method: 'POST',
    body: JSON.stringify({ password }),
    auth: false,
  });
}
