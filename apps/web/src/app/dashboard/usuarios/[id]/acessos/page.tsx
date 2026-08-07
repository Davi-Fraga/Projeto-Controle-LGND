'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getUser } from '@/features/users/api';
import type { UserSummary } from '@/features/users/api';
import { AccessControlPanel } from '@/features/access-control/access-control-panel';
import { useRequireAuth } from '@/hooks/use-require-auth';

export default function ControleAcessosPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { loading: authLoading } = useRequireAuth();
  const [user, setUser] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    getUser(params.id)
      .then((response) => setUser(response.data))
      .catch(() => router.replace('/dashboard/usuarios'))
      .finally(() => setLoading(false));
  }, [authLoading, params.id, router]);

  if (authLoading || loading) return <main className="p-6 text-sm text-content-disabled">Carregando...</main>;
  if (!user) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <Link
          href="/dashboard/usuarios"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-content-muted hover:text-content-strong transition-colors"
        >
          ← Voltar para listagem
        </Link>
        <h1 className="mt-3 text-2xl font-black tracking-wide text-content-strong uppercase">Controle de Acessos</h1>
        <p className="text-sm text-content-muted">
          Ajuste fino de permissões e escopos de <span className="font-semibold text-content-strong">{user.name}</span>. Conceder/revogar reflete sem o usuário relogar.
        </p>
      </div>

      <AccessControlPanel userId={user.id} />
    </div>
  );
}
