'use client';

import { FormEvent, useState } from 'react';
import { AsyncCombobox } from '@/components/ui/AsyncCombobox';
import { LegendarioCombobox } from '@/features/legendarios/legendario-combobox';
import { addTopTeam, getTeamsOptionsList, updateTopTeam } from './api';
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
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<TopTeamPayload>({
    teamId: item?.teamId ?? '',
    coordinatorLegendaryId: item?.coordinatorLegendaryId ?? '',
    deputyCoordinatorLegendaryId: item?.deputyCoordinatorLegendaryId ?? '',
    notes: item?.notes ?? '',
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // O `<select required>` antigo era barrado pelo browser; o `AsyncCombobox` não é controle
    // nativo, então a obrigatoriedade da Equipe passa a ser checada aqui.
    if (!payload.teamId) {
      setError('Selecione a equipe.');
      return;
    }

    // Campo de dirigente em branco vira `null`, NÃO string vazia: `@IsOptional()` do
    // class-validator só ignora `null`/`undefined`, então `''` chega no `@IsUUID()` e a API
    // responde 400 ("coordinatorLegendaryId must be a UUID"). `null` também é o valor que
    // LIMPA o vínculo na edição — com `undefined` a chave sumiria do corpo e o backend
    // manteria o dirigente anterior.
    const cleaned = {
      ...payload,
      coordinatorLegendaryId: payload.coordinatorLegendaryId || null,
      deputyCoordinatorLegendaryId: payload.deputyCoordinatorLegendaryId || null,
      notes: payload.notes?.trim() || null,
    };

    try {
      item
        ? await updateTopTeam(topId, item.id, cleaned)
        : await addTopTeam(topId, cleaned);
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
          {/*
            Era um `<select>` alimentado por `GET /teams?perPage=100` — a LISTA completa, com
            objetos `Team` inteiros e gated por `teams.read`. Agora usa `/teams/options`
            (projeção mínima, autorizado também por `tops.teams.add/update`). A troca para
            `AsyncCombobox` não é cosmética: o endpoint de options tem `take` padrão 20, então
            um `<select>` truncaria a lista em silêncio.
          */}
          <AsyncCombobox
            label="Equipe"
            value={payload.teamId ?? ''}
            selectedLabel={item?.team?.name}
            onChange={(value) => setPayload({ ...payload, teamId: value })}
            fetchOptions={async (search) =>
              (await getTeamsOptionsList({ search: search.trim() || undefined, limit: 20 })).data.map((option) => ({
                value: option.value,
                label: option.label,
              }))
            }
            placeholder="Buscar equipe..."
            clearable={false}
            disabled={Boolean(item)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Coordenador da Equipe</span>
          <LegendarioCombobox label="Coordenador da Equipe" value={payload.coordinatorLegendaryId ?? ''} onChange={(v) => setPayload({ ...payload, coordinatorLegendaryId: v })} initialLabel={item?.coordinator?.fullName} noneLabel="Não definido" />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Subcoordenador da Equipe</span>
          <LegendarioCombobox label="Subcoordenador da Equipe" value={payload.deputyCoordinatorLegendaryId ?? ''} onChange={(v) => setPayload({ ...payload, deputyCoordinatorLegendaryId: v })} initialLabel={item?.deputyCoordinator?.fullName} noneLabel="Não definido" />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Observações</span>
          <input className="input" placeholder="..." value={payload.notes ?? ''} onChange={(e) => setPayload({ ...payload, notes: e.target.value })} />
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
