'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SocialActionStatus } from '@central-da-manada/shared';
import { deleteSocialAction, getSocialActions } from '@/features/social-actions/api';
import type { SocialAction } from '@central-da-manada/shared';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useDebounce } from '@/hooks/use-debounce';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { Search, MapPin, Eye, Edit2, ShieldAlert, Calendar } from 'lucide-react';

export default function SocialActionsPage() {
  const { loading: authLoading } = useRequireAuth();
  const [items, setItems] = useState<SocialAction[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [filters, setFilters] = useState({ status: '', city: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Custom dialog state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    getSocialActions({
      page,
      perPage: 10,
      search: debouncedSearch,
      status: filters.status as SocialActionStatus | '',
      city: filters.city
    })
      .then((response) => {
        setItems(response.data);
        setTotalPages(response.meta.totalPages || 1);
      })
      .catch(() => setError('Não foi possível carregar as ações sociais.'))
      .finally(() => setLoading(false));
  }, [authLoading, page, debouncedSearch, filters]);

  async function handleConfirmDelete() {
    if (!deletingId) return;
    try {
      await deleteSocialAction(deletingId);
      setItems((current) => current.filter((item) => item.id !== deletingId));
    } catch {
      setError('Erro ao excluir ação social.');
    } finally {
      setDeletingId(null);
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
          <h1 className="text-2xl font-black tracking-wide text-white uppercase">Ações Sociais</h1>
          <p className="text-sm text-zinc-400">Projetos de impacto social liderados pela manada.</p>
        </div>
        <Link href="/dashboard/acoes-sociais/nova" className="inline-flex h-10 items-center justify-center rounded-lg bg-orange-600 px-5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500">
          Nova Ação Social
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
            placeholder="Buscar por título ou descrição..."
            value={searchQuery}
            onChange={(event) => { setSearchQuery(event.target.value); setPage(1); }}
          />
          <input
            className="input"
            placeholder="Cidade"
            value={filters.city}
            onChange={(event) => { setFilters((current) => ({ ...current, city: event.target.value })); setPage(1); }}
          />
          <select
            className="input sm:col-span-3"
            value={filters.status}
            onChange={(event) => { setFilters((current) => ({ ...current, status: event.target.value })); setPage(1); }}
          >
            <option value="">Todos os status</option>
            {Object.values(SocialActionStatus).map((status) => (
              <option key={status} value={status}>
                {status === 'PLANNED' ? 'Planejado' : status === 'ACTIVE' ? 'Ativo' : status === 'COMPLETED' ? 'Concluído' : status === 'CANCELLED' ? 'Cancelado' : status}
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
                <th className="px-6 py-4">Título da Ação</th>
                <th className="px-6 py-4">Cidade</th>
                <th className="px-6 py-4">Data de Início</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Voluntários</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Carregando Ações...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center font-medium text-zinc-500">
                    Nenhuma ação social encontrada.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="px-6 py-4.5 font-bold text-white">{item.title}</td>
                    <td className="px-6 py-4.5 text-zinc-300 font-semibold">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                        <span>{item.city ?? '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 text-zinc-300 font-medium">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                        <span>{new Date(item.startDate).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4.5">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-6 py-4.5 text-zinc-300 font-bold">
                      {item.participantsCount ?? 0}
                    </td>
                    <td className="px-6 py-4.5">
                      <div className="flex justify-end">
                        <ActionMenu
                          items={[
                            { label: 'Ver', href: `/dashboard/acoes-sociais/${item.id}`, icon: <Eye className="h-3.5 w-3.5" /> },
                            { label: 'Editar', href: `/dashboard/acoes-sociais/${item.id}/editar`, icon: <Edit2 className="h-3.5 w-3.5" /> },
                            { label: 'Excluir', onClick: () => setDeletingId(item.id), icon: <ShieldAlert className="h-3.5 w-3.5" />, destructive: true },
                          ]}
                        />
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

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deletingId !== null}
        title="Excluir Ação Social"
        description="Tem certeza que deseja excluir esta ação social definitivamente? Esta operação não poderá ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingId(null)}
        variant="danger"
      />
    </div>
  );
}
