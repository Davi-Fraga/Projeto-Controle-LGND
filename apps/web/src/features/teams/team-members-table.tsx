'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { TeamMembership } from '@central-da-manada/shared';
import { deactivateTeamMember, getTeamMembers } from './api';
import { TeamMemberForm } from './team-member-form';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type Props = {
  teamId: string;
};

export function TeamMembersTable({ teamId }: Props) {
  const [members, setMembers] = useState<TeamMembership[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TeamMembership | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    getTeamMembers(teamId, { page: 1, perPage: 50, search })
      .then((response) => setMembers(response.data))
      .finally(() => setLoading(false));
  }, [teamId, search, refreshKey]);

  function refresh() {
    setShowForm(false);
    setEditing(undefined);
    setRefreshKey((current) => current + 1);
  }

  // Custom dialog state
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Membros da Equipe</h3>
        </div>
        <div className="flex flex-1 max-w-md gap-3">
          <input className="input" placeholder="Buscar membro..." value={search} onChange={(event) => setSearch(event.target.value)} />
          <button
            onClick={() => setShowForm(true)}
            className="flex h-11 shrink-0 items-center justify-center rounded-lg bg-orange-600 px-4 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500"
          >
            Adicionar Membro
          </button>
        </div>
      </div>

      {showForm || editing ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-5">
          <TeamMemberForm teamId={teamId} member={editing} onSaved={refresh} onCancel={() => { setShowForm(false); setEditing(undefined); }} />
        </div>
      ) : null}

      <div className="w-full overflow-hidden rounded-xl border border-zinc-800 bg-[#0B0B0C]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-zinc-300">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-xs font-bold tracking-wider text-zinc-400 uppercase">
                <th className="px-6 py-4">Legendário</th>
                <th className="px-6 py-4">Função</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Carregando membros...</span>
                    </div>
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-zinc-500 font-semibold">
                    Nenhum membro vinculado a esta equipe.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="hover:bg-zinc-900/20 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">
                      {member.legendary ? (
                        <Link
                          href={`/dashboard/legendarios/${member.legendaryId}?fromTeamId=${teamId}`}
                          className="transition-colors hover:text-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                        >
                          {member.legendary.fullName}
                        </Link>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-zinc-300 font-medium">
                      {member.role === 'COORDINATOR' ? 'Coordenador' : member.role === 'DEPUTY_COORDINATOR' ? 'Subcoordenador' : member.role === 'MEMBER' ? 'Membro' : member.role}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={member.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="flex h-8 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 text-xs font-bold uppercase tracking-wider text-zinc-300 transition-all hover:bg-zinc-850 hover:text-zinc-100"
                          onClick={() => setEditing(member)}
                        >
                          Editar
                        </button>
                        <button
                          className="flex h-8 items-center gap-1.5 rounded-lg border border-rose-900/30 bg-rose-950/20 px-3 text-xs font-bold uppercase tracking-wider text-rose-400 transition-all hover:bg-rose-950/50 hover:text-rose-300"
                          onClick={() => setDeactivatingId(member.id)}
                        >
                          Inativar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deactivatingId !== null}
        title="Remover Membro"
        description="Tem certeza que deseja inativar o vínculo deste membro com a equipe? O histórico dele permanecerá registrado."
        confirmLabel="Inativar"
        cancelLabel="Cancelar"
        onConfirm={async () => {
          if (deactivatingId) {
            await deactivateTeamMember(teamId, deactivatingId);
            setDeactivatingId(null);
            refresh();
          }
        }}
        onCancel={() => setDeactivatingId(null)}
        variant="danger"
      />
    </section>
  );
}
