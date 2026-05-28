'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User, ShieldAlert } from 'lucide-react';
import { getCurrentUser, logout } from '@/features/auth/actions';
import type { CurrentUser } from '@/features/auth/types';

export function AppHeader() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => {
        // Redirecionamento é tratado pelo layout ou página, mas por garantia:
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

  const roleLabel = user?.roles?.includes('ADMIN') ? 'Coordenador' : 'Legendário';

  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-[#0E0E10] px-6 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="hidden text-xs font-semibold tracking-widest text-zinc-500 uppercase md:inline-block">
          SISTEMA DE GESTÃO DA MANADA
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* User Info */}
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700">
              <User className="h-4 w-4 text-zinc-300" />
            </div>
            <div className="hidden text-left md:block">
              <p className="text-xs font-semibold text-zinc-200 leading-none">{user.name}</p>
              <span className="mt-1 inline-flex items-center gap-1 rounded bg-orange-500/10 px-1.5 py-0.5 text-[9px] font-bold text-orange-500 uppercase tracking-wide">
                {roleLabel}
              </span>
            </div>
          </div>
        ) : (
          <div className="h-8 w-24 animate-pulse rounded bg-zinc-800" />
        )}

        {/* Divider */}
        <div className="h-6 w-px bg-zinc-800" />

        {/* Logout Button */}
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
