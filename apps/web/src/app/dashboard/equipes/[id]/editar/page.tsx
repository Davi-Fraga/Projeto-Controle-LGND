'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getTeam } from '@/features/teams/api';
import { TeamForm } from '@/features/teams/team-form';
import type { Team } from '@/features/teams/types';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { formatTeamName } from '@/lib/teams';

export default function EditTeamPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { loading: authLoading } = useRequireAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    getTeam(params.id)
      .then((response) => setTeam(response.data))
      .catch(() => router.replace('/dashboard/equipes'))
      .finally(() => setLoading(false));
  }, [authLoading, params.id, router]);

  if (authLoading || loading) return <main className="p-6 text-sm text-zinc-600">Carregando...</main>;
  if (!team) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <Link
          href={`/dashboard/equipes/${team.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          ← Voltar para detalhes
        </Link>
        <h1 className="mt-3 text-2xl font-black tracking-wide text-white uppercase">Editar Equipe</h1>
        <p className="text-sm text-zinc-400">Atualize os detalhes da equipe {formatTeamName(team.name)}.</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-[#111113] p-6 shadow-lg">
        <TeamForm team={team} />
      </div>
    </div>
  );
}

