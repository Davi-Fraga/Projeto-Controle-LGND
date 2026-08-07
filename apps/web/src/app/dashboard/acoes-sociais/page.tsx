'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SocialActionStatus } from '@central-da-manada/shared';
import { deleteSocialAction, getSocialActions } from '@/features/social-actions/api';
import type { SocialAction } from '@central-da-manada/shared';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { hasPermission } from '@/lib/permissions';
import { useCan } from '@/hooks/use-can';
import { useDebounce } from '@/hooks/use-debounce';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/AsyncState';
import { Search, MapPin, Eye, Edit2, ShieldAlert, Calendar } from 'lucide-react';

export default function SocialActionsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const canDo = useCan(user);
  const canEdit = canDo('social-actions.update');
  const canRemove = canDo('social-actions.delete');
  const [items, setItems] = useState<SocialAction[]>([]);
  const [page, setPage] = useState(1);
  const router = useRouter();
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
        {hasPermission(user, 'social-actions.create') && (
          <Link href="/dashboard/acoes-sociais/nova" className="inline-flex h-10 items-center justify-center rounded-lg bg-orange-600 px-5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500">
            Nova Ação Social
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

      <DataTable
        caption="Lista de ações sociais"
        items={items}
        loading={loading}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyMessage={
          <EmptyState
            title="Nenhuma ação social encontrada"
            description="Assim que uma ação social for cadastrada, ela aparece aqui com cidade, data de início e número de voluntários."
            action={
              hasPermission(user, 'social-actions.create')
                ? { label: 'Nova Ação', onClick: () => router.push('/dashboard/acoes-sociais/nova') }
                : undefined
            }
            compact
          />
        }
        columns={[
          { header: 'Título da Ação', role: 'title', accessor: (item) => <span className="font-bold text-content-strong">{item.title}</span> },
          {
            header: 'Cidade',
            accessor: (item) => (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-content-muted" aria-hidden="true" />
                {item.city ?? '-'}
              </span>
            ),
          },
          {
            header: 'Data de Início',
            accessor: (item) => (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-content-muted" aria-hidden="true" />
                {new Date(item.startDate).toLocaleDateString('pt-BR')}
              </span>
            ),
          },
          { header: 'Status', accessor: (item) => <StatusBadge status={item.status} /> },
          { header: 'Voluntários', accessor: (item) => item.participantsCount ?? 0 },
          {
            header: 'Ações',
            role: 'actions',
            className: 'text-right',
            accessor: (item) => (
              <div className="flex justify-end">
                <ActionMenu
                  items={[
                    { label: 'Ver', href: `/dashboard/acoes-sociais/${item.id}`, icon: <Eye className="h-3.5 w-3.5" /> },
                    ...(canEdit ? [{ label: 'Editar', href: `/dashboard/acoes-sociais/${item.id}/editar`, icon: <Edit2 className="h-3.5 w-3.5" /> }] : []),
                    ...(canRemove ? [{ label: 'Excluir', onClick: () => setDeletingId(item.id), icon: <ShieldAlert className="h-3.5 w-3.5" />, destructive: true }] : []),
                  ]}
                />
              </div>
            ),
          },
        ]}
      />


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
