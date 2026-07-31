import { satisfiesPermissionRule, type PermissionRule } from '@central-da-manada/shared';
import type { CurrentUser } from '@/features/auth/types';

export function hasRole(user: CurrentUser | null | undefined, ...roles: string[]): boolean {
  return roles.some((r) => user?.roles?.includes(r));
}

/**
 * @deprecated Semântica OR implícita. Prefira `can`/`useCan`, que obrigam a declarar
 * `allOf` ou `anyOf` — a ambiguidade aqui é a causa de gate visual mais restrito ou mais
 * frouxo que a API. Mantida durante a migração dos consumidores existentes.
 */
export function hasPermission(user: CurrentUser | null | undefined, ...permissions: string[]): boolean {
  return can(user, { anyOf: permissions });
}

/**
 * Entrada de uma checagem de autorização visual.
 *
 * - `'teams.update'` — atalho para exigir exatamente essa permission.
 * - `{ allOf: [...] }` — espelha `@Permissions` do backend (AND).
 * - `{ anyOf: [...] }` — espelha `@AnyPermissions` do backend (OR).
 *
 * A forma usada DEVE espelhar o decorator da rota correspondente. Exigir AND onde a API
 * aceita OR esconde ação legítima (é o caso de `PATCH /legendarios/:id`, que aceita
 * `legendarios.update` **ou** `organogram.person.edit`).
 */
export type CanInput = string | { allOf: string[] } | { anyOf: string[] };

function toRule(input: CanInput): PermissionRule {
  if (typeof input === 'string') return { mode: 'allOf', keys: [input] };
  return 'allOf' in input ? { mode: 'allOf', keys: input.allOf } : { mode: 'anyOf', keys: input.anyOf };
}

/**
 * Avalia uma regra contra as permissions efetivas do usuário, reusando o avaliador
 * canônico de `@central-da-manada/shared` — o mesmo que decide a navegação.
 *
 * NÃO é barreira de segurança: esconder um controle é usabilidade. O backend continua
 * respondendo 403/404, e o escopo continua no `AccessPolicyService`.
 *
 * Sem usuário (sessão ainda carregando ou expirada) → `false`, fail-closed.
 */
export function can(user: CurrentUser | null | undefined, input: CanInput): boolean {
  if (!user) return false;
  return satisfiesPermissionRule(user.permissions, toRule(input));
}
