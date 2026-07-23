'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getLegendario } from '@/features/legendarios/api';
import { LegendarioForm } from '@/features/legendarios/legendario-form';
import type { Legendary } from '@/features/legendarios/types';
import { useRequireAuth } from '@/hooks/use-require-auth';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function EditarLegendarioPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading: authLoading } = useRequireAuth();
  const [legendario, setLegendario] = useState<Legendary | null>(null);
  const [loading, setLoading] = useState(true);
  const fromTeamIdParam = searchParams.get('fromTeamId');
  const fromTeamId = fromTeamIdParam && UUID_PATTERN.test(fromTeamIdParam)
    ? fromTeamIdParam
    : null;
  const detailHref = `/dashboard/legendarios/${params.id}${fromTeamId ? `?fromTeamId=${fromTeamId}` : ''}`;
  const fallbackHref = fromTeamId ? `/dashboard/equipes/${fromTeamId}` : '/dashboard/legendarios';

  useEffect(() => {
    if (authLoading) return;
    getLegendario(params.id)
      .then((response) => setLegendario(response.data))
      .catch(() => router.replace(fallbackHref))
      .finally(() => setLoading(false));
  }, [authLoading, fallbackHref, params.id, router]);

  if (authLoading || loading) return <main className="p-6 text-sm text-zinc-600">Carregando...</main>;
  if (!legendario) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <Link
          href={detailHref}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          ← Voltar para detalhes
        </Link>
        <h1 className="mt-3 text-2xl font-black tracking-wide text-white uppercase">Editar Legendário</h1>
        <p className="text-sm text-zinc-400">Atualize as informações de cadastro do {legendario.fullName}.</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-[#111113] p-6 shadow-lg">
        <LegendarioForm legendario={legendario} returnTo={detailHref} />
      </div>
    </div>
  );
}
