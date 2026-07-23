import { api } from '@/lib/api';
import type { ScopeSelectionMode, ScreenAccessLevel, UserScreenAccessControl } from '@central-da-manada/shared';

export type { UserScreenAccessControl };

// Valor do tipo de escopo como string (o backend valida contra o enum UserScopeType).
export type ScopeTypeValue = 'CITY' | 'TEAM' | 'CHURCH' | 'TOP';

export type ScreenAccessResponse = { data: UserScreenAccessControl };

export function getUserScreenAccess(userId: string) {
  return api<ScreenAccessResponse>(`/access-control/users/${userId}`);
}

// O admin envia apenas tela + nível — nunca permissions cruas.
export function setScreenLevel(userId: string, screenId: string, level: ScreenAccessLevel) {
  return api<ScreenAccessResponse>(`/access-control/users/${userId}/screens/${screenId}`, {
    method: 'PUT',
    body: JSON.stringify({ level }),
  });
}

// Liga/desliga um toggle de ação de uma tela (à parte do nível VIEW/EDIT).
export function setScreenToggle(userId: string, screenId: string, toggleKey: string, on: boolean) {
  return api<ScreenAccessResponse>(`/access-control/users/${userId}/screens/${screenId}/toggles`, {
    method: 'PUT',
    body: JSON.stringify({ toggleKey, on }),
  });
}

export function addUserScope(userId: string, type: ScopeTypeValue, value: string) {
  return api<ScreenAccessResponse>(`/access-control/users/${userId}/scopes`, {
    method: 'POST',
    body: JSON.stringify({ type, value }),
  });
}

export function removeUserScope(userId: string, scopeId: string) {
  return api<ScreenAccessResponse>(`/access-control/users/${userId}/scopes/${scopeId}`, {
    method: 'DELETE',
  });
}

// Substituição ATÔMICA do escopo de um tipo (change access-scope-bulk-selection):
// mode MISSING/SELECTED/ALL num único request; values = [] em MISSING/ALL.
export function setScopeSelection(userId: string, type: ScopeTypeValue, mode: ScopeSelectionMode, values: string[]) {
  return api<ScreenAccessResponse>(`/access-control/users/${userId}/scopes/${type}`, {
    method: 'PUT',
    body: JSON.stringify({ mode, values }),
  });
}
