import { api } from '@/lib/api';
import { clearAccessToken, getAccessToken, hasSessionMarker, setAccessToken } from '@/lib/auth';
import type { AuthResponse, CurrentUser, MeResponse } from './types';

let cachedUserPromise: Promise<CurrentUser> | null = null;

export async function login(email: string, password: string) {
  const response = await api<AuthResponse>('/auth/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ email, password }),
  });

  setAccessToken(response.data.accessToken);
  cachedUserPromise = Promise.resolve(response.data.user);
  return response.data.user;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  if (!getAccessToken() && !hasSessionMarker()) {
    throw new Error('No local session.');
  }

  if (cachedUserPromise) {
    return cachedUserPromise;
  }

  cachedUserPromise = (async () => {
    try {
      const response = await api<MeResponse>('/auth/me');
      return response.data;
    } catch (error) {
      if (!hasSessionMarker()) {
        clearAccessToken();
        cachedUserPromise = null;
        throw error;
      }

      try {
        const refresh = await api<AuthResponse>('/auth/refresh', {
          method: 'POST',
          auth: false,
        });
        setAccessToken(refresh.data.accessToken);
        return refresh.data.user;
      } catch (refreshError) {
        clearAccessToken();
        cachedUserPromise = null;
        throw refreshError;
      }
    }
  })();

  return cachedUserPromise;
}

export async function logout() {
  await api('/auth/logout', { method: 'POST', auth: false }).catch(() => undefined);
  clearAccessToken();
  cachedUserPromise = null;
}
