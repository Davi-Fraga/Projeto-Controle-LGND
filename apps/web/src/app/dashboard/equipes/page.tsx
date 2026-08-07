'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TeamStatus } from '@central-da-manada/shared';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { hasPermission } from '@/lib/permissions';
import { useCan } from '@/hooks/use-can';
import { useDebounce } from '@/hooks/use-debounce';
import { deactivateTeam, getTeams } from '@/features/teams/api';
import type { Team } from '@/features/teams/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/AsyncState';
import { Search, Eye, Edit2, ShieldAlert, Shield } from 'lucide-react';
import { formatTeamName } from '@/lib/teams';

export default function TeamsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const canDo = useCan(user);
  const canEdit = canDo('teams.update');
  const canRemove = canDo('teams.delete');
  const [teams, setTeams] = useState<Team[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Custom dialog state
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    getTeams({
      page,
      perPage: 10,
      search: debouncedSearch || undefined,
      status: (status as TeamStatus) || undefined,
      orderBy: 'name',
      orderDirection: 'asc',
    })
      .then((response) => {
        setTeams(response.data);
        setTotalPages(response.meta.totalPages || 1);
      })
      .catch(() => setError('Não foi possível carregar equipes.'))
      .finally(() => setLoading(false));
  }, [authLoading, page, debouncedSearch, status]);

  async function handleConfirmDeactivate() {
    if (!deactivatingId) return;
    try {
      await deactivateTeam(deactivatingId);
      setTeams((current) => current.filter((team) => team.id !== deactivatingId));
    } catch {
      setError('Erro ao inativar a equipe.');
    } finally {
      setDeactivatingId(null);
    }
  }

  if (authLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-wide text-white uppercase">Equipes</h1>
          <p className="text-sm text-zinc-400">Áreas de serviço e ministérios da manada.</p>
        </div>
        {hasPermission(user, 'teams.create') && (
          <Link href="/dashboard/equipes/nova" className="inline-flex h-10 items-center justify-center rounded-lg bg-orange-600 px-5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500">
            Nova Equipe
          </Link>
        )}
      </div>

      {/* Filters Panel */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
        <div className="flex items-center gap-2 mb-3 border-b border-zinc-800/60 pb-2">
          <Search className="h-4 w-4 text-orange-500" />
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Filtros de Busca</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            className="input sm:col-span-2"
            placeholder="Buscar por nome da equipe"
            value={searchQuery}
            onChange={(event) => { setSearchQuery(event.target.value); setPage(1); }}
          />
          <select
            className="input"
            value={status}
            onChange={(event) => { setStatus(event.target.value); setPage(1); }}
          >
            <option value="">Todos os status</option>
            {Object.values(TeamStatus).map((item) => (
              <option key={item} value={item}>
                {item === 'ACTIVE' ? 'Ativa' : item === 'INACTIVE' ? 'Inativa' : item}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-semibold text-rose-400">
          {error}
        </div>
      )}

      <DataTable
        caption="Lista de equipes"
        items={teams}
        loading={loading}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyMessage={
          debouncedSearch.trim() ? (
            <EmptyState
              title="Nenhuma equipe para esta busca"
              description="Nenhuma equipe combina com o texto buscado. Ajuste o termo ou limpe a busca para ver a lista completa."
              action={{ label: 'Limpar busca', onClick: () => setSearchQuery('') }}
              compact
            />
          ) : (
            <EmptyState
              title="Nenhuma equipe cadastrada"
              description="Assim que a primeira equipe for criada, ela aparece aqui com coordenação e número de membros ativos."
              action={
                hasPermission(user, 'teams.create')
                  ? { label: 'Nova Equipe', onClick: () => router.push('/dashboard/equipes/nova') }
                  : undefined
              }
              compact
            />
          )
        }
        columns={[
          {
            header: 'Nome da Equipe',
            role: 'title',
            accessor: (team) => (
              <span className="flex items-center gap-2 font-bold text-content-strong">
                <Shield className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                {formatTeamName(team.name)}
              </span>
            ),
          },
          { header: 'Status', accessor: (team) => <StatusBadge status={team.status} /> },
          { header: 'Coordenador', accessor: (team) => team.coordinator?.fullName ?? '-' },
          { header: 'Subcoordenador', accessor: (team) => team.deputyCoordinator?.fullName ?? '-' },
          { header: 'Membros Ativos', accessor: (team) => team.activeMembersCount },
          {
            header: 'Ações',
            role: 'actions',
            className: 'text-right',
            accessor: (team) => (
              <div className="flex justify-end">
                <ActionMenu
                  label={`Ações de ${formatTeamName(team.name)}`}
                  items={[
                    { label: 'Ver', href: `/dashboard/equipes/${team.id}`, icon: <Eye className="h-3.5 w-3.5" /> },
                    ...(canEdit ? [{ label: 'Editar', href: `/dashboard/equipes/${team.id}/editar`, icon: <Edit2 className="h-3.5 w-3.5" /> }] : []),
                    ...(canRemove ? [{ label: 'Inativar', onClick: () => setDeactivatingId(team.id), icon: <ShieldAlert className="h-3.5 w-3.5" />, destructive: true }] : []),
                  ]}
                />
              </div>
            ),
          },
        ]}
      />

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-zinc-850 pt-4">
          <button
            className="flex h-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 text-xs font-bold uppercase tracking-wider text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:hover:bg-zinc-900/50 disabled:hover:text-zinc-300"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Anterior
          </button>
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
            Página <span className="text-zinc-300">{page}</span> de <span className="text-zinc-300">{totalPages}</span>
          </span>
          <button
            className="flex h-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 text-xs font-bold uppercase tracking-wider text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:hover:bg-zinc-900/50 disabled:hover:text-zinc-300"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Próxima
          </button>
        </div>
      )}

      {/* Confirm Deactivation Dialog */}
      <ConfirmDialog
        isOpen={deactivatingId !== null}
        title="Inativar Equipe"
        description="Tem certeza que deseja inativar esta equipe? Ela deixará de aparecer nas listagens principais de áreas de serviço."
        confirmLabel="Inativar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDeactivate}
        onCancel={() => setDeactivatingId(null)}
        variant="danger"
      />
    </div>
  );
}
