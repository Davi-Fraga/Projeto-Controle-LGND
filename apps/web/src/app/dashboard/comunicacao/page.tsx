'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { InternalMessageStatus } from '@central-da-manada/shared';
import { getCommunications, deleteCommunication } from '@/features/communications/api';
import type { InternalMessage } from '@central-da-manada/shared';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useDebounce } from '@/hooks/use-debounce';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Search, Eye, ShieldAlert, MessageSquare, Target } from 'lucide-react';

export default function CommunicationsPage() {
  const { loading: authLoading } = useRequireAuth();
  const [items, setItems] = useState<InternalMessage[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [filters, setFilters] = useState({ status: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Custom dialog state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    getCommunications({
      page,
      perPage: 10,
      search: debouncedSearch,
      status: filters.status as InternalMessageStatus | ''
    })
      .then((response) => {
        setItems(response.data);
        setTotalPages(response.meta.totalPages || 1);
      })
      .catch(() => setError('Não foi possível carregar comunicados.'))
      .finally(() => setLoading(false));
  }, [authLoading, page, debouncedSearch, filters]);

  async function handleConfirmDelete() {
    if (!deletingId) return;
    try {
      await deleteCommunication(deletingId);
      setItems((current) => current.filter((item) => item.id !== deletingId));
    } catch {
      setError('Erro ao excluir o comunicado.');
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
          <h1 className="text-2xl font-black tracking-wide text-white uppercase">Comunicação Interna</h1>
          <p className="text-sm text-zinc-400">Envio de avisos e notificações para a manada.</p>
        </div>
        <Link href="/dashboard/comunicacao/novo" className="inline-flex h-10 items-center justify-center rounded-lg bg-orange-600 px-5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500">
          Novo Comunicado
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
            placeholder="Buscar por título ou conteúdo..."
            value={searchQuery}
            onChange={(event) => { setSearchQuery(event.target.value); setPage(1); }}
          />
          <select
            className="input"
            value={filters.status}
            onChange={(event) => { setFilters((current) => ({ ...current, status: event.target.value })); setPage(1); }}
          >
            <option value="">Todos os status</option>
            {Object.values(InternalMessageStatus).map((status) => (
              <option key={status} value={status}>
                {status === 'DRAFT' ? 'Rascunho' : status === 'SENT' ? 'Enviado' : status === 'CANCELLED' ? 'Cancelado' : status}
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
                <th className="px-6 py-4">Assunto / Título</th>
                <th className="px-6 py-4">Canal/Público</th>
                <th className="px-6 py-4">Destinatários</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Carregando Comunicados...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center font-medium text-zinc-500">
                    Nenhum comunicado encontrado.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="px-6 py-4.5 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-orange-500" />
                        <span>{item.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 text-zinc-300 font-semibold">
                      <div className="flex items-center gap-1">
                        <Target className="h-3.5 w-3.5 text-zinc-500" />
                        <span>
                          {item.targetType === 'ALL_ACTIVE_LEGENDARIES'
                            ? 'Toda a Manada'
                            : item.targetType === 'TEAM'
                            ? 'Equipe Específica'
                            : item.targetType === 'TOP_ALL'
                            ? 'Todos do TOP'
                            : item.targetType}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 text-zinc-300 font-bold">
                      {item.recipientsCount ?? 0}
                    </td>
                    <td className="px-6 py-4.5">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-6 py-4.5">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          className="flex h-8 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 text-xs font-bold uppercase tracking-wider text-zinc-300 transition-all hover:bg-zinc-850 hover:text-zinc-100"
                          href={`/dashboard/comunicacao/${item.id}`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver
                        </Link>
                        <button
                          className="flex h-8 items-center gap-1.5 rounded-lg border border-rose-900/30 bg-rose-950/20 px-3 text-xs font-bold uppercase tracking-wider text-rose-400 transition-all hover:bg-rose-950/50 hover:text-rose-300"
                          onClick={() => setDeletingId(item.id)}
                        >
                          <ShieldAlert className="h-3.5 w-3.5" />
                          Excluir
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

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deletingId !== null}
        title="Excluir Comunicado"
        description="Tem certeza que deseja excluir este comunicado definitivamente? Esta operação não pode ser desfeita e removerá o log de envio."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingId(null)}
        variant="danger"
      />
    </div>
  );
}
