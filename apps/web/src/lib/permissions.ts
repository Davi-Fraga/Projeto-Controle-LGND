import type { CurrentUser } from '@/features/auth/types';

export function hasRole(user: CurrentUser | null | undefined, ...roles: string[]): boolean {
  return roles.some((r) => user?.roles?.includes(r));
}

export function hasPermission(user: CurrentUser | null | undefined, ...permissions: string[]): boolean {
  return permissions.some((p) => user?.permissions?.includes(p));
}
