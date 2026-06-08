'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getTop } from '@/features/tops/api';
import { TopFamiliesSection } from '@/features/tops/top-families-section';
import { TopParticipantsTable } from '@/features/tops/top-participants-table';
import { TopServantsTable } from '@/features/tops/top-servants-table';
import { TopTeamsTable } from '@/features/tops/top-teams-table';
import type { TopEvent } from '@/features/tops/types';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default function TopDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { loading: authLoading } = useRequireAuth();
  const [top, setTop] = useState<TopEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    getTop(params.id)
      .then((response) => setTop(response.data))
      .catch(() => router.replace('/dashboard/tops'))
      .finally(() => setLoading(false));
  }, [authLoading, params.id, router]);

  if (authLoading || loading) return <main className="p-6 text-sm text-zinc-600">Carregando...</main>;
  if (!top) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Bar / Navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/dashboard/tops"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            ← Voltar para listagem
          </Link>
          <h1 className="mt-3 text-2xl font-black tracking-wide text-white uppercase">TOP #{top.number} - {top.name}</h1>
          <p className="text-sm font-semibold text-zinc-400 mt-1">
            {top.city} | Período: {new Date(top.startDate).toLocaleDateString('pt-BR')} a {new Date(top.endDate).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/tops/${top.id}/pre-inscricoes`}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 px-5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition-all hover:bg-zinc-800 hover:text-zinc-100 text-center"
          >
            Pré-inscrições
          </Link>
          <Link
            href={`/dashboard/tops/${top.id}/editar`}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-orange-600 px-5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500 text-center"
          >
            Editar TOP
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Info label="Status" value={<StatusBadge status={top.status} />} />
        <Info label="Representante" value={top.representative?.fullName ?? '-'} />
        <Info label="Sub-representante" value={top.deputyRepresentative?.fullName ?? '-'} />
        <Info label="Coordenador Geral" value={top.generalCoordinator?.fullName ?? '-'} />
        <Info label="Coord. Famílias" value={top.familyCoordinator?.fullName ?? '-'} />
        <Info label="Subcoord. Famílias" value={top.familyDeputyCoordinator?.fullName ?? '-'} />
        <Info label="Coord. Geral Famílias" value={top.familyGeneralCoordinator?.fullName ?? '-'} />
        <Info label="Revisão" value={top.needsReview ? <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-300">Revisar</span> : 'Sem pendência'} />
      </div>

      {/* Child sections & tables */}
      <div className="mt-8 space-y-8">
        <div className="rounded-xl border border-zinc-800 bg-[#111113] p-5 shadow-lg">
          <TopTeamsTable topId={top.id} />
        </div>
        <div className="rounded-xl border border-zinc-800 bg-[#111113] p-5 shadow-lg">
          <TopParticipantsTable topId={top.id} />
        </div>
        <div className="rounded-xl border border-zinc-800 bg-[#111113] p-5 shadow-lg">
          <TopServantsTable topId={top.id} />
        </div>
        <div className="rounded-xl border border-zinc-800 bg-[#111113] p-5 shadow-lg">
          <TopFamiliesSection topId={top.id} />
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-[#111113] p-5 shadow-lg">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</p>
      <div className="mt-2 text-sm font-bold text-zinc-200">{value}</div>
    </section>
  );
}
