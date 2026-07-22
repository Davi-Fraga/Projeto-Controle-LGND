'use client';

/**
 * Histórico de serviço (TopServant) do Legendário, gerido no perfil. Lê a coleção
 * completa `topServants` (sem `[0]`) e faz inclusão/edição/cancelamento pelos endpoints
 * canônicos de TOP (`POST/PATCH/cancel /tops/:topId/servants`). Cada item é mutado de
 * forma independente; as validações de negócio (equipe vinculada, um serviço ativo por
 * TOP, exclusão mútua com participante) permanecem no backend. Controles de mutação só
 * aparecem conforme as permissões `tops.servants.add/update/remove`.
 */

import { useEffect, useState } from 'react';
import type { TopServant } from '@central-da-manada/shared';
import { HeartHandshake } from 'lucide-react';
import { AsyncCombobox, type ComboboxOption } from '@/components/ui/AsyncCombobox';
import { addTopServant, cancelTopServant, getTopOptions, getTopTeams, updateTopServant } from '@/features/tops/api';
import { ApiError } from '@/lib/api';

type Perms = { add: boolean; update: boolean; remove: boolean };
type TeamOption = { id: string; label: string };

type Props = {
  legendarioId: string;
  servants: TopServant[];
  permissions: Perms;
  onChanged: () => Promise<void> | void;
};

async function fetchTopOptions(search: string): Promise<ComboboxOption[]> {
  const response = await getTopOptions({ search, limit: 20 });
  return response.data.map((option) => ({ value: option.value, label: option.label }));
}

function toTeamOptions(data: any[]): TeamOption[] {
  return data
    .map((item) => ({ id: (item.teamId ?? item.team?.id) as string, label: (item.team?.name ?? 'Equipe') as string }))
    .filter((item) => Boolean(item.id));
}

function mutationError(error: unknown): string {
  if (error instanceof ApiError && (error.status === 400 || error.status === 409)) {
    return 'Não foi possível salvar o serviço: o Legendário pode já ser participante/servo deste TOP ou a equipe não pertence ao TOP.';
  }
  if (error instanceof ApiError && error.status === 403) {
    return 'Você não tem permissão para alterar o serviço deste TOP.';
  }
  return 'Não foi possível salvar o serviço. Tente novamente.';
}

