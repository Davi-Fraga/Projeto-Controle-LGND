'use client';

import { useEffect, useState } from 'react';
import { Trash2, ShieldCheck } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { ScreenAccessLevel } from '@central-da-manada/shared';
import type { ScreenAccessEntry, UserScreenAccessControl } from '@central-da-manada/shared';
import { AsyncCombobox, type ComboboxOption } from '@/components/ui/AsyncCombobox';
import { getChurches } from '@/features/churches/api';
import { getTeamsOptionsList, getTopOptions } from '@/features/tops/api';
import { getCityOrgChartOptions } from '@/features/org-chart/api';
import {
  addUserScope,
  getUserScreenAccess,
  removeUserScope,
  setScreenLevel,
  setScreenToggle,
  type ScopeTypeValue,
} from './api';

const SCOPE_LABEL: Record<ScopeTypeValue, string> = {
  CITY: 'Cidade',
  TEAM: 'Equipe',
  CHURCH: 'Igreja',
  TOP: 'TOP',
};

// Rótulos legíveis dos toggles de ação (o admin nunca vê a permission crua).
const TOGGLE_LABEL: Record<string, string> = {
  'organogram.group.reorder': 'Reordenar em subdivisão',
  'organogram.group.move': 'Mover pessoa entre grupos',
  'organogram.structure.change': 'Mudança estrutural crítica',
};

const LEVELS: { value: ScreenAccessLevel; label: string }[] = [
  { value: ScreenAccessLevel.NONE, label: 'Sem acesso' },
  { value: ScreenAccessLevel.VIEW, label: 'Ver' },
  { value: ScreenAccessLevel.EDIT, label: 'Ver e editar' },
];

export function AccessControlPanel({ userId }: { userId: string }) {
  const [acl, setAcl] = useState<UserScreenAccessControl | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingScreen, setSavingScreen] = useState<string | null>(null);

  // Mapas value→label para exibir os escopos já configurados (chips) de forma legível.
  const [labels, setLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    getUserScreenAccess(userId)
      .then((res) => setAcl(res.data))
      .catch(() => setError('Não foi possível carregar os acessos deste usuário.'))
      .finally(() => setLoading(false));
  }, [userId]);

  // Carrega rótulos para chips de escopo (equipes/igrejas/TOPs/cidades).
  useEffect(() => {
    const map: Record<string, string> = {};
    Promise.allSettled([
      getTeamsOptionsList({ limit: 100 }).then((r: any) => r.data?.forEach((o: any) => (map[o.value] = o.label))),
      getChurches().then((r: any) => r.data?.forEach((c: any) => (map[c.id] = c.name))),
      getTopOptions({ limit: 100 }).then((r: any) => r.data?.forEach((o: any) => (map[o.value] = o.label))),
      getCityOrgChartOptions().then((r: any) => r.data?.forEach((o: any) => (map[o.value] = o.label))),
    ]).then(() => setLabels((prev) => ({ ...prev, ...map })));
  }, []);

  async function changeLevel(screenId: string, level: ScreenAccessLevel) {
    setSavingScreen(screenId);
    setError(null);
    try {
      const res = await setScreenLevel(userId, screenId, level);
      setAcl(res.data);
    } catch {
      setError('Erro ao atualizar o acesso da tela.');
    } finally {
      setSavingScreen(null);
    }
  }

  async function changeToggle(screenId: string, toggleKey: string, on: boolean) {
    setSavingScreen(screenId);
    setError(null);
    try {
      const res = await setScreenToggle(userId, screenId, toggleKey, on);
      setAcl(res.data);
    } catch {
      setError('Erro ao atualizar a ação da tela.');
    } finally {
      setSavingScreen(null);
    }
  }

  async function addScope(type: ScopeTypeValue, value: string, label: string) {
    setError(null);
    try {
      const res = await addUserScope(userId, type, value);
      setAcl(res.data);
      setLabels((prev) => ({ ...prev, [value]: label }));
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 400
          ? 'Não foi possível adicionar: a tela precisa estar concedida antes de restringir o escopo, e o valor precisa ser uma entidade existente.'
          : 'Erro ao adicionar o escopo.',
      );
    }
  }

  async function removeScope(scopeId: string) {
    setError(null);
    try {
      const res = await removeUserScope(userId, scopeId);
      setAcl(res.data);
    } catch {
      setError('Erro ao remover o escopo.');
    }
  }

  if (loading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  if (!acl) {
    return <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-semibold text-rose-400">{error ?? 'Acessos indisponíveis.'}</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-semibold text-rose-400">{error}</div>
      )}

      <p className="text-xs text-zinc-500">
        Defina a quais <strong className="text-zinc-300">telas</strong> o usuário tem acesso e, quando aplicável, de qual <strong className="text-zinc-300">fatia</strong> (equipe, cidade, igreja ou TOP). As permissões técnicas são geridas automaticamente por baixo.
      </p>

      {acl.screens.map((screen) => (
        <ScreenRow
          key={screen.id}
          screen={screen}
          saving={savingScreen === screen.id}
          labels={labels}
          onLevel={(level) => changeLevel(screen.id, level)}
          onToggle={(toggleKey, on) => changeToggle(screen.id, toggleKey, on)}
          onAddScope={addScope}
          onRemoveScope={removeScope}
        />
      ))}
    </div>
  );
}

