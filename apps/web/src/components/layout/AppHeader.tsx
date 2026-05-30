'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User } from 'lucide-react';
import { getCurrentUser, logout } from '@/features/auth/actions';
import { hasRole } from '@/lib/permissions';
import type { CurrentUser } from '@/features/auth/types';

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
    <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-[#0E0E10] px-6 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="hidden text-xs font-semibold tracking-widest text-zinc-500 uppercase md:inline-block">
          SISTEMA DE GESTÃO DA MANADA
        </span>
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700">
              <User className="h-4 w-4 text-zinc-300" />
            </div>
            <div className="hidden text-left md:block">
              <p className="text-xs font-semibold text-zinc-200 leading-none">{user.name}</p>
              <span className="mt-1 inline-flex items-center gap-1 rounded bg-orange-500/10 px-1.5 py-0.5 text-[9px] font-bold text-orange-500 uppercase tracking-wide">
                {getRoleLabel(user)}
              </span>
            </div>
          </div>
        ) : (
          <div className="h-8 w-24 animate-pulse rounded bg-zinc-800" />
        )}

        <div className="h-6 w-px bg-zinc-800" />

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg bg-transparent px-3 py-1.5 text-xs font-medium text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100 transition-all duration-200"
          title="Sair do sistema"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
}