export function LegendarioServiceSection({ legendarioId, servants, permissions, onChanged }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Formulário de inclusão.
  const [topId, setTopId] = useState('');
  const [topLabel, setTopLabel] = useState('');
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [teamId, setTeamId] = useState('');
  const [role, setRole] = useState('');
  const [notes, setNotes] = useState('');

  // Edição inline (um item por vez).
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTeams, setEditTeams] = useState<TeamOption[]>([]);
  const [editTeamId, setEditTeamId] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Carrega as equipes do TOP escolhido no formulário de inclusão.
  useEffect(() => {
    if (!topId) {
      setTeams([]);
      setTeamId('');
      return;
    }
    let active = true;
    getTopTeams(topId)
      .then((response) => active && setTeams(toTeamOptions(response.data as any[])))
      .catch(() => active && setTeams([]));
    return () => {
      active = false;
    };
  }, [topId]);

  async function submitAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!topId) return;
    setBusy(true);
    try {
      setError(null);
      await addTopServant(topId, { legendaryId: legendarioId, teamId: teamId || undefined, role: role.trim() || undefined, notes: notes.trim() || undefined });
      setTopId('');
      setTopLabel('');
      setTeamId('');
      setRole('');
      setNotes('');
      await onChanged();
    } catch (err) {
      setError(mutationError(err));
    } finally {
      setBusy(false);
    }
  }

  function startEdit(servant: TopServant) {
    setEditingId(servant.id);
    setEditRole(servant.role ?? '');
    setEditNotes(servant.notes ?? '');
    setEditTeamId(servant.teamId ?? '');
    setEditTeams([]);
    getTopTeams(servant.topEventId)
      .then((response) => setEditTeams(toTeamOptions(response.data as any[])))
      .catch(() => setEditTeams([]));
  }

  async function saveEdit(servant: TopServant) {
    setBusy(true);
    try {
      setError(null);
      await updateTopServant(servant.topEventId, servant.id, { teamId: editTeamId || undefined, role: editRole.trim() || undefined, notes: editNotes.trim() || undefined });
      setEditingId(null);
      await onChanged();
    } catch (err) {
      setError(mutationError(err));
    } finally {
      setBusy(false);
    }
  }

  async function cancelServant(servant: TopServant) {
    setBusy(true);
    try {
      setError(null);
      await cancelTopServant(servant.topEventId, servant.id);
      await onChanged();
    } catch (err) {
      setError(mutationError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-[#111113] p-5 shadow-lg space-y-4">
      <div className="flex items-center gap-2">
        <HeartHandshake className="h-4 w-4 text-orange-500" />
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Serviço em TOP</h2>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-400">{error}</div>
      ) : null}

      {servants.length > 0 ? (
        <>
          <p className="text-sm font-bold text-zinc-200">Já serviu em algum TOP</p>
          <ul className="space-y-2">
            {servants.map((servant) => (
              <li key={servant.id} className="rounded-lg border border-zinc-850/60 bg-zinc-900/20 p-3 text-sm">
                {editingId === servant.id ? (
                  <div className="grid gap-2 sm:grid-cols-4 sm:items-end">
                    <label className="block space-y-1 sm:col-span-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Equipe</span>
                      <select className="input text-xs" value={editTeamId} onChange={(e) => setEditTeamId(e.target.value)}>
                        <option value="">Sem equipe</option>
                        {editTeams.map((team) => <option key={team.id} value={team.id}>{team.label}</option>)}
                      </select>
                    </label>
                    <label className="block space-y-1 sm:col-span-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Função</span>
                      <input className="input text-xs" value={editRole} onChange={(e) => setEditRole(e.target.value)} />
                    </label>
                    <label className="block space-y-1 sm:col-span-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Observações</span>
                      <input className="input text-xs" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
                    </label>
                    <div className="flex gap-2 sm:col-span-4">
                      <button type="button" disabled={busy} onClick={() => void saveEdit(servant)} className="rounded-lg bg-orange-600 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-orange-500 disabled:opacity-50">Salvar serviço</button>
                      <button type="button" onClick={() => setEditingId(null)} className="rounded-lg border border-zinc-800 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-300 hover:bg-zinc-800">Cancelar edição</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="font-bold text-zinc-100">
                        {servant.topEvent ? `TOP #${servant.topEvent.number} - ${servant.topEvent.name}` : 'TOP não especificado'}
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500">({servant.status})</span>
                      </p>
                      <p className="text-xs text-zinc-400">Equipe: <span className="text-zinc-300 font-semibold">{servant.team?.name || '-'}</span></p>
                      {servant.role ? <p className="text-xs text-zinc-400">Função: <span className="text-zinc-300 font-semibold">{servant.role}</span></p> : null}
                      {servant.notes ? <p className="text-xs text-zinc-400">Obs.: <span className="text-zinc-300 font-semibold">{servant.notes}</span></p> : null}
                    </div>
                    {(permissions.update || permissions.remove) ? (
                      <div className="flex shrink-0 gap-2">
                        {permissions.update ? <button type="button" onClick={() => startEdit(servant)} className="rounded border border-zinc-800 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:bg-zinc-800">Editar serviço</button> : null}
                        {permissions.remove ? <button type="button" disabled={busy} onClick={() => void cancelServant(servant)} className="rounded border border-rose-900/30 bg-rose-950/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-400 hover:bg-rose-950/30 disabled:opacity-50">Cancelar serviço</button> : null}
                      </div>
                    ) : null}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm font-semibold text-zinc-500">Ainda não serviu em nenhum TOP.</p>
      )}

      {permissions.add ? (
        <form onSubmit={submitAdd} className="grid gap-2 rounded-lg border border-zinc-800 bg-zinc-900/10 p-3 sm:grid-cols-4 sm:items-end">
          <div className="block space-y-1 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">TOP</span>
            <AsyncCombobox
              value={topId}
              selectedLabel={topLabel}
              onChange={(value, label) => { setTopId(value); setTopLabel(value ? label : ''); }}
              fetchOptions={fetchTopOptions}
              placeholder="Buscar TOP por nome ou número..."
              noneLabel="Buscar TOP"
              clearable={false}
            />
          </div>
          <label className="block space-y-1 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Equipe</span>
            <select className="input text-xs" value={teamId} onChange={(e) => setTeamId(e.target.value)} disabled={!topId}>
              <option value="">Sem equipe</option>
              {teams.map((team) => <option key={team.id} value={team.id}>{team.label}</option>)}
            </select>
          </label>
          <label className="block space-y-1 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Função</span>
            <input className="input text-xs" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Logística, Segurança..." />
          </label>
          <label className="block space-y-1 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Observações</span>
            <input className="input text-xs" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <button type="submit" disabled={busy || !topId} className="flex h-10 items-center justify-center rounded-lg bg-orange-600 px-4 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-orange-500 disabled:opacity-50 sm:col-span-1">Adicionar serviço</button>
        </form>
      ) : null}
    </section>
  );
}
