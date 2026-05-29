'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { Legendary, Team } from '@central-da-manada/shared';
import { addTopTeam, getTeamsOptions, searchLegendarios, updateTopTeam } from './api';
import { PersonSelect } from './top-form';
import type { TopTeam, TopTeamPayload } from './types';

export function TopTeamForm({
  topId,
  item,
  onSaved,
  onCancel,
}: {
  topId: string;
  item?: TopTeam;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [people, setPeople] = useState<Legendary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<TopTeamPayload>({
    teamId: item?.teamId ?? '',
    coordinatorLegendaryId: item?.coordinatorLegendaryId ?? '',
    deputyCoordinatorLegendaryId: item?.deputyCoordinatorLegendaryId ?? '',
    notes: item?.notes ?? '',
  });

  useEffect(() => {
    getTeamsOptions({ page: 1, perPage: 100 })
      .then((r) => setTeams(r.data))
      .catch(() => setError('Nao foi possivel carregar equipes.'));
    searchLegendarios({ page: 1, perPage: 100, orderBy: 'fullName' })
      .then((r) => setPeople(r.data))
      .catch(() => setError('Nao foi possivel carregar Legendarios.'));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      item
        ? await updateTopTeam(topId, item.id, payload)
        : await addTopTeam(topId, payload);
      onSaved();
    } catch {
      setError('Não foi possível salvar a equipe do TOP.');
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 animate-in fade-in duration-200">
      {error && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-400">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Equipe</span>
          <select
            className="input"
            value={payload.teamId}
            disabled={Boolean(item)}
            onChange={(e) => setPayload({ ...payload, teamId: e.target.value })}
            required
          >
            <option value="">Selecione...</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Coordenador da Equipe</span>
          <PersonSelect value={payload.coordinatorLegendaryId} items={people} onChange={(v) => setPayload({ ...payload, coordinatorLegendaryId: v })} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Subcoordenador da Equipe</span>
          <PersonSelect value={payload.deputyCoordinatorLegendaryId} items={people} onChange={(v) => setPayload({ ...payload, deputyCoordinatorLegendaryId: v })} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Observações</span>
          <input className="input" placeholder="..." value={payload.notes} onChange={(e) => setPayload({ ...payload, notes: e.target.value })} />
        </label>
      </div>

      <div className="flex gap-2 pt-2 border-t border-zinc-900/60">
        <button className="flex h-9 items-center justify-center rounded-lg bg-orange-600 px-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-orange-500">
          Salvar
        </button>
        <button
          type="button"
          className="flex h-9 items-center justify-center rounded-lg border border-zinc-800 bg-transparent px-4 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          onClick={onCancel}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
