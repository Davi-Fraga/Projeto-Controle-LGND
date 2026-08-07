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
    <div className="flex h-[480px] items-center justify-center rounded-xl border border-line bg-surface">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
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
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-content-muted">Carregando mapa...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-feedback-danger/20 bg-feedback-danger/10 p-4 text-sm font-semibold text-feedback-danger">
        {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-wide text-content-strong uppercase">Mapa da Rota do Cerrado</h1>
        <p className="text-sm text-content-muted">Distribuição dos legendários vinculados à Rota do Cerrado.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard icon={<Users className="h-5 w-5 text-accent" />} label="Total de Legendários" value={data.summary.total} />
        <SummaryCard icon={<Globe className="h-5 w-5 text-accent" />} label="Cidades" value={data.summary.cities} />
        <SummaryCard icon={<Building2 className="h-5 w-5 text-accent" />} label="Igrejas" value={data.summary.churches} />
      </div>

      {/* Interactive Map */}
      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-content">Mapa da Manada</h2>
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-content-muted">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent/70" />
            Tamanho do ponto = nº de legendários na igreja
          </span>
        </div>
        <RotaMap churches={data.churches} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* By City */}
        <div className="rounded-xl border border-line bg-surface shadow-lg">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-content">Por Cidade</h2>
          </div>
          <div className="divide-y divide-line">
            {data.byCity.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-content-muted">Nenhum dado disponível.</p>
            ) : (
              data.byCity.map((item) => (
                <div key={item.city} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-content-muted flex-shrink-0" />
                    <span className="text-sm font-medium text-content-strong">{item.city}</span>
                  </div>
                  <span className="rounded-full bg-accent/10 px-3 py-0.5 text-xs font-bold text-accent">
                    {item.count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* By Church */}
        <div className="rounded-xl border border-line bg-surface shadow-lg">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-content">Por Igreja</h2>
          </div>
          <div className="divide-y divide-line">
            {data.churches.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-content-muted">Nenhuma igreja vinculada.</p>
            ) : (
              data.churches.map((church) => (
                <div key={church.id} className="flex items-center justify-between px-5 py-3 gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-content-strong">{church.name}</p>
                    {church.city && (
                      <p className="text-xs text-content-muted">{church.city}</p>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    <span className="rounded-full bg-accent/10 px-3 py-0.5 text-xs font-bold text-accent">
                      {church.count}
                    </span>
                    {church.latitude && church.longitude && (
                      <a
                        href={`https://www.google.com/maps?q=${church.latitude},${church.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded border border-line-strong px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-content-muted hover:border-accent/50 hover:text-accent transition-colors"
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
    <div className="rounded-xl border border-line bg-surface p-5 shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted">{label}</p>
      </div>
      <p className="text-3xl font-black text-content-strong">{value}</p>
    </div>
  );
}
