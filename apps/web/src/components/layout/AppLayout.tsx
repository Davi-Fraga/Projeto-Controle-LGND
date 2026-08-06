'use client';

import { type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { EffectiveScreenAccessState, PRIMARY_NAV, firstAllowedRoute } from '@central-da-manada/shared';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { Button } from '@/components/ui/Button';
import { Sidebar } from './Sidebar';
import { AppHeader } from './AppHeader';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, loading } = useRequireAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-content-muted">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden="true" />
          <p className="type-label" role="status">
            Carregando Manada...
          </p>
        </div>
      </div>
    );
  }

  const item = PRIMARY_NAV.find(
    (entry) => pathname === entry.href || (entry.href !== '/dashboard' && pathname?.startsWith(`${entry.href}/`)),
  );

  if (item?.rule.kind === 'permissions') {
    const access = user?.screenAccess?.find((entry) => entry.screenId === item.screenId);
    if (!access?.usable) {
      const destination = firstAllowedRoute(user);
      const missingScope = access?.state === EffectiveScreenAccessState.MISSING_SCOPE;

      return (
        <div className="flex min-h-screen items-center justify-center bg-canvas px-page text-center text-content-strong">
          <div className="max-w-md">
            <h1 className="type-section-title uppercase">
              {missingScope ? 'Acesso ainda não efetivo' : 'Você não possui acesso'}
            </h1>
            <p className="type-body mt-2 text-content-muted">
              {missingScope
                ? 'Seu acesso foi concedido, mas ainda falta configurar um escopo válido.'
                : 'Sua conta não possui a permissão necessária para esta tela.'}
            </p>
            {destination && destination !== item.href ? (
              <Button variant="primary" className="mt-5" onClick={() => router.replace(destination)}>
                Ir para uma tela disponível
              </Button>
            ) : null}
          </div>
        </div>
      );
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-content-strong md:flex-row">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-x-hidden overflow-y-auto px-page py-page">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
