'use client';

import type { ReactNode } from 'react';
import { can, type CanInput } from '@/lib/permissions';
import type { CurrentUser } from '@/features/auth/types';

type Props = {
  user: CurrentUser | null | undefined;
  /** Regra a satisfazer. String = AND de um; use `{ anyOf }` para espelhar `@AnyPermissions`. */
  rule: CanInput;
  children: ReactNode;
  /** Alternativa quando a regra não é satisfeita. Por padrão nada é renderizado. */
  fallback?: ReactNode;
};

/**
 * Renderização condicional por permission, para os casos em que a checagem envolve um bloco
 * de JSX e um `&&` deixaria a leitura ruim. Para montar arrays (itens de `ActionMenu`),
 * prefira `useCan` — o menu precisa saber quantos itens sobraram para não renderizar vazio.
 *
 * Controles proibidos são ESCONDIDOS, não desabilitados: um botão desabilitado sugere uma
 * capacidade que o usuário não tem.
 */
export function Can({ user, rule, children, fallback = null }: Props) {
  return <>{can(user, rule) ? children : fallback}</>;
}
