'use client';

import { FormEvent, useEffect, useState } from 'react';
import { TeamMembershipStatus } from '@central-da-manada/shared';
import type { Legendary, TeamMembership } from '@central-da-manada/shared';
import { addTeamMember, searchLegendarios, updateTeamMember } from './api';
import type { TeamMemberPayload } from './types';

type Props = {
  teamId: string;
  member?: TeamMembership;
  onSaved: () => void;
  onCancel: () => void;
};

export function TeamMemberForm({ teamId, member, onSaved, onCancel }: Props) {
  const [legendarios, setLegendarios] = useState<Legendary[]>([]);
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

  useEffect(() => {
    searchLegendarios({ page: 1, perPage: 100, orderBy: 'fullName' })
      .then((response) => setLegendarios(response.data))
      .catch(() => setError('Nao foi possivel carregar Legendarios.'));
  }, []);

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
      setError('Nao foi possivel salvar o membro da equipe.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-md border border-border bg-white p-4">
      <h2 className="text-sm font-semibold">{member ? 'Editar membro' : 'Adicionar membro'}</h2>
      {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm font-medium">Legendario</span>
          <select className="input" value={payload.legendaryId} onChange={(event) => setField('legendaryId', event.target.value)} disabled={Boolean(member)} required>
            <option value="">Selecione</option>
            {legendarios.map((legendario) => <option key={legendario.id} value={legendario.id}>{legendario.fullName}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">Funcao</span>
          <input className="input" value={payload.role} onChange={(event) => setField('role', event.target.value)} required />
        </label>
        {member ? (
          <label>
            <span className="mb-1 block text-sm font-medium">Status</span>
            <select className="input" value={payload.status} onChange={(event) => setField('status', event.target.value)}>
              {Object.values(TeamMembershipStatus).map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
        ) : null}
        <label>
          <span className="mb-1 block text-sm font-medium">Inicio</span>
          <input className="input" type="date" value={payload.startedAt} onChange={(event) => setField('startedAt', event.target.value)} />
        </label>
        {member ? (
          <label>
            <span className="mb-1 block text-sm font-medium">Fim</span>
            <input className="input" type="date" value={payload.endedAt} onChange={(event) => setField('endedAt', event.target.value)} />
          </label>
        ) : null}
        <label className="md:col-span-2">
          <span className="mb-1 block text-sm font-medium">Observacoes</span>
          <textarea className="input min-h-24 py-2" value={payload.notes} onChange={(event) => setField('notes', event.target.value)} />
        </label>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" disabled={loading} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {loading ? 'Salvando...' : 'Salvar membro'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-border px-4 py-2 text-sm font-semibold">Cancelar</button>
      </div>
    </form>
  );
}
