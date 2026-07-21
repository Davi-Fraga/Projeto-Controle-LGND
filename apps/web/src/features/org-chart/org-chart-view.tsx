'use client';

import { useEffect, useState } from 'react';
import type { OrgChartNode, OrgChartView } from '@central-da-manada/shared';
import { Network } from 'lucide-react';
import { getOrgChart } from './api';
import { OrgChartTree } from './org-chart-tree';

const VIEWS: { value: OrgChartView; label: string }[] = [
  { value: 'teams', label: 'Equipes' },
  { value: 'families', label: 'Chefes de Família' },
  { value: 'cities', label: 'Cidades' },
];

export function OrgChartView({ topId, canEditPerson, canReorder, canStructureChange }: { topId: string; canEditPerson: boolean; canReorder: boolean; canStructureChange: boolean }) {
  const [view, setView] = useState<OrgChartView>('teams');
  const [root, setRoot] = useState<OrgChartNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getOrgChart(topId, view)
      .then((response) => {
        if (active) setRoot(response.data);
      })
      .catch(() => {
        if (active) setError('Não foi possível carregar o organograma.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [topId, view]);

  const isEmpty = !loading && !error && root !== null && root.children.length === 0;

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/80 p-1">
        {VIEWS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setView(item.value)}
            className={`rounded-md px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              view === item.value ? 'bg-orange-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="h-[74vh] w-full overflow-hidden rounded-xl border border-[#1e1e24] bg-[#0b0b0d]">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">Carregando organograma...</div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-sm font-semibold text-rose-400">{error}</div>
        ) : isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-500">
            <Network className="h-8 w-8" />
            <p className="text-sm">Ainda não há dados para esta visão.</p>
          </div>
        ) : root ? (
          // Move (Fase 3) não se aplica à visão de TOP (não é hierarquia de cidade);
          // onDataChanged é no-op aqui.
          <OrgChartTree root={root} canEditPerson={canEditPerson} canReorder={canReorder} canStructureChange={canStructureChange} onDataChanged={() => {}} />
        ) : null}
      </div>
    </div>
  );
}
