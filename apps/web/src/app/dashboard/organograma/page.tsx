'use client';

import { Network } from 'lucide-react';
import { OrganogramaSection } from '@/features/org-chart/organograma-section';
import { useRequireAuth } from '@/hooks/use-require-auth';

export default function OrganogramaPage() {
  const { loading: authLoading } = useRequireAuth();

  if (authLoading) return <main className="p-6 text-sm text-zinc-600">Carregando...</main>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <div className="flex items-center gap-3">
          <Network className="h-5 w-5 text-orange-500" />
          <h1 className="text-2xl font-black tracking-wide text-white uppercase">Organograma</h1>
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          Hierarquia da manada em árvore. Escolha o escopo (Equipes, Coordenadores, Cidades ou TOPs), use zoom, arraste para navegar e recolha subárvores.
        </p>
      </div>

      <OrganogramaSection />
    </div>
  );
}
