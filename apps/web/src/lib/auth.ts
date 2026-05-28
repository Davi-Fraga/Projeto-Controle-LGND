const ACCESS_TOKEN_KEY = 'accessToken';
const SESSION_MARKER_KEY = 'hasSession';

export function setAccessToken(token: string) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  window.localStorage.setItem(SESSION_MARKER_KEY, 'true');
}

export function clearAccessToken() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(SESSION_MARKER_KEY);
}

export function getAccessToken() {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function hasSessionMarker() {
  return window.localStorage.getItem(SESSION_MARKER_KEY) === 'true';
}
