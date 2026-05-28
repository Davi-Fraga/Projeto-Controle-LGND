const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api').replace(/\/$/, '');

type ApiOptions = RequestInit & {
  auth?: boolean;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (options.auth !== false && typeof window !== 'undefined') {
    const token = window.localStorage.getItem('accessToken');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const response = await fetch(`${API_URL}${normalizedPath}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401 && options.auth !== false && typeof window !== 'undefined' && window.localStorage.getItem('hasSession') === 'true') {
      if (normalizedPath !== '/auth/refresh') {
        try {
          const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json() as { data: { accessToken: string } };
            const newToken = refreshData.data.accessToken;
            window.localStorage.setItem('accessToken', newToken);
            window.localStorage.setItem('hasSession', 'true');

            const retryHeaders = new Headers(options.headers);
            retryHeaders.set('Content-Type', 'application/json');
            retryHeaders.set('Authorization', `Bearer ${newToken}`);

            const retryResponse = await fetch(`${API_URL}${normalizedPath}`, {
              ...options,
              headers: retryHeaders,
              credentials: 'include',
            });

            if (retryResponse.ok) {
              return retryResponse.json() as Promise<T>;
            }
          }
        } catch (refreshError) {
          console.error('Failed to auto-refresh session:', refreshError);
        }

        window.localStorage.removeItem('accessToken');
        window.localStorage.removeItem('hasSession');
      }
    }

    throw new ApiError('API request failed.', response.status);
  }

  return response.json() as Promise<T>;
}

export function getApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${normalizedPath}`;
}

export function getAuthHeaders() {
  const headers = new Headers();
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('accessToken');
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}
