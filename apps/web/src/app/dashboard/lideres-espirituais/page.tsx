'use client';

import Link from 'next/link';
import { Building2, User, Phone, Users, Mail, MapPin, Search, ShieldCheck } from 'lucide-react';
import { formatPhone } from '@central-da-manada/shared';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import { hasPermission } from '@/lib/permissions';
import { getSpiritualLeaderChurches } from '@/features/spiritual-leaders/api';
import type { SpiritualLeaderChurch } from '@/features/spiritual-leaders/api';

export default function LideresEspirituaisPage() {
  const { loading: authLoading, user } = useRequireAuth();
  // Links cruzados para Legendários só quando a tela de destino está concedida (change
  // alinhar-abas). Sem a permission, os dados de líder/igreja continuam visíveis como texto,
  // apenas sem navegação — e a API de Legendários segue barrando por conta própria.
  const canSeeLegendarios = hasPermission(user, 'legendarios.read');
  const {
    search,
    setSearch,
    debounced,
    data: churches,
    initialLoading,
    searching,
    error,
  } = useDebouncedSearch<SpiritualLeaderChurch[]>(getSpiritualLeaderChurches, [], { enabled: !authLoading });

  // Resumos recalculados a partir do conjunto filtrado atual (não de totais globais).
  const totalMembers = churches.reduce((sum, c) => sum + c._count.legendarios, 0);
  const withLeader = churches.filter((c) => c.spiritualLeaderEffectiveName || c.spiritualLeaderName).length;

  if (authLoading || initialLoading) {
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-wide text-white uppercase">Líderes Espirituais</h1>
        <p className="text-sm text-zinc-400">Igrejas, seus líderes espirituais e legendários vinculados.</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por igreja ou nome do líder..."
          className="input w-full"
          style={{ paddingLeft: '2.5rem' }}
          aria-label="Buscar líderes espirituais"
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Buscando...
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-semibold text-rose-400">
          Não foi possível carregar as igrejas. Tente novamente.
        </div>
      )}

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard icon={<Building2 className="h-5 w-5 text-orange-500" />} label="Igrejas" value={churches.length} />
        <SummaryCard icon={<ShieldCheck className="h-5 w-5 text-orange-500" />} label="Com Líder Cadastrado" value={withLeader} />
        <SummaryCard icon={<Users className="h-5 w-5 text-orange-500" />} label="Legendários Vinculados" value={totalMembers} />
      </div>

      {/* Church list */}
      {churches.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-[#111113] p-10 text-center shadow-lg">
          <Building2 className="mx-auto h-8 w-8 text-zinc-600" />
          {debounced.trim() ? (
            <p className="mt-3 text-sm font-semibold text-zinc-400">
              Nenhuma igreja encontrada para “{debounced.trim()}”.
            </p>
          ) : (
            <>
              <p className="mt-3 text-sm font-semibold text-zinc-400">Nenhuma igreja vinculada ao seu acesso.</p>
              <p className="mt-1 text-xs text-zinc-500">As igrejas que você lidera aparecerão aqui.</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {churches.map((church) => (
            <div key={church.id} className="rounded-xl border border-zinc-800 bg-[#111113] p-5 shadow-lg">
              {/* Church header */}
              <div className="flex items-start justify-between gap-3 border-b border-zinc-800/60 pb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 flex-shrink-0 text-orange-500" />
                    <h2 className="truncate text-base font-bold text-white">{church.name}</h2>
                  </div>
                  {church.city && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                      <MapPin className="h-3 w-3" /> {church.city}
                    </p>
                  )}
                </div>
                <span className="flex-shrink-0 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-400">
                  {church._count.legendarios} legendário{church._count.legendarios === 1 ? '' : 's'}
                </span>
              </div>

              {/* Spiritual leader info */}
              <div className="mt-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Líder Espiritual</p>

                {church.spiritualLeaderLegendary && canSeeLegendarios ? (
                  <Link
                    href={`/dashboard/legendarios/${church.spiritualLeaderLegendary.id}`}
                    className="flex items-center gap-2 text-sm font-semibold text-orange-400 transition-colors hover:text-orange-300"
                  >
                    <User className="h-3.5 w-3.5" />
                    <span className="truncate">{church.spiritualLeaderLegendary.fullName}</span>
                  </Link>
                ) : church.spiritualLeaderLegendary ? (
                  <InfoRow icon={<User className="h-3.5 w-3.5" />} value={church.spiritualLeaderLegendary.fullName} />
                ) : church.spiritualLeaderEffectiveName || church.spiritualLeaderName ? (
                  <InfoRow
                    icon={<User className="h-3.5 w-3.5" />}
                    value={church.spiritualLeaderEffectiveName || church.spiritualLeaderName || ''}
                  />
                ) : (
                  <p className="text-sm italic text-zinc-600">Líder espiritual não cadastrado</p>
                )}

                {church.spiritualLeader ? (
                  <>
                    <p className="pt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Acesso do sistema</p>
                    <InfoRow icon={<ShieldCheck className="h-3.5 w-3.5" />} value={church.spiritualLeader.name} />
                    <InfoRow icon={<Mail className="h-3.5 w-3.5" />} value={church.spiritualLeader.email} />
                  </>
                ) : null}

                {church.spiritualLeaderPhone && (
                  <InfoRow icon={<Phone className="h-3.5 w-3.5" />} value={formatPhone(church.spiritualLeaderPhone)} />
                )}
              </div>

              {/* Action — só quando a tela de Legendários está concedida. */}
              {canSeeLegendarios && (
                <div className="mt-4 border-t border-zinc-800/60 pt-3">
                  <Link
                    href={`/dashboard/legendarios?churchId=${church.id}&churchName=${encodeURIComponent(church.name)}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-orange-500 hover:text-orange-400 transition-colors"
                  >
                    <Users className="h-3.5 w-3.5" /> Ver legendários
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#111113] p-5 shadow-lg">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</p>
      </div>
      <p className="text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function InfoRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-zinc-300">
      <span className="text-zinc-500">{icon}</span>
      <span className="truncate">{value}</span>
    </div>
  );
}
