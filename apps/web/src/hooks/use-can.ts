'use client';

import { useCallback } from 'react';
import { canOpenRoute } from '@central-da-manada/shared';
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

/**
 * Autorização de LINK CRUZADO: o usuário consegue abrir a tela de destino?
 *
 * Um link para outro domínio não é governado pela permission da tela de origem. Estar em
 * Líderes Espirituais não dá direito ao detalhe do Legendário; ver a Equipe não dá direito ao
 * perfil do membro. Delega ao manifesto de navegação — a MESMA regra que decide a aba lateral,
 * incluindo escopo utilizável — para o link não sobreviver a uma mudança na regra da tela.
 *
 * ```tsx
 * const canOpen = useCanOpenRoute(user);
 * {canOpen(`/dashboard/legendarios/${id}`) ? <Link .../> : <span>{nome}</span>}
 * ```
 */
export function useCanOpenRoute(user: CurrentUser | null | undefined) {
  return useCallback((href: string) => canOpenRoute(user ?? null, href), [user]);
}
