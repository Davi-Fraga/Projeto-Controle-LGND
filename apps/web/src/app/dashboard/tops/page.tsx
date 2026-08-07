'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TopEventStatus } from '@central-da-manada/shared';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { hasPermission } from '@/lib/permissions';
import { useCan } from '@/hooks/use-can';
import { useDebounce } from '@/hooks/use-debounce';
import { deactivateTop, getTops } from '@/features/tops/api';
import type { TopEvent } from '@/features/tops/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/AsyncState';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { Search, MapPin, Eye, Edit2, ShieldAlert, Calendar } from 'lucide-react';

export default function TopsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const canDo = useCan(user);
  const canEdit = canDo('tops.update');
  const canRemove = canDo('tops.delete');
  const [tops, setTops] = useState<TopEvent[]>([]);
  const [page, setPage] = useState(1);
  const router = useRouter();
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [filters, setFilters] = useState({
    status: '',
    city: '',
    startDateFrom: '',
    startDateTo: '',
    needsReview: '',
    missingFamilyCoordinator: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Custom dialog state
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    getTops({
      page,
      perPage: 10,
      search: debouncedSearch || undefined,
      status: (filters.status as TopEventStatus) || undefined,
      city: filters.city || undefined,
      startDateFrom: filters.startDateFrom || undefined,
      startDateTo: filters.startDateTo || undefined,
      needsReview: filters.needsReview === '' ? undefined : filters.needsReview === 'true',
      missingFamilyCoordinator: filters.missingFamilyCoordinator === '' ? undefined : filters.missingFamilyCoordinator === 'true',
    })
      .then((r) => {
        setTops(r.data);
        setTotalPages(r.meta.totalPages || 1);
      })
      .catch(() => setError('Não foi possível carregar os TOPs.'))
      .finally(() => setLoading(false));
  }, [authLoading, page, debouncedSearch, filters]);

  function setFilter(k: keyof typeof filters, v: string) {
    setFilters((c) => ({ ...c, [k]: v }));
    setPage(1);
  }

  async function handleConfirmDeactivate() {
    if (!deactivatingId) return;
    try {
      await deactivateTop(deactivatingId);
      setTops((c) => c.filter((t) => t.id !== deactivatingId));
    } catch {
      setError('Erro ao inativar o TOP.');
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
          <h1 className="text-2xl font-black tracking-wide text-white uppercase">TOPs</h1>
          <p className="text-sm text-zinc-400">Eventos de acampamento principal dos Legendários.</p>
        </div>
        {hasPermission(user, 'tops.create') && (
          <Link href="/dashboard/tops/novo" className="inline-flex h-10 items-center justify-center rounded-lg bg-orange-600 px-5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500">
            Novo TOP
          </Link>
        )}
      </div>

      {/* Filters Panel */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
        <div className="flex items-center gap-2 mb-3 border-b border-zinc-800/60 pb-2">
          <Search className="h-4 w-4 text-orange-500" />
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Filtros de Busca</span>
        </div>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <input className="input col-span-1 sm:col-span-2" placeholder="Buscar por nome ou número" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} />
          <input className="input" placeholder="Cidade" value={filters.city} onChange={(e) => setFilter('city', e.target.value)} />
          <select className="input" value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">Todos os status</option>
            {Object.values(TopEventStatus).map((s) => (
              <option key={s} value={s}>
                {s === 'PLANNED' ? 'Planejado' : s === 'REGISTRATION_OPEN' ? 'Inscrições Abertas' : s === 'ACTIVE' ? 'Em Andamento' : s === 'COMPLETED' ? 'Concluído' : s === 'CANCELLED' ? 'Cancelado' : s}
              </option>
            ))}
          </select>
          <div className="flex gap-2 col-span-1 sm:col-span-2 lg:col-span-2">
            <input className="input text-xs w-1/2" type="date" title="Data início a partir de" value={filters.startDateFrom} onChange={(e) => setFilter('startDateFrom', e.target.value)} />
            <input className="input text-xs w-1/2" type="date" title="Data início até" value={filters.startDateTo} onChange={(e) => setFilter('startDateTo', e.target.value)} />
          </div>
          <select className="input" value={filters.needsReview} onChange={(e) => setFilter('needsReview', e.target.value)}>
            <option value="">Revisão</option>
            <option value="true">Precisa de revisão</option>
            <option value="false">Sem pendência</option>
          </select>
          <select className="input" value={filters.missingFamilyCoordinator} onChange={(e) => setFilter('missingFamilyCoordinator', e.target.value)}>
            <option value="">Coord. famílias</option>
            <option value="true">Sem coordenador</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-semibold text-rose-400">
          {error}
        </div>
      )}

      <DataTable
        caption="Lista de eventos TOP"
        items={tops}
        loading={loading}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyMessage={
          <EmptyState
            title="Nenhum TOP encontrado"
            description="Assim que um evento TOP for cadastrado, ele aparece aqui com cidade, período e os totais de participantes, servos e equipes."
            action={
              hasPermission(user, 'tops.create')
                ? { label: 'Novo TOP', onClick: () => router.push('/dashboard/tops/novo') }
                : undefined
            }
            compact
          />
        }
        columns={[
          // O número entra no título do cartão; como coluna separada viraria mais um
          // par rótulo/valor sem necessidade.
          { header: 'Nº', role: 'hideOnMobile', className: 'px-4', accessor: (top) => <span className="font-bold text-accent">#{top.number}</span> },
          {
            header: 'Nome do TOP',
            role: 'title',
            accessor: (top) => (
              <span className="font-bold text-content-strong">
                <span className="text-accent md:hidden">#{top.number} </span>
                {top.name}
                {top.needsReview || !top.familyCoordinatorLegendaryId ? (
                  <span className="ml-2 rounded border border-feedback-warning/30 bg-feedback-warning/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-feedback-warning">
                    Revisar
                  </span>
                ) : null}
              </span>
            ),
          },
          {
            header: 'Cidade',
            accessor: (top) => (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-content-muted" aria-hidden="true" />
                {top.city}
              </span>
            ),
          },
          {
            header: 'Período',
            accessor: (top) => (
              <span className="flex items-center gap-1 text-xs">
                <Calendar className="h-3.5 w-3.5 text-content-muted" aria-hidden="true" />
                {new Date(top.startDate).toLocaleDateString('pt-BR')} - {new Date(top.endDate).toLocaleDateString('pt-BR')}
              </span>
            ),
          },
          { header: 'Status', accessor: (top) => <StatusBadge status={top.status} /> },
          { header: 'Part.', className: 'px-4 text-center', accessor: (top) => top.participantsCount },
          { header: 'Servos', className: 'px-4 text-center', accessor: (top) => top.servantsCount },
          { header: 'Equipes', className: 'px-4 text-center', accessor: (top) => top.teamsCount },
          {
            header: 'Ações',
            role: 'actions',
            className: 'text-right',
            accessor: (top) => (
              <div className="flex justify-end">
                <ActionMenu
                  label={`Ações do TOP ${top.name}`}
                  items={[
                    { label: 'Ver', href: `/dashboard/tops/${top.id}`, icon: <Eye className="h-3.5 w-3.5" /> },
                    ...(canEdit ? [{ label: 'Editar', href: `/dashboard/tops/${top.id}/editar`, icon: <Edit2 className="h-3.5 w-3.5" /> }] : []),
                    ...(canRemove ? [{ label: 'Inativar', onClick: () => setDeactivatingId(top.id), icon: <ShieldAlert className="h-3.5 w-3.5" />, destructive: true }] : []),
                  ]}
                />
              </div>
            ),
          },
        ]}
      />

      {/* Confirm Deactivation Dialog */}
      <ConfirmDialog
        isOpen={deactivatingId !== null}
        title="Inativar Evento TOP"
        description="Tem certeza que deseja inativar este evento TOP? Todas as inscrições associadas serão mantidas no histórico, mas o TOP não aparecerá na listagem principal."
        confirmLabel="Inativar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDeactivate}
        onCancel={() => setDeactivatingId(null)}
        variant="danger"
      />
    </div>
  );
}
