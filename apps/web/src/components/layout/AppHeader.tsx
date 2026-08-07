'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User } from 'lucide-react';
import { getCurrentUser, logout } from '@/features/auth/actions';
import { hasRole } from '@/lib/permissions';
import type { CurrentUser } from '@/features/auth/types';
import { Button } from '@/components/ui/Button';

function getRoleLabel(user: CurrentUser | null): string {
  if (!user) return '';
  if (hasRole(user, 'COORDINATION_ADMIN', 'COORDINATION_USER')) return 'Coordenador';
  if (hasRole(user, 'TEAM_COORDINATOR')) return 'Coord. de Equipe';
  if (hasRole(user, 'SPIRITUAL_LEADER')) return 'Líder Espiritual';
  if (hasRole(user, 'TOP_REPRESENTATIVE', 'TOP_DEPUTY_REPRESENTATIVE')) return 'Representante';
  if (hasRole(user, 'FAMILY_REPRESENTATIVE', 'FAMILY_DEPUTY_REPRESENTATIVE')) return 'Rep. de Família';
  if (hasRole(user, 'MEMBER')) return 'Membro';
  return 'Legendário';
}

export function AppHeader() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => {
        router.replace('/login');
      });
  }, [router]);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      router.replace('/login');
    }
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-canvas px-4 sm:px-6">
      <span className="hidden text-xs font-semibold uppercase tracking-widest text-content-muted md:inline-block">
        Sistema de Gestão da Manada
      </span>

      <div className="ml-auto flex items-center gap-3 sm:gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-line-strong bg-surface-raised">
              <User className="h-4 w-4 text-content" aria-hidden="true" />
            </div>
            <div className="hidden text-left md:block">
              <p className="text-xs font-semibold leading-none text-content-strong">{user.name}</p>
              <span className="mt-1 inline-flex items-center gap-1 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                {getRoleLabel(user)}
              </span>
            </div>
          </div>
        ) : (
          <div className="h-8 w-24 animate-pulse rounded bg-surface-raised" aria-label="Carregando usuário" role="status" />
        )}

        <div className="h-6 w-px bg-line" aria-hidden="true" />

        {/* `size="md"` e não "sm": o sm é min-h-9 (36px) e no mobile este botão fica só com o
            ícone, resultando num alvo de 42x36 — abaixo dos 44px que a task 6.4 fixou. */}
        <Button
          onClick={handleLogout}
          variant="ghost"
          size="md"
          className="border-line"
          title="Sair do sistema"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Sair</span>
          <span className="sr-only sm:hidden">Sair do sistema</span>
        </Button>
      </div>
    </header>
  );
}
