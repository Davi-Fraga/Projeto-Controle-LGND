'use client';

import { FormEvent, useMemo, useState } from 'react';
import { TopParticipantStatus, TopParticipantType } from '@central-da-manada/shared';
import { contextualLegendarioSource, LegendarioCombobox } from '@/features/legendarios/legendario-combobox';
import { addTopParticipant, getTopParticipantCandidateOptions, updateTopParticipant } from './api';
import type { TopParticipant, TopParticipantPayload } from './types';

export function TopParticipantForm({
  topId,
  item,
  onSaved,
  onCancel,
}: {
  topId: string;
  item?: TopParticipant;
  onSaved: () => void;
  onCancel: () => void;
}) {
  // Busca contextual: `tops.participants.add` basta; a tela de Legendários não é exigida.
  const fetchCandidates = useMemo(
    () => contextualLegendarioSource((search, limit) => getTopParticipantCandidateOptions(topId, search, limit)),
    [topId],
  );
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<TopParticipantPayload>({
    legendaryId: item?.legendaryId ?? '',
    type: item?.type ?? TopParticipantType.NEW_PARTICIPANT,
    status: item?.status ?? TopParticipantStatus.REGISTERED,
    notes: item?.notes ?? '',
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      item
        ? await updateTopParticipant(topId, item.id, payload)
        : await addTopParticipant(topId, payload);
      onSaved();
    } catch {
      setError('Não foi possível salvar participante.');
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 animate-in fade-in duration-200">
      {error && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-400">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <label className="block space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Legendário</span>
          <LegendarioCombobox label="Legendário" value={payload.legendaryId ?? ''} onChange={(v) => setPayload({ ...payload, legendaryId: v })} fetchOptions={fetchCandidates} initialLabel={item?.legendary?.fullName} clearable={false} noneLabel="Selecione..." />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Tipo de Participação</span>
          <select className="input" value={payload.type} onChange={(e) => setPayload({ ...payload, type: e.target.value as TopParticipantType })}>
            {Object.values(TopParticipantType).map((v) => (
              <option key={v} value={v}>
                {v === 'NEW_PARTICIPANT' ? 'Novo Participante' : v === 'LEGENDARY' ? 'Legendário' : v}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Status</span>
          <select className="input" value={payload.status} onChange={(e) => setPayload({ ...payload, status: e.target.value as TopParticipantStatus })}>
            {Object.values(TopParticipantStatus).map((v) => (
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
