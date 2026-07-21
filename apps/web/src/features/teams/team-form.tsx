'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TeamStatus } from '@central-da-manada/shared';
import { createTeam, searchLegendarios, updateTeam } from './api';
import type { Team, TeamPayload } from './types';
import type { Legendary } from '@central-da-manada/shared';

type Props = { team?: Team };

export function TeamForm({ team }: Props) {
  const router = useRouter();
  const [legendarios, setLegendarios] = useState<Legendary[]>([]);
  const [payload, setPayload] = useState<TeamPayload>({
    name: team?.name ?? '',
    description: team?.description ?? '',
    status: team?.status ?? TeamStatus.ACTIVE,
    coordinatorLegendaryId: team?.coordinatorLegendaryId ?? '',
    deputyCoordinatorLegendaryId: team?.deputyCoordinatorLegendaryId ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    searchLegendarios({ page: 1, perPage: 100, orderBy: 'fullName' })
      .then((response) => setLegendarios(response.data))
      .catch(() => setError('Não foi possível carregar Legendérios.'));
  }, []);

  function setField<T extends keyof TeamPayload>(field: T, value: TeamPayload[T]) {
    setPayload((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const cleaned = {
        ...payload,
        description: payload.description || undefined,
        coordinatorLegendaryId: payload.coordinatorLegendaryId || undefined,
        deputyCoordinatorLegendaryId: payload.deputyCoordinatorLegendaryId || undefined,
      };
      const response = team ? await updateTeam(team.id, cleaned) : await createTeam(cleaned);
      router.push(`/dashboard/equipes/${response.data.id}`);
    } catch {
      setError('Não foi possível salvar a equipe. Verifique os dados informados.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-400">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 rounded-xl border border-zinc-800 bg-zinc-900/10 p-5 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Nome da Equipe</span>
          <input className="input" value={payload.name} onChange={(event) => setField('name', event.target.value)} required />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Status</span>
          <select className="input" value={payload.status} onChange={(event) => setField('status', event.target.value)}>
            {Object.values(TeamStatus).map((status) => (
              <option key={status} value={status}>
                {status === 'ACTIVE' ? 'Ativa' : status === 'INACTIVE' ? 'Inativa' : status}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Coordenador</span>
          <select className="input" value={payload.coordinatorLegendaryId} onChange={(event) => setField('coordinatorLegendaryId', event.target.value)}>
            <option value="">Não definido</option>
            {legendarios.map((legendario) => <option key={legendario.id} value={legendario.id}>{legendario.fullName}</option>)}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Subcoordenador</span>
          <select className="input" value={payload.deputyCoordinatorLegendaryId} onChange={(event) => setField('deputyCoordinatorLegendaryId', event.target.value)}>
            <option value="">Não definido</option>
            {legendarios.map((legendario) => <option key={legendario.id} value={legendario.id}>{legendario.fullName}</option>)}
          </select>
        </label>
        <label className="md:col-span-2 block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Descrição</span>
          <textarea className="input min-h-28 py-2.5" value={payload.description} onChange={(event) => setField('description', event.target.value)} />
        </label>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex h-10 items-center justify-center rounded-lg bg-orange-600 px-6 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500 disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Salvar Equipe'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 items-center justify-center rounded-lg border border-zinc-800 bg-transparent px-6 text-xs font-bold uppercase tracking-wider text-zinc-400 transition-all hover:bg-zinc-900 hover:text-zinc-200"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
