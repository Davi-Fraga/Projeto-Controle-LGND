'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

export function OrganogramaSection({ canEditPerson, canReorder, canStructureChange, canOpenLegendaryScreen }: { canEditPerson: boolean; canReorder: boolean; canStructureChange: boolean; canOpenLegendaryScreen: boolean }) {
  const [scope, setScope] = useState<Scope>('equipes');
  // Incrementa para forçar refetch da árvore após uma movimentação estrutural (Fase 3).
  const [reloadKey, setReloadKey] = useState(0);

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

  // Carrega as options de todos os escopos no início. Elas JÁ vêm escopadas pelo
  // UserScope no backend (getTeam/City/Top…Options), então servem para derivar
  // quais ABAS o usuário pode ver (decisão Q2: abas via escopo, não por permissão).
  const [optionsReady, setOptionsReady] = useState(false);
  useEffect(() => {
    Promise.allSettled([
      getTeamOrgChartOptions().then((r) => setTeamOptions(r.data)),
      getTopOrgChartOptions().then((r) => setTopOptions(r.data)),
      getCityOrgChartOptions().then((r) => setCityOptions(r.data)),
    ]).finally(() => setOptionsReady(true));
  }, []);

  // Abas visíveis conforme o escopo do usuário. Equipes/Coordenadores dependem de
  // acesso a equipes; Cidades, de cidades; TOPs, de TOPs. Fallback: se nada
  // resolveu ainda (ou o usuário não tem nenhum), mostra tudo para não travar.
  const visibleScopes = useMemo(() => {
    if (!optionsReady) return SCOPES;
    const allowed = new Set<Scope>();
    if (teamOptions.length > 0) { allowed.add('equipes'); allowed.add('coordenadores'); }
    if (cityOptions.length > 0) allowed.add('cidades');
    if (topOptions.length > 0) allowed.add('tops');
    const filtered = SCOPES.filter((s) => allowed.has(s.value));
    return filtered.length > 0 ? filtered : SCOPES;
  }, [optionsReady, teamOptions.length, cityOptions.length, topOptions.length]);

  // Se o escopo atual deixou de ser visível, cai para a primeira aba disponível.
  useEffect(() => {
    if (!visibleScopes.some((s) => s.value === scope)) setScope(visibleScopes[0].value);
  }, [visibleScopes, scope]);

  // Identidade da VISÃO (não do dado). Trocar de visão zera a tela; recarregar os
  // dados da mesma visão não — senão a árvore desmonta no meio de uma ação do usuário
  // e leva junto o que ele estava fazendo (foco, painel aberto, opção de desfazer).
  const viewKey = `${scope}|${teamId}|${citiesMode}|${city}`;
  const lastViewKey = useRef<string | null>(null);

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
    const isViewChange = lastViewKey.current !== viewKey;
    lastViewKey.current = viewKey;
    // Só a troca de visão limpa a tela e mostra o "Carregando". O refresh disparado por
    // uma ação (mover pessoa) mantém a árvore atual no ar até o dado novo chegar.
    if (isViewChange) {
      setRoot(null);
      setLoading(true);
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, teamId, citiesMode, city, reloadKey]);

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
        <div className="inline-flex rounded-lg border border-[#26262c] bg-[#111114] p-0.5">
          {visibleScopes.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setScope(item.value)}
              className={`rounded-md px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors ${
                scope === item.value ? 'bg-[#1e1e24] text-[#f97316]' : 'text-[#7c7c86] hover:text-[#cfcfd4]'
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
            className="h-9 rounded-lg border border-[#26262c] bg-[#111114] px-3 text-[13px] text-[#dcdce0] focus:border-[#f97316]/60 focus:outline-none"
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
            className="h-9 rounded-lg border border-[#26262c] bg-[#111114] px-3 text-[13px] text-[#dcdce0] focus:border-[#f97316]/60 focus:outline-none"
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
            className="h-9 rounded-lg border border-[#26262c] bg-[#111114] px-3 text-[13px] text-[#dcdce0] focus:border-[#f97316]/60 focus:outline-none"
          >
            <option value="">Selecione uma cidade…</option>
            {cityOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label} ({o.count})</option>
            ))}
          </select>
        ) : null}

        {showCitiesToggle ? (
          <div className="inline-flex rounded-lg border border-[#26262c] bg-[#111114] p-0.5">
            <button
              type="button"
              onClick={() => setCitiesMode('legendaries')}
              className={`rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] transition-colors ${
                citiesMode === 'legendaries' ? 'bg-[#1e1e24] text-[#f97316]' : 'text-[#7c7c86] hover:text-[#cfcfd4]'
              }`}
            >
              Por legendário
            </button>
            <button
              type="button"
              onClick={() => setCitiesMode('churches')}
              className={`rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] transition-colors ${
                citiesMode === 'churches' ? 'bg-[#1e1e24] text-[#f97316]' : 'text-[#7c7c86] hover:text-[#cfcfd4]'
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
          <TopOrgChartView topId={topId} canEditPerson={canEditPerson} canReorder={canReorder} canStructureChange={canStructureChange} canOpenLegendaryScreen={canOpenLegendaryScreen} />
        )
      ) : (
        <div className="h-[74vh] w-full overflow-hidden rounded-xl border border-[#1e1e24] bg-[#0b0b0d]">
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
              <p className="text-sm">Ainda não há dados para esta visão.</p>
            </div>
          ) : root ? (
            <OrgChartTree root={root} canEditPerson={canEditPerson} canReorder={canReorder} canStructureChange={canStructureChange} canOpenLegendaryScreen={canOpenLegendaryScreen} onDataChanged={() => setReloadKey((k) => k + 1)} />
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
