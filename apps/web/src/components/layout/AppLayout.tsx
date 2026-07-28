'use client';

import { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { AppHeader } from './AppHeader';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { EffectiveScreenAccessState, PRIMARY_NAV, firstAllowedRoute } from '@central-da-manada/shared';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, loading } = useRequireAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0B0B] text-sm text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <p className="font-medium tracking-wide uppercase text-xs text-zinc-500">
            Carregando Manada...
          </p>
        </div>
      </div>
    );
  }

  const item = PRIMARY_NAV.find((entry) => pathname === entry.href || (entry.href !== '/dashboard' && pathname?.startsWith(`${entry.href}/`)));
  if (item?.rule.kind === 'permissions') {
    const access = user?.screenAccess?.find((entry) => entry.screenId === item.screenId);
    if (!access?.usable) {
      const destination = firstAllowedRoute(user);
      const missingScope = access?.state === EffectiveScreenAccessState.MISSING_SCOPE;
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#0E0E10] px-6 text-center text-zinc-100">
          <div className="max-w-md">
            <h1 className="text-lg font-black uppercase tracking-wide">{missingScope ? 'Acesso ainda não efetivo' : 'Você não possui acesso'}</h1>
            <p className="mt-2 text-sm text-zinc-400">{missingScope ? 'Seu acesso foi concedido, mas ainda falta configurar um escopo válido.' : 'Sua conta não possui a permissão necessária para esta tela.'}</p>
            {destination && destination !== item.href && <button onClick={() => router.replace(destination)} className="mt-5 rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white">Ir para uma tela disponível</button>}
          </div>
        </div>
      );
    }
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-[#0E0E10] text-zinc-100">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main content wrapper */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* App Header */}
        <AppHeader />

        {/* Dynamic page content */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
