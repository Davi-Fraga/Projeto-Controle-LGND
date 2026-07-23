'use client';

import { FormEvent, useState } from 'react';
import { TeamMembershipStatus } from '@central-da-manada/shared';
import type { TeamMembership } from '@central-da-manada/shared';
import { LegendarioCombobox } from '@/features/legendarios/legendario-combobox';
import { addTeamMember, updateTeamMember } from './api';
import type { TeamMemberPayload } from './types';

const membershipStatusLabels: Record<TeamMembershipStatus, string> = {
  [TeamMembershipStatus.ACTIVE]: 'Ativo',
  [TeamMembershipStatus.INACTIVE]: 'Inativo',
  [TeamMembershipStatus.PAUSED]: 'Pausado',
};

type Props = {
  teamId: string;
  member?: TeamMembership;
  onSaved: () => void;
  onCancel: () => void;
};

export function TeamMemberForm({ teamId, member, onSaved, onCancel }: Props) {
  const [payload, setPayload] = useState<TeamMemberPayload>({
    legendaryId: member?.legendaryId ?? '',
    role: member?.role ?? '',
    status: member?.status ?? TeamMembershipStatus.ACTIVE,
    startedAt: member?.startedAt ? member.startedAt.slice(0, 10) : '',
    endedAt: member?.endedAt ? member.endedAt.slice(0, 10) : '',
    notes: member?.notes ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function setField<T extends keyof TeamMemberPayload>(field: T, value: TeamMemberPayload[T]) {
    setPayload((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const cleaned = {
        ...payload,
        legendaryId: payload.legendaryId || undefined,
        startedAt: payload.startedAt || undefined,
        endedAt: payload.endedAt || undefined,
        notes: payload.notes || undefined,
      };
      if (member) await updateTeamMember(teamId, member.id, cleaned);
      else await addTeamMember(teamId, cleaned);
      onSaved();
    } catch {
      setError('Não foi possível salvar o membro da equipe.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
          {member ? 'Editar vínculo com a equipe' : 'Adicionar membro'}
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          {member
            ? 'Altere apenas a função, o status e o período deste vínculo.'
            : 'Selecione o Legendário e informe como ele participa desta equipe.'}
        </p>
      </div>
      {error ? (
        <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-400">
          {error}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="block text-xs font-bold uppercase tracking-wider text-zinc-400">Legendário</span>
          <LegendarioCombobox value={payload.legendaryId ?? ''} onChange={(value) => setField('legendaryId', value)} clearable={false} disabled={Boolean(member)} noneLabel="Selecione" />
        </label>
        <label className="space-y-2">
          <span className="block text-xs font-bold uppercase tracking-wider text-zinc-400">Função</span>
          <input className="input" value={payload.role} onChange={(event) => setField('role', event.target.value)} required />
        </label>
        {member ? (
          <label className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-wider text-zinc-400">Status</span>
            <select className="input" value={payload.status} onChange={(event) => setField('status', event.target.value)}>
              {Object.values(TeamMembershipStatus).map((status) => (
                <option key={status} value={status}>
                  {membershipStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="space-y-2">
          <span className="block text-xs font-bold uppercase tracking-wider text-zinc-400">Início</span>
          <input className="input" type="date" value={payload.startedAt} onChange={(event) => setField('startedAt', event.target.value)} />
        </label>
        {member ? (
          <label className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-wider text-zinc-400">Fim</span>
            <input className="input" type="date" value={payload.endedAt} onChange={(event) => setField('endedAt', event.target.value)} />
          </label>
        ) : null}
        <label className="space-y-2 md:col-span-2">
          <span className="block text-xs font-bold uppercase tracking-wider text-zinc-400">Observações</span>
          <textarea className="input min-h-24 py-2" value={payload.notes} onChange={(event) => setField('notes', event.target.value)} />
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex h-10 items-center justify-center rounded-lg bg-orange-600 px-5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500 disabled:opacity-50"
        >
          {loading ? 'Salvando...' : member ? 'Salvar vínculo' : 'Adicionar membro'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-10 items-center justify-center rounded-lg border border-zinc-800 px-5 text-xs font-bold uppercase tracking-wider text-zinc-400 transition-all hover:bg-zinc-900 hover:text-zinc-200"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
