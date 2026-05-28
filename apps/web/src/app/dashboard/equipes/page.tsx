'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TeamStatus } from '@central-da-manada/shared';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useDebounce } from '@/hooks/use-debounce';
import { deactivateTeam, getTeams } from '@/features/teams/api';
import type { Team } from '@/features/teams/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Search, Eye, Edit2, ShieldAlert, Shield } from 'lucide-react';

export default function TeamsPage() {
  const { loading: authLoading } = useRequireAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
        <Link href="/dashboard/equipes/nova" className="inline-flex h-10 items-center justify-center rounded-lg bg-orange-600 px-5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500">
          Nova Equipe
        </Link>
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

      {/* Table Section */}
      <div className="w-full overflow-hidden rounded-xl border border-zinc-800 bg-[#111113] shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-zinc-300">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-xs font-bold tracking-wider text-zinc-400 uppercase">
                <th className="px-6 py-4">Nome da Equipe</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Coordenador</th>
                <th className="px-6 py-4">Subcoordenador</th>
                <th className="px-6 py-4">Membros Ativos</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Carregando Equipes...</span>
                    </div>
                  </td>
                </tr>
              ) : teams.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center font-medium text-zinc-500">
                    Nenhuma equipe encontrada.
                  </td>
                </tr>
              ) : (
                teams.map((team) => (
                  <tr key={team.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="px-6 py-4.5 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-orange-500" />
                        <span>{team.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4.5">
                      <StatusBadge status={team.status} />
                    </td>
                    <td className="px-6 py-4.5 text-zinc-300 font-semibold">
                      {team.coordinator?.fullName ?? '-'}
                    </td>
                    <td className="px-6 py-4.5 text-zinc-300 font-medium">
                      {team.deputyCoordinator?.fullName ?? '-'}
                    </td>
                    <td className="px-6 py-4.5 text-zinc-300 font-bold">
                      {team.activeMembersCount}
                    </td>
                    <td className="px-6 py-4.5">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          className="flex h-8 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 text-xs font-bold uppercase tracking-wider text-zinc-300 transition-all hover:bg-zinc-850 hover:text-zinc-100"
                          href={`/dashboard/equipes/${team.id}`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver
                        </Link>
                        <Link
                          className="flex h-8 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 text-xs font-bold uppercase tracking-wider text-zinc-300 transition-all hover:bg-zinc-850 hover:text-zinc-100"
                          href={`/dashboard/equipes/${team.id}/editar`}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Editar
                        </Link>
                        <button
                          className="flex h-8 items-center gap-1.5 rounded-lg border border-rose-900/30 bg-rose-950/20 px-3 text-xs font-bold uppercase tracking-wider text-rose-400 transition-all hover:bg-rose-950/50 hover:text-rose-300"
                          onClick={() => setDeactivatingId(team.id)}
                        >
                          <ShieldAlert className="h-3.5 w-3.5" />
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
