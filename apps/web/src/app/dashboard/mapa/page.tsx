'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Building2, Users, Globe } from 'lucide-react';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { getMapData } from '@/features/map/api';
import type { MapData } from '@/features/map/api';

const RotaMap = dynamic(() => import('@/features/map/rota-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[480px] items-center justify-center rounded-xl border border-zinc-800 bg-[#111113]">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
    </div>
  ),
});

export default function MapaPage() {
  const { loading: authLoading } = useRequireAuth();
  const [data, setData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    getMapData()
      .then(setData)
      .catch(() => setError('Não foi possível carregar os dados do mapa.'))
      .finally(() => setLoading(false));
  }, [authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Carregando mapa...</span>
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

  if (!data) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-wide text-white uppercase">Mapa da Rota do Cerrado</h1>
        <p className="text-sm text-zinc-400">Distribuição dos legendários vinculados à Rota do Cerrado.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard icon={<Users className="h-5 w-5 text-orange-500" />} label="Total de Legendários" value={data.summary.total} />
        <SummaryCard icon={<Globe className="h-5 w-5 text-orange-500" />} label="Cidades" value={data.summary.cities} />
        <SummaryCard icon={<Building2 className="h-5 w-5 text-orange-500" />} label="Igrejas" value={data.summary.churches} />
      </div>

      {/* Interactive Map */}
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-[#111113] shadow-lg">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-300">Mapa da Manada</h2>
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-500/70" />
            Tamanho do ponto = nº de legendários na igreja
          </span>
        </div>
        <RotaMap churches={data.churches} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* By City */}
        <div className="rounded-xl border border-zinc-800 bg-[#111113] shadow-lg">
          <div className="border-b border-zinc-800 px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-300">Por Cidade</h2>
          </div>
          <div className="divide-y divide-zinc-800/60">
            {data.byCity.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-zinc-500">Nenhum dado disponível.</p>
            ) : (
              data.byCity.map((item) => (
                <div key={item.city} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-zinc-200">{item.city}</span>
                  </div>
                  <span className="rounded-full bg-orange-500/10 px-3 py-0.5 text-xs font-bold text-orange-400">
                    {item.count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* By Church */}
        <div className="rounded-xl border border-zinc-800 bg-[#111113] shadow-lg">
          <div className="border-b border-zinc-800 px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-300">Por Igreja</h2>
          </div>
          <div className="divide-y divide-zinc-800/60">
            {data.churches.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-zinc-500">Nenhuma igreja vinculada.</p>
            ) : (
              data.churches.map((church) => (
                <div key={church.id} className="flex items-center justify-between px-5 py-3 gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-200">{church.name}</p>
                    {church.city && (
                      <p className="text-xs text-zinc-500">{church.city}</p>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    <span className="rounded-full bg-orange-500/10 px-3 py-0.5 text-xs font-bold text-orange-400">
                      {church.count}
                    </span>
                    {church.latitude && church.longitude && (
                      <a
                        href={`https://www.google.com/maps?q=${church.latitude},${church.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded border border-zinc-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-400 hover:border-orange-500/50 hover:text-orange-400 transition-colors"
                        title="Ver no mapa"
                      >
                        <MapPin className="h-3 w-3" />
                        Mapa
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#111113] p-5 shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</p>
      </div>
      <p className="text-3xl font-black text-white">{value}</p>
    </div>
  );
}
