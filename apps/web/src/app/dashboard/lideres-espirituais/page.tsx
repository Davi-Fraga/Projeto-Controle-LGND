'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Building2, User, Phone, Users, Mail, MapPin, ShieldCheck } from 'lucide-react';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { getSpiritualLeaderChurches } from '@/features/spiritual-leaders/api';
import type { SpiritualLeaderChurch } from '@/features/spiritual-leaders/api';

export default function LideresEspirituaisPage() {
  const { loading: authLoading } = useRequireAuth();
  const [churches, setChurches] = useState<SpiritualLeaderChurch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    getSpiritualLeaderChurches()
      .then(setChurches)
      .catch(() => setError('Não foi possível carregar as igrejas.'))
      .finally(() => setLoading(false));
  }, [authLoading]);

  const totalMembers = churches.reduce((sum, c) => sum + c._count.legendarios, 0);
  const withLeader = churches.filter((c) => c.spiritualLeaderUserId || c.spiritualLeaderName).length;

  if (authLoading || loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Carregando...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-semibold text-rose-400">
        {error}
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
          <p className="mt-3 text-sm font-semibold text-zinc-400">Nenhuma igreja vinculada ao seu acesso.</p>
          <p className="mt-1 text-xs text-zinc-500">As igrejas que você lidera aparecerão aqui.</p>
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

                {church.spiritualLeader ? (
                  <>
                    <InfoRow icon={<User className="h-3.5 w-3.5" />} value={church.spiritualLeader.name} />
                    <InfoRow icon={<Mail className="h-3.5 w-3.5" />} value={church.spiritualLeader.email} />
                  </>
                ) : church.spiritualLeaderName ? (
                  <InfoRow icon={<User className="h-3.5 w-3.5" />} value={church.spiritualLeaderName} />
                ) : (
                  <p className="text-sm italic text-zinc-600">Líder espiritual não cadastrado</p>
                )}

                {church.spiritualLeaderPhone && (
                  <InfoRow icon={<Phone className="h-3.5 w-3.5" />} value={church.spiritualLeaderPhone} />
                )}
              </div>

              {/* Action */}
              <div className="mt-4 border-t border-zinc-800/60 pt-3">
                <Link
                  href={`/dashboard/legendarios?churchId=${church.id}&churchName=${encodeURIComponent(church.name)}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-orange-500 hover:text-orange-400 transition-colors"
                >
                  <Users className="h-3.5 w-3.5" /> Ver legendários
                </Link>
              </div>
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
