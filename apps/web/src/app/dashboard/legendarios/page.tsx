'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { LegendaryStatus } from '@central-da-manada/shared';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { hasPermission } from '@/lib/permissions';
import { useDebounce } from '@/hooks/use-debounce';
import {
  deactivateLegendario,
  getChurches,
  getExpertises,
  getLegendarios,
  getProfessions,
} from '@/features/legendarios/api';
import type { Church, Expertise, Legendary, Profession } from '@/features/legendarios/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { TeamFilter } from '@/features/teams/team-filter';
import { Search, MapPin, Eye, Edit2, UserMinus, X } from 'lucide-react';

export default function LegendariosPage() {
  return (
    <Suspense fallback={<LegendariosLoading />}>
      <LegendariosContent />
    </Suspense>
  );
}

function LegendariosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const churchIdParam = searchParams.get('churchId') ?? '';
  const churchNameParam = searchParams.get('churchName') ?? '';
  const { user, loading: authLoading } = useRequireAuth();
  const [items, setItems] = useState<Legendary[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [expertises, setExpertises] = useState<Expertise[]>([]);
  const [teamLabel, setTeamLabel] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [filters, setFilters] = useState(() => ({
    status: '',
    city: '',
    churchId: churchIdParam,
    teamId: '',
    professionId: '',
    expertiseId: '',
    socialActionInterest: '',
    isFromRotaDoCerrado: '',
    needsReview: '',
  }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Guarda anti-race: só a resposta da requisição mais recente é aplicada.
  const requestIdRef = useRef(0);

  // Custom dialog state
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  useEffect(() => {
    // Cada catálogo é carregado de forma independente: usuários restritos
    // (ex.: líder espiritual, coordenador) podem não ter permissão para ler
    // professions/expertises. Nesse caso o filtro apenas não popula, sem
    // quebrar a página nem bloquear a listagem de legendários.
    getChurches().then((r) => setChurches(r.data)).catch(() => setChurches([]));
    getProfessions().then((r) => setProfessions(r.data)).catch(() => setProfessions([]));
    getExpertises().then((r) => setExpertises(r.data)).catch(() => setExpertises([]));
  }, []);

  useEffect(() => {
    setFilters((current) => (
      current.churchId === churchIdParam
        ? current
        : { ...current, churchId: churchIdParam }
    ));
    setPage(1);
  }, [churchIdParam]);

  useEffect(() => {
    if (authLoading) return;

    const requestId = ++requestIdRef.current;
    setLoading(true);
    getLegendarios({
      page,
      perPage: 10,
      search: debouncedSearch || undefined,
      status: (filters.status as LegendaryStatus) || undefined,
      city: filters.city || undefined,
      churchId: filters.churchId || undefined,
      teamId: filters.teamId || undefined,
      professionId: filters.professionId || undefined,
      expertiseId: filters.expertiseId || undefined,
      socialActionInterest: filters.socialActionInterest === '' ? undefined : filters.socialActionInterest === 'true',
      isFromRotaDoCerrado: filters.isFromRotaDoCerrado === '' ? undefined : filters.isFromRotaDoCerrado === 'true',
      needsReview: filters.needsReview === '' ? undefined : filters.needsReview === 'true',
      orderBy: 'fullName',
      orderDirection: 'asc',
    })
      .then((response) => {
        if (requestId !== requestIdRef.current) return; // resposta obsoleta: descarta
        setItems(response.data);
        setTotalPages(response.meta.totalPages || 1);
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return;
        setError('Não foi possível carregar Legendários.');
      })
      .finally(() => {
        if (requestId !== requestIdRef.current) return;
        setLoading(false);
      });
  }, [authLoading, debouncedSearch, filters, page]);

  function updateFilter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function updateChurchFilter(value: string) {
    updateFilter('churchId', value);

    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      const churchName = churches.find((church) => church.id === value)?.name;
      params.set('churchId', value);
      if (churchName) params.set('churchName', churchName);
      else params.delete('churchName');
    } else {
      params.delete('churchId');
      params.delete('churchName');
    }

    const query = params.toString();
    router.replace(query ? `/dashboard/legendarios?${query}` : '/dashboard/legendarios');
  }

  const selectedChurch = churches.find((church) => church.id === filters.churchId);
  const activeChurchLabel = (filters.churchId === churchIdParam ? churchNameParam : '')
    || selectedChurch?.name
    || 'Igreja selecionada';

  async function handleConfirmDeactivate() {
    if (!deactivatingId) return;
    try {
      await deactivateLegendario(deactivatingId);
      setItems((current) => current.filter((item) => item.id !== deactivatingId));
    } catch {
      setError('Erro ao inativar o Legendário.');
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
          <h1 className="text-2xl font-black tracking-wide text-white uppercase">Legendários</h1>
          <p className="text-sm text-zinc-400">Cadastro central de homens da manada.</p>
        </div>
        {hasPermission(user, 'legendarios.create') && (
          <Link href="/dashboard/legendarios/novo" className="inline-flex h-10 items-center justify-center rounded-lg bg-orange-600 px-5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500">
            Novo Legendário
          </Link>
        )}
      </div>

      {/* Filters Panel */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
        <div className="flex items-center gap-2 mb-3 border-b border-zinc-800/60 pb-2">
          <Search className="h-4 w-4 text-orange-500" />
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Filtros de Busca</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <input className="input sm:col-span-2" placeholder="Buscar por nome, telefone, LGND ou cidade" value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setPage(1); }} />
          <input className="input" placeholder="Cidade" value={filters.city} onChange={(event) => updateFilter('city', event.target.value)} />
          
          <select className="input" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
            <option value="">Todos os status</option>
            {Object.values(LegendaryStatus).map((status) => (
              <option key={status} value={status}>
                {status === 'ACTIVE' ? 'Ativo' : status === 'INACTIVE' ? 'Inativo' : status === 'AWAY' ? 'Afastado' : status === 'VISITOR' ? 'Visitante' : status}
              </option>
            ))}
          </select>
          
          <select
            aria-label="Filtrar por igreja"
            className="input"
            value={filters.churchId}
            onChange={(event) => updateChurchFilter(event.target.value)}
          >
            <option value="">Todas as igrejas</option>
            {filters.churchId && !selectedChurch ? (
              <option value={filters.churchId}>{activeChurchLabel}</option>
            ) : null}
            {churches.map((church) => <option key={church.id} value={church.id}>{church.name}</option>)}
          </select>

          {hasPermission(user, 'teams.read') ? (
            <TeamFilter
              value={filters.teamId}
              selectedLabel={teamLabel}
              onChange={(value, label) => {
                setTeamLabel(label);
                updateFilter('teamId', value);
              }}
            />
          ) : null}
          
          <select className="input" value={filters.professionId} onChange={(event) => updateFilter('professionId', event.target.value)}>
            <option value="">Todas as profissões</option>
            {professions.map((profession) => <option key={profession.id} value={profession.id}>{profession.name}</option>)}
          </select>
          
          <select className="input" value={filters.expertiseId} onChange={(event) => updateFilter('expertiseId', event.target.value)}>
            <option value="">Todas as expertises</option>
            {expertises.map((expertise) => <option key={expertise.id} value={expertise.id}>{expertise.name}</option>)}
          </select>

          <select className="input" value={filters.socialActionInterest} onChange={(event) => updateFilter('socialActionInterest', event.target.value)}>
            <option value="">Interesse social</option>
            <option value="true">Com interesse</option>
            <option value="false">Sem interesse</option>
          </select>
          
          <select className="input" value={filters.isFromRotaDoCerrado} onChange={(event) => updateFilter('isFromRotaDoCerrado', event.target.value)}>
            <option value="">Rota do Cerrado</option>
            <option value="true">Faz parte</option>
            <option value="false">Não faz parte</option>
          </select>
          <select className="input" value={filters.needsReview} onChange={(event) => updateFilter('needsReview', event.target.value)}>
            <option value="">Revisão</option>
            <option value="true">Precisa de revisão</option>
            <option value="false">Sem pendência</option>
          </select>
        </div>
        {filters.churchId ? (
          <div className="mt-3 inline-flex min-h-8 items-center gap-2 rounded-md border border-orange-500/30 bg-orange-500/10 px-3 text-xs font-semibold text-orange-300">
            <span>Igreja: {activeChurchLabel}</span>
            <button
              type="button"
              aria-label="Limpar filtro de igreja"
              className="inline-flex h-6 w-6 items-center justify-center rounded text-orange-300 transition-colors hover:bg-orange-500/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              onClick={() => updateChurchFilter('')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
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
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Telefone</th>
                <th className="px-6 py-4">Cidade</th>
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
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Carregando Legendários...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center font-medium text-zinc-500">
                    Nenhum Legendário encontrado.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="px-6 py-4.5">
                      <div>
                        <p className="font-bold text-white leading-snug">{item.fullName}</p>
                        <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                          {item.lgndNumber ? `LGND ${item.lgndNumber}` : 'Sem LGND'}
                        </p>
                        {item.needsReview ? <span className="mt-1 inline-flex rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">Revisar</span> : null}
                      </div>
                    </td>
                    <td className="px-6 py-4.5 text-zinc-300 font-medium">{item.phone || '-'}</td>
                    <td className="px-6 py-4.5 text-zinc-300 font-medium">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                        <span>{item.city || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4.5">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-6 py-4.5">
                      <div className="flex justify-end">
                        <ActionMenu
                          items={[
                            { label: 'Ver', href: `/dashboard/legendarios/${item.id}`, icon: <Eye className="h-3.5 w-3.5" /> },
                            { label: 'Editar', href: `/dashboard/legendarios/${item.id}/editar`, icon: <Edit2 className="h-3.5 w-3.5" /> },
                            { label: 'Inativar', onClick: () => setDeactivatingId(item.id), icon: <UserMinus className="h-3.5 w-3.5" />, destructive: true },
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

      {/* Confirm Deactivation Dialog */}
      <ConfirmDialog
        isOpen={deactivatingId !== null}
        title="Inativar Legendário"
        description="Tem certeza que deseja inativar este Legendário do cadastro ativo? Ele não aparecerá nas listagens padrão."
        confirmLabel="Inativar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDeactivate}
        onCancel={() => setDeactivatingId(null)}
        variant="danger"
      />
    </div>
  );
}

function LegendariosLoading() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Carregando...</span>
      </div>
    </div>
  );
}