function ScreenRow({
  screen,
  saving,
  labels,
  onLevel,
  onToggle,
  onAddScope,
  onRemoveScope,
}: {
  screen: ScreenAccessEntry;
  saving: boolean;
  labels: Record<string, string>;
  onLevel: (level: ScreenAccessLevel) => void;
  onToggle: (toggleKey: string, on: boolean) => void;
  onAddScope: (type: ScopeTypeValue, value: string, label: string) => void;
  onRemoveScope: (scopeId: string) => void;
}) {
  const scopeTypes = screen.scopeTypes as ScopeTypeValue[];
  const hasScope = scopeTypes.length > 0;
  const granted = screen.level !== ScreenAccessLevel.NONE;
  const levels = screen.supportsEdit ? LEVELS : LEVELS.filter((l) => l.value !== ScreenAccessLevel.EDIT);
  const hasToggles = screen.actionToggles.length > 0;

  return (
    <section className={`rounded-xl border bg-[#111113] p-4 ${screen.scopeMissing ? 'border-amber-500/60' : 'border-zinc-800'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className={`h-4 w-4 ${granted ? 'text-orange-500' : 'text-zinc-600'}`} />
          <span className="text-sm font-bold text-white">{screen.label}</span>
          {screen.scopeMissing && (
            <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-400">
              Sem escopo
            </span>
          )}
        </div>
        <div className="inline-flex overflow-hidden rounded-lg border border-zinc-800">
          {levels.map((l) => (
            <button
              key={l.value}
              type="button"
              disabled={saving}
              onClick={() => onLevel(l.value)}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors disabled:opacity-50 ${
                screen.level === l.value ? 'bg-orange-600 text-white' : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {hasToggles && granted && (
        <div className="mt-3 border-t border-zinc-850 pt-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Ações permitidas</p>
          <div className="mt-2 flex flex-col gap-2">
            {screen.actionToggles.map((toggle) => (
              <label key={toggle.key} className="inline-flex items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={toggle.granted}
                  disabled={saving}
                  onChange={(e) => onToggle(toggle.key, e.target.checked)}
                  className="h-4 w-4 accent-orange-600 disabled:opacity-50"
                />
                <span>{TOGGLE_LABEL[toggle.key] ?? toggle.key}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {hasScope && granted && (
        <div className="mt-3 border-t border-zinc-850 pt-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Escopo (a qual fatia)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {screen.scopes.length === 0 ? (
              <span className="text-xs font-semibold text-amber-400">
                ⚠ Sem escopo: este usuário não verá nenhum dado desta tela. Adicione ao menos um escopo abaixo.
              </span>
            ) : (
              screen.scopes.map((scope) => (
                <span key={scope.id} className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200">
                  <span className="font-bold uppercase tracking-wide text-orange-400">{SCOPE_LABEL[scope.type as ScopeTypeValue]}</span>
                  <span>{labels[scope.value] ?? scope.value}</span>
                  <button onClick={() => onRemoveScope(scope.id)} className="text-zinc-500 hover:text-rose-400" title="Remover escopo">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))
            )}
          </div>
          <ScopeAdder scopeTypes={scopeTypes} onAdd={onAddScope} />
        </div>
      )}
    </section>
  );
}

function ScopeAdder({ scopeTypes, onAdd }: { scopeTypes: ScopeTypeValue[]; onAdd: (type: ScopeTypeValue, value: string, label: string) => void }) {
  const [type, setType] = useState<ScopeTypeValue>(scopeTypes[0]);

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2">
      {scopeTypes.length > 1 && (
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ScopeTypeValue)}
          className="h-9 rounded-lg border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200"
        >
          {scopeTypes.map((t) => <option key={t} value={t}>{SCOPE_LABEL[t]}</option>)}
        </select>
      )}

      {/* Todos os tipos usam o MESMO seletor: busca as entidades reais do backend,
          filtra com tolerância a acento, e só permite escolher itens existentes. */}
      <div className="w-72">
        <AsyncCombobox
          key={type}
          value=""
          onChange={(value, label) => { if (value) onAdd(type, value, label); }}
          fetchOptions={(search) => fetchScopeOptions(type, search)}
          placeholder={`Buscar ${SCOPE_LABEL[type].toLowerCase()}...`}
          noneLabel="—"
        />
      </div>
    </div>
  );
}

// Cache por tipo das opções reais (listas pequenas) — evita refetch a cada tecla.
const scopeOptionsCache: Partial<Record<ScopeTypeValue, ComboboxOption[]>> = {};

async function loadScopeOptions(type: ScopeTypeValue): Promise<ComboboxOption[]> {
  if (scopeOptionsCache[type]) return scopeOptionsCache[type]!;
  let opts: ComboboxOption[] = [];
  if (type === 'CITY') {
    const res: any = await getCityOrgChartOptions();
    opts = (res.data ?? []).map((o: any) => ({ value: o.value, label: o.label }));
  } else if (type === 'TEAM') {
    const res: any = await getTeamsOptionsList({ limit: 100 });
    opts = (res.data ?? []).map((o: any) => ({ value: o.value, label: o.label }));
  } else if (type === 'TOP') {
    const res: any = await getTopOptions({ limit: 100 });
    opts = (res.data ?? []).map((o: any) => ({ value: o.value, label: o.label, sublabel: o.metadata?.city ?? undefined }));
  } else {
    const res: any = await getChurches();
    opts = (res.data ?? []).map((c: any) => ({ value: c.id, label: c.name, sublabel: c.city ?? undefined }));
  }
  scopeOptionsCache[type] = opts;
  return opts;
}

// Filtra a lista real do backend de forma tolerante a acento/caixa (ex.: "cald" -> "Caldas Novas").
async function fetchScopeOptions(type: ScopeTypeValue, search: string): Promise<ComboboxOption[]> {
  const all = await loadScopeOptions(type);
  const q = stripAccents(search);
  if (!q) return all.slice(0, 50);
  return all
    .filter((o) => stripAccents(o.label).includes(q) || (o.sublabel ? stripAccents(o.sublabel).includes(q) : false))
    .slice(0, 50);
}

function stripAccents(value: string): string {
  return [...value.normalize('NFD')]
    .filter((ch) => {
      const c = ch.codePointAt(0)!;
      return c < 0x0300 || c > 0x036f;
    })
    .join('')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
