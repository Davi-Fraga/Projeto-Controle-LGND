'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { InternalMessageStatus } from '@central-da-manada/shared';
import { getCommunications, deleteCommunication } from '@/features/communications/api';
import type { InternalMessage } from '@central-da-manada/shared';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { hasPermission } from '@/lib/permissions';
import { useCan } from '@/hooks/use-can';
import { useDebounce } from '@/hooks/use-debounce';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/AsyncState';
import { Search, Eye, ShieldAlert, MessageSquare, Target } from 'lucide-react';

// Rótulo por público-alvo. Era uma cadeia de ternários de 8 níveis dentro do JSX.
const TARGET_LABELS: Record<string, string> = {
  ALL_ACTIVE_LEGENDARIES: 'Toda a Manada',
  TOP_ALL: 'Todos de um TOP',
  TOP_REPRESENTATIVES: 'Representantes do TOP',
  TOP_FAMILY_REPRESENTATIVES: 'Representantes das Famílias do TOP',
  TOP_FAMILY: 'Família específica de um TOP',
  TEAM: 'Equipe específica',
  TEAM_COORDINATORS: 'Coordenadores de Equipe',
  LEGENDARY: 'Legendário individual',
};

export default function CommunicationsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const canDo = useCan(user);
  const canRemove = canDo('communications.delete');
  const [items, setItems] = useState<InternalMessage[]>([]);
  const [page, setPage] = useState(1);
  const router = useRouter();
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
        {hasPermission(user, 'communications.create') && (
          <Link href="/dashboard/comunicacao/novo" className="inline-flex h-10 items-center justify-center rounded-lg bg-orange-600 px-5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500">
            Novo Comunicado
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

      <DataTable
        caption="Lista de comunicados"
        items={items}
        loading={loading}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyMessage={
          <EmptyState
            title="Nenhum comunicado encontrado"
            description="Assim que um comunicado for criado, ele aparece aqui com o público-alvo, o número de destinatários e a situação do envio."
            action={
              hasPermission(user, 'communications.create')
                ? { label: 'Novo Comunicado', onClick: () => router.push('/dashboard/comunicacao/novo') }
                : undefined
            }
            compact
          />
        }
        columns={[
          {
            header: 'Assunto / Título',
            role: 'title',
            accessor: (item) => (
              <span className="flex items-center gap-2 font-bold text-content-strong">
                <MessageSquare className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                {item.title}
              </span>
            ),
          },
          {
            header: 'Canal/Público',
            accessor: (item) => (
              <span className="flex items-center gap-1">
                <Target className="h-3.5 w-3.5 text-content-muted" aria-hidden="true" />
                {TARGET_LABELS[item.targetType] ?? item.targetType}
              </span>
            ),
          },
          { header: 'Destinatários', accessor: (item) => item.recipientsCount ?? 0 },
          { header: 'Status', accessor: (item) => <StatusBadge status={item.status} /> },
          {
            header: 'Ações',
            role: 'actions',
            className: 'text-right',
            accessor: (item) => (
              <div className="flex justify-end">
                <ActionMenu
                  label={`Ações de ${item.title}`}
                  items={[
                    { label: 'Ver', href: `/dashboard/comunicacao/${item.id}`, icon: <Eye className="h-3.5 w-3.5" /> },
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
