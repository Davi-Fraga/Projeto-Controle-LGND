'use client';

import { useCallback } from 'react';
import { can, type CanInput } from '@/lib/permissions';
import type { CurrentUser } from '@/features/auth/types';

/**
 * Autorização visual por permission efetiva (change acoes-web-e-seletores-contextuais).
 *
 * Recebe o `CurrentUser` que a página já obteve por `useRequireAuth` — o hook não busca
 * sessão para não multiplicar requisições nem divergir do estado da tela.
 *
 * ```tsx
 * const { user } = useRequireAuth();
 * const canDo = useCan(user);
 *
 * canDo('teams.update');                                            // AND de um
 * canDo({ anyOf: ['legendarios.update', 'organogram.person.edit'] }); // espelha @AnyPermissions
 * ```
 *
 * Esconder um controle é usabilidade, não segurança: a API continua negando por conta própria.
 */
export function useCan(user: CurrentUser | null | undefined) {
  return useCallback((input: CanInput) => can(user, input), [user]);
}
