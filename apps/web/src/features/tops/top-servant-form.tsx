'use client';

import { FormEvent, useEffect, useState } from 'react';
import { TopServantStatus, type Legendary } from '@central-da-manada/shared';
import { addTopServant, getTopTeams, searchLegendarios, updateTopServant } from './api';
import { PersonSelect } from './top-form';
import type { TopServant, TopServantPayload, TopTeam } from './types';

export function TopServantForm({
  topId,
  item,
  onSaved,
  onCancel,
}: {
  topId: string;
  item?: TopServant;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [people, setPeople] = useState<Legendary[]>([]);
  const [teams, setTeams] = useState<TopTeam[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<TopServantPayload>({
    legendaryId: item?.legendaryId ?? '',
    teamId: item?.teamId ?? '',
    role: item?.role ?? '',
    status: item?.status ?? TopServantStatus.REGISTERED,
    notes: item?.notes ?? '',
  });

  useEffect(() => {
    searchLegendarios({ page: 1, perPage: 100, orderBy: 'fullName' })
      .then((r) => setPeople(r.data))
      .catch(() => setError('Nao foi possivel carregar Legendarios.'));
    getTopTeams(topId)
      .then((r) => setTeams(r.data))
      .catch(() => setError('Nao foi possivel carregar equipes do TOP.'));
  }, [topId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const cleaned = {
        ...payload,
        teamId: payload.teamId || undefined,
        role: payload.role || undefined,
        notes: payload.notes || undefined,
      };
      item
        ? await updateTopServant(topId, item.id, cleaned)
        : await addTopServant(topId, cleaned);
      onSaved();
    } catch {
      setError('Não foi possível salvar servo.');
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 animate-in fade-in duration-200">
      {error && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-400">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
        <label className="block space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Legendário</span>
          <PersonSelect value={payload.legendaryId} items={people} onChange={(v) => setPayload({ ...payload, legendaryId: v })} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Equipe de Serviço</span>
          <select className="input" value={payload.teamId} onChange={(e) => setPayload({ ...payload, teamId: e.target.value })}>
            <option value="">Sem equipe</option>
            {teams.map((t) => (
              <option key={t.id} value={t.teamId}>
                {t.team?.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Função</span>
          <input className="input" placeholder="Ex: Apoio, Cozinheiro" value={payload.role} onChange={(e) => setPayload({ ...payload, role: e.target.value })} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Status</span>
          <select className="input" value={payload.status} onChange={(e) => setPayload({ ...payload, status: e.target.value as TopServantStatus })}>
            {Object.values(TopServantStatus).map((v) => (
              <option key={v} value={v}>
                {v === 'REGISTERED' ? 'Inscrito' : v === 'CONFIRMED' ? 'Confirmado' : v === 'CANCELLED' ? 'Cancelado' : v === 'COMPLETED' ? 'Concluído' : v}
              </option>
            ))}
          </select>
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
