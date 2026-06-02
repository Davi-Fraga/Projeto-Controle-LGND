'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getChurches } from '@/features/churches/api';
import { ChurchForm } from '@/features/churches/church-form';
import type { Church } from '@/features/churches/api';
import { useRequireAuth } from '@/hooks/use-require-auth';

export default function EditarIgrejaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { loading: authLoading } = useRequireAuth();
  const [church, setChurch] = useState<Church | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    getChurches()
      .then((response) => {
        const found = response.data.find((c) => c.id === params.id);
        if (!found) {
          router.replace('/dashboard/igrejas');
          return;
        }
        setChurch(found);
      })
      .catch(() => router.replace('/dashboard/igrejas'))
      .finally(() => setLoading(false));
  }, [authLoading, params.id, router]);

  if (authLoading || loading) return <main className="p-6 text-sm text-zinc-600">Carregando...</main>;
  if (!church) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <Link
          href="/dashboard/igrejas"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          ← Voltar para listagem
        </Link>
        <h1 className="mt-3 text-2xl font-black tracking-wide text-white uppercase">Editar Igreja</h1>
        <p className="text-sm text-zinc-400">Atualize os dados da igreja {church.name}.</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-[#111113] p-6 shadow-lg">
        <ChurchForm church={church} />
      </div>
    </div>
  );
}
