'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getUser } from '@/features/users/api';
import { UserForm } from '@/features/users/user-form';
import type { UserSummary } from '@/features/users/api';
import { useRequireAuth } from '@/hooks/use-require-auth';

export default function EditarUsuarioPage() {
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

  if (authLoading || loading) return <main className="p-6 text-sm text-zinc-600">Carregando...</main>;
  if (!user) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <Link
          href="/dashboard/usuarios"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          ← Voltar para listagem
        </Link>
        <h1 className="mt-3 text-2xl font-black tracking-wide text-white uppercase">Editar Usuário</h1>
        <p className="text-sm text-zinc-400">Atualize os dados e perfis de {user.name}.</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-[#111113] p-6 shadow-lg">
        <UserForm user={user} />
      </div>
    </div>
  );
}
