'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Building2, Edit2, Eye, MapPin, Phone, Search, Trash2, User } from 'lucide-react';
import { formatPhone } from '@central-da-manada/shared';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useDebounce } from '@/hooks/use-debounce';
import { hasPermission } from '@/lib/permissions';
import { useCan, useCanOpenRoute } from '@/hooks/use-can';
import { deleteChurch, getChurchCities, getChurchesPage } from '@/features/churches/api';
import type { Church } from '@/features/churches/api';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState, ErrorState } from '@/components/ui/AsyncState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ChurchDetailModal } from '@/features/churches/church-detail-modal';
import { ApiError } from '@/lib/api';

const PER_PAGE = 10;

export default function IgrejasPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const canDo = useCan(user);
  const canOpen = useCanOpenRoute(user);
  const canEdit = canDo('churches.update');
  const canRemove = canDo('churches.delete');
  const [churches, setChurches] = useState<Church[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [filters, setFilters] = useState({ city: '', hasCoordinates: '', hasLegendarios: '' });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [deletingChurch, setDeletingChurch] = useState<Church | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (authLoading) return;
    getChurchCities().then((response) => setCities(response.data)).catch(() => setCities([]));
  }, [authLoading]);

  useEffect(() => {
    if (authLoading) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError(null);

    getChurchesPage({
      page,
      perPage: PER_PAGE,
      search: debouncedSearch.trim() || undefined,
      city: filters.city || undefined,
      hasCoordinates: filters.hasCoordinates === '' ? undefined : filters.hasCoordinates === 'true',
      hasLegendarios: filters.hasLegendarios === '' ? undefined : filters.hasLegendarios === 'true',
      orderBy: 'name',
      orderDirection: 'asc',
    })
      .then((response) => {
        if (requestId !== requestIdRef.current) return;
        setChurches(response.data);
        setTotal(response.meta.total);
        setTotalPages(Math.max(1, response.meta.totalPages));
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return;
        setLoadError('Não foi possível carregar as igrejas. Tente novamente.');
      })
      .finally(() => {
        if (requestId !== requestIdRef.current) return;
        setLoading(false);
      });
  }, [authLoading, debouncedSearch, filters, page, refreshKey]);

  function updateFilter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  async function handleConfirmDelete() {
    if (!deletingChurch) return;
    setDeleteBusy(true);
    setError(null);
    try {
      await deleteChurch(deletingChurch.id);
      const newTotalPages = Math.max(1, Math.ceil(Math.max(0, total - 1) / PER_PAGE));
      setDeletingChurch(null);
      if (page > newTotalPages) setPage(newTotalPages);
      else setRefreshKey((current) => current + 1);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? `A igreja "${deletingChurch.name}" não pode ser excluída porque possui Legendários vinculados.`
          : 'Não foi possível excluir a igreja.',
      );
      setDeletingChurch(null);
    } finally {
      setDeleteBusy(false);
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

  const hasActiveFilters = Boolean(
    debouncedSearch.trim() || filters.city || filters.hasCoordinates || filters.hasLegendarios,
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-wide text-white uppercase">Igrejas</h1>
          <p className="text-sm text-zinc-400">Cadastro de igrejas, líderes espirituais e localização.</p>
        </div>
        {hasPermission(user, 'churches.create') && (
          <Link href="/dashboard/igrejas/nova" className="inline-flex h-10 items-center justify-center rounded-lg bg-orange-600 px-5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500">
            Nova Igreja
          </Link>
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
        <div className="mb-3 flex items-center gap-2 border-b border-zinc-800/60 pb-2">
          <Search className="h-4 w-4 text-orange-500" />
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Filtros de Busca</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => { setSearchQuery(event.target.value); setPage(1); }}
              placeholder="Buscar por nome, cidade ou apelido..."
              className="input w-full"
              style={{ paddingLeft: '2.5rem' }}
              aria-label="Buscar igrejas"
            />
            {searchQuery !== debouncedSearch && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Buscando...</span>
            )}
          </div>

          <select aria-label="Filtrar por cidade" className="input" value={filters.city} onChange={(event) => updateFilter('city', event.target.value)}>
            <option value="">Todas as cidades</option>
            {cities.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>

          <select aria-label="Filtrar por coordenadas" className="input" value={filters.hasCoordinates} onChange={(event) => updateFilter('hasCoordinates', event.target.value)}>
            <option value="">Todas as localizações</option>
            <option value="true">Com coordenadas</option>
            <option value="false">Sem coordenadas</option>
          </select>

          <select aria-label="Filtrar por legendários" className="input" value={filters.hasLegendarios} onChange={(event) => updateFilter('hasLegendarios', event.target.value)}>
            <option value="">Todos os vínculos</option>
            <option value="true">Com Legendários</option>
            <option value="false">Sem Legendários</option>
          </select>
        </div>
        {!loading && !loadError && (
          <p className="mt-3 text-xs font-semibold text-zinc-500">{total} {total === 1 ? 'igreja encontrada' : 'igrejas encontradas'}</p>
        )}
      </div>

      {error && <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-semibold text-rose-400">{error}</div>}

      <DataTable
        caption="Lista de igrejas"
        items={churches}
        loading={loading}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyMessage={
          loadError ? (
            <ErrorState
              title="Não foi possível carregar as igrejas"
              description="A lista não pôde ser buscada agora. Tente de novo; se persistir, verifique sua conexão."
              action={{ label: 'Tentar de novo', onClick: () => setRefreshKey((k) => k + 1) }}
              compact
            />
          ) : hasActiveFilters ? (
            <EmptyState
              title="Nenhuma igreja para esta busca"
              description="Nenhuma igreja combina com os filtros aplicados. Ajuste os critérios para ver mais resultados."
              compact
            />
          ) : (
            <EmptyState
              title="Nenhuma igreja cadastrada"
              description="Assim que a primeira igreja for cadastrada, ela aparece aqui com cidade, líder espiritual e contato."
              compact
            />
          )
        }
        columns={[
          {
            header: 'Igreja',
            role: 'title',
            accessor: (church) => (
              <span className="flex items-center gap-2 font-bold text-content-strong">
                <Building2 className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                {church.name}
              </span>
            ),
          },
          { header: 'Cidade', accessor: (church) => church.city || '—' },
          {
            header: 'Líder Espiritual',
            accessor: (church) => church.spiritualLeaderName
              ? <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-content-muted" aria-hidden="true" />{church.spiritualLeaderName}</span>
              : '—',
          },
          {
            header: 'Telefone',
            accessor: (church) => church.spiritualLeaderPhone
              ? <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-content-muted" aria-hidden="true" />{formatPhone(church.spiritualLeaderPhone)}</span>
              : '—',
          },
          {
            header: 'Coordenadas',
            accessor: (church) => church.latitude != null && church.longitude != null
              ? <span className="inline-flex items-center gap-1 text-feedback-success"><MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Sim</span>
              : <span className="text-content-disabled">—</span>,
          },
          {
            header: 'Ações',
            role: 'actions',
            className: 'text-right',
            accessor: (church) => (
              <div className="flex justify-end">
                <ActionMenu label={`Ações de ${church.name}`} items={[
                  { label: 'Ver', onClick: () => setViewingId(church.id), icon: <Eye className="h-3.5 w-3.5" /> },
                  ...(canEdit ? [{ label: 'Editar', href: `/dashboard/igrejas/${church.id}/editar`, icon: <Edit2 className="h-3.5 w-3.5" /> }] : []),
                  ...(canRemove ? [{ label: 'Excluir', onClick: () => setDeletingChurch(church), icon: <Trash2 className="h-3.5 w-3.5" />, destructive: true }] : []),
                ]} />
              </div>
            ),
          },
        ]}
      />

      <ChurchDetailModal churchId={viewingId} canOpenLegendaryScreen={canOpen('/dashboard/legendarios')} onClose={() => setViewingId(null)} />
      <ConfirmDialog isOpen={deletingChurch !== null} title="Excluir Igreja" description={`Tem certeza que deseja excluir "${deletingChurch?.name ?? ''}"? Só é possível excluir igrejas sem Legendários vinculados.`} confirmLabel={deleteBusy ? 'Excluindo...' : 'Excluir'} cancelLabel="Cancelar" onConfirm={handleConfirmDelete} onCancel={() => setDeletingChurch(null)} variant="danger" />
    </div>
  );
}
