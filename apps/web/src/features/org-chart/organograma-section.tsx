'use client';

import { useEffect, useState } from 'react';
import type { OrgChartNode } from '@central-da-manada/shared';
import { teamDisplayName } from '@central-da-manada/shared';
import { Network } from 'lucide-react';
import type { OptionItem } from '@/features/tops/types';
import { getCitiesOrgChart, getCityOrgChartOptions, getCoordinatorsOrgChart, getTeamOrgChart, getTeamOrgChartOptions, getTopOrgChartOptions, type CitiesMode, type CityOption } from './api';
import { OrgChartTree } from './org-chart-tree';
import { OrgChartView as TopOrgChartView } from './org-chart-view';

type Scope = 'equipes' | 'coordenadores' | 'cidades' | 'tops';

const SCOPES: { value: Scope; label: string }[] = [
  { value: 'equipes', label: 'Equipes' },
  { value: 'coordenadores', label: 'Coordenadores' },
  { value: 'cidades', label: 'Cidades' },
  { value: 'tops', label: 'TOPs' },
];

export function OrganogramaSection() {
  const [scope, setScope] = useState<Scope>('equipes');

  // Secondary selectors
  const [teamOptions, setTeamOptions] = useState<OptionItem[]>([]);
  const [teamId, setTeamId] = useState<string>('');
  const [topOptions, setTopOptions] = useState<OptionItem[]>([]);
  const [topId, setTopId] = useState<string>('');
  const [citiesMode, setCitiesMode] = useState<CitiesMode>('legendaries');
  const [cityOptions, setCityOptions] = useState<CityOption[]>([]);
  const [city, setCity] = useState<string>('');

  // Tree data (for the global scopes; the TOPs scope renders its own view)
  const [root, setRoot] = useState<OrgChartNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load option lists for the scopes that need a secondary selector.
  useEffect(() => {
    if (scope === 'equipes' && teamOptions.length === 0) {
      getTeamOrgChartOptions().then((r) => setTeamOptions(r.data)).catch(() => {});
    }
    if (scope === 'tops' && topOptions.length === 0) {
      getTopOrgChartOptions().then((r) => setTopOptions(r.data)).catch(() => {});
    }
    if (scope === 'cidades' && cityOptions.length === 0) {
      getCityOrgChartOptions().then((r) => setCityOptions(r.data)).catch(() => {});
    }
  }, [scope, teamOptions.length, topOptions.length, cityOptions.length]);

  // Fetch the tree for global scopes.
  useEffect(() => {
    if (scope === 'tops') return;
    if (scope === 'equipes' && !teamId) {
      setRoot(null);
      return;
    }
    if (scope === 'cidades' && !city) {
      setRoot(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    const request =
      scope === 'equipes'
        ? getTeamOrgChart(teamId)
        : scope === 'coordenadores'
          ? getCoordinatorsOrgChart()
          : getCitiesOrgChart(citiesMode, city);
    request
      .then((r) => {
        if (active) setRoot(r.data);
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
  }, [scope, teamId, citiesMode, city]);

  const showTeamPicker = scope === 'equipes';
  const showTopPicker = scope === 'tops';
  const showCitiesToggle = scope === 'cidades';
  const needsTeam = scope === 'equipes' && !teamId;
  const needsTop = scope === 'tops' && !topId;
  const needsCity = scope === 'cidades' && !city;
  const isEmpty = scope !== 'tops' && !loading && !error && root !== null && root.children.length === 0;

  return (
    <div className="space-y-4">
      {/* Scope selector */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/80 p-1">
          {SCOPES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setScope(item.value)}
              className={`rounded-md px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                scope === item.value ? 'bg-orange-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Secondary selectors */}
        {showTeamPicker ? (
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="h-9 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-200 focus:border-orange-500 focus:outline-none"
          >
            <option value="">Selecione uma equipe…</option>
            {teamOptions.map((o) => (
              <option key={o.value} value={o.value}>{teamDisplayName(o.label)}</option>
            ))}
          </select>
        ) : null}

        {showTopPicker ? (
          <select
            value={topId}
            onChange={(e) => setTopId(e.target.value)}
            className="h-9 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-200 focus:border-orange-500 focus:outline-none"
          >
            <option value="">Selecione um TOP…</option>
            {topOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : null}

        {showCitiesToggle ? (
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="h-9 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-200 focus:border-orange-500 focus:outline-none"
          >
            <option value="">Selecione uma cidade…</option>
            {cityOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label} ({o.count})</option>
            ))}
          </select>
        ) : null}

        {showCitiesToggle ? (
          <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/80 p-1">
            <button
              type="button"
              onClick={() => setCitiesMode('legendaries')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                citiesMode === 'legendaries' ? 'bg-orange-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Por legendário
            </button>
            <button
              type="button"
              onClick={() => setCitiesMode('churches')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                citiesMode === 'churches' ? 'bg-orange-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Por igreja
            </button>
          </div>
        ) : null}
      </div>

      {/* Canvas */}
      {scope === 'tops' ? (
        needsTop ? (
          <Placeholder text="Selecione um TOP para ver o organograma." />
        ) : (
          <TopOrgChartView topId={topId} />
        )
      ) : (
        <div className="h-[70vh] w-full overflow-hidden rounded-xl border border-zinc-800 bg-[#0d0d0f]">
          {needsTeam ? (
            <Centered>Selecione uma equipe para ver o organograma.</Centered>
          ) : needsCity ? (
            <Centered>Selecione uma cidade para ver o organograma.</Centered>
          ) : loading ? (
            <Centered>Carregando organograma…</Centered>
          ) : error ? (
            <Centered className="font-semibold text-rose-400">{error}</Centered>
          ) : isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-500">
              <Network className="h-8 w-8" />
              <p className="text-sm">Nenhum dado para esta visão ainda.</p>
            </div>
          ) : root ? (
            <OrgChartTree root={root} />
          ) : null}
        </div>
      )}
    </div>
  );
}

function Centered({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex h-full items-center justify-center text-sm text-zinc-500 ${className}`}>{children}</div>;
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="flex h-[70vh] w-full items-center justify-center rounded-xl border border-zinc-800 bg-[#0d0d0f] text-sm text-zinc-500">
      {text}
    </div>
  );
}
