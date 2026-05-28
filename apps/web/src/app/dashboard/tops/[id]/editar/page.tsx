'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getTop } from '@/features/tops/api';
import { TopForm } from '@/features/tops/top-form';
import type { TopEvent } from '@/features/tops/types';
import { useRequireAuth } from '@/hooks/use-require-auth';
export default function EditTopPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { loading: authLoading } = useRequireAuth();
  const [top, setTop] = useState<TopEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    getTop(params.id)
      .then((r) => setTop(r.data))
      .catch(() => router.replace('/dashboard/tops'))
      .finally(() => setLoading(false));
  }, [authLoading, params.id, router]);

  if (authLoading || loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!top) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <Link
          href={`/dashboard/tops/${top.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          ← Voltar para detalhes
        </Link>
        <h1 className="mt-3 text-2xl font-black tracking-wide text-white uppercase">Editar TOP</h1>
        <p className="text-sm text-zinc-400">Atualize as informações e datas do evento TOP #{top.number}.</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-[#111113] p-6 shadow-lg">
        <TopForm top={top} />
      </div>
    </div>
  );
}

