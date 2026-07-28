'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, Trash2, X } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { ScopeSelectionMode, ScopeValueSource, ScreenAccessLevel } from '@central-da-manada/shared';
import type { ScopeValueEntry, ScreenAccessEntry, ScreenScopeState, UserScreenAccessControl } from '@central-da-manada/shared';
import type { ComboboxOption } from '@/components/ui/AsyncCombobox';
import { getChurches } from '@/features/churches/api';
import { getTeamsOptionsList, getTopOptions } from '@/features/tops/api';
import { getCityOrgChartOptions } from '@/features/org-chart/api';
import { getUserScreenAccess, setScopeSelection, setScreenLevel, setScreenToggle, type ScopeTypeValue } from './api';

const SCOPE_LABEL: Record<ScopeTypeValue, string> = {
  CITY: 'Cidade',
  TEAM: 'Equipe',
  CHURCH: 'Igreja',
  TOP: 'TOP',
};

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

  useEffect(() => {
    getUserScreenAccess(userId)
      .then((res) => setAcl(res.data))
      .catch(() => setError('Não foi possível carregar os acessos deste usuário.'))
      .finally(() => setLoading(false));
  }, [userId]);

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

  // Substituição ATÔMICA do escopo de um tipo (um único request). O estado local é
  // substituído pela resposta normalizada da API (nunca sucesso parcial).
  async function applyScopeSelection(type: ScopeTypeValue, mode: ScopeSelectionMode, values: string[]) {
    setError(null);
    try {
      const res = await setScopeSelection(userId, type, mode, values);
      setAcl(res.data);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? 'Esta dimensão está em "Todos". Troque o modo antes de editar itens.'
          : err instanceof ApiError && err.status === 400
            ? 'Não foi possível aplicar: confira a seleção (a tela precisa estar concedida e os itens devem existir).'
            : 'Erro ao aplicar o escopo.',
      );
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
          allScreens={acl.screens}
          saving={savingScreen === screen.id}
          onLevel={(level) => changeLevel(screen.id, level)}
          onToggle={(toggleKey, on) => changeToggle(screen.id, toggleKey, on)}
          onApplyScope={applyScopeSelection}
        />
      ))}
    </div>
  );
}

function ScreenRow({
  screen,
  allScreens,
  saving,
  onLevel,
  onToggle,
  onApplyScope,
}: {
  screen: ScreenAccessEntry;
  allScreens: ScreenAccessEntry[];
  saving: boolean;
  onLevel: (level: ScreenAccessLevel) => void;
  onToggle: (toggleKey: string, on: boolean) => void;
  onApplyScope: (type: ScopeTypeValue, mode: ScopeSelectionMode, values: string[]) => Promise<void>;
}) {
  const scopeTypes = screen.scopeTypes as ScopeTypeValue[];
  const hasScope = scopeTypes.length > 0;
  const granted = screen.level !== ScreenAccessLevel.NONE;
  const levels = screen.supportsEdit ? LEVELS : LEVELS.filter((l) => l.value !== ScreenAccessLevel.EDIT);
  const hasToggles = screen.actionToggles.length > 0;
  const stateByType = new Map((screen.scopeStates ?? []).map((s) => [s.type as ScopeTypeValue, s]));

  return (
    <section className={`rounded-xl border bg-[#111113] p-4 ${screen.scopeMissing ? 'border-amber-500/60' : 'border-zinc-800'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className={`h-4 w-4 ${granted ? 'text-orange-500' : 'text-zinc-600'}`} />
          <span className="text-sm font-bold text-white">{screen.label}</span>
          {screen.scopeMissing && (
            <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-400">
              Acesso ainda não efetivo
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
        <div className="mt-3 space-y-4 border-t border-zinc-850 pt-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Escopo (a qual fatia)</p>
          {screen.scopeMissing && <p className="text-xs text-amber-400">A aba ficará escondida até existir uma dimensão de escopo satisfatória. Nenhuma permission ou acesso total será concedido automaticamente.</p>}
          {scopeTypes.map((type) => (
            <ScopeDimensionEditor
              key={type}
              type={type}
              state={stateByType.get(type)}
              // O escopo é ÚNICO por dimensão (chave userId+type no banco), não por tela.
              // Estas são as outras telas concedidas que a mesma edição afeta.
              alsoAffects={otherGrantedScreensUsing(allScreens, screen.id, type)}
              onApply={onApplyScope}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ScopeDimensionEditor({
  type,
  state,
  alsoAffects,
  onApply,
}: {
  type: ScopeTypeValue;
  state: ScreenScopeState | undefined;
  alsoAffects: string[];
  onApply: (type: ScopeTypeValue, mode: ScopeSelectionMode, values: string[]) => Promise<void>;
}) {
  // O controle de modo reflete o CONFIGURADO — é o que a ação do admin altera. O efetivo
  // (composto com os vínculos derivados da função) é informação, não estado do controle.
  const configuredMode = state?.configuredMode ?? ScopeSelectionMode.MISSING;
  const configuredValues = state?.configuredValues ?? [];
  const effectiveValues = state?.effectiveValues ?? [];
  const derived = effectiveValues.filter((v) => v.sources.includes(ScopeValueSource.ROLE_DERIVED) && !v.sources.includes(ScopeValueSource.EXPLICIT));

  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [options, setOptions] = useState<ComboboxOption[]>([]);
  const [prepared, setPrepared] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  // Rótulo dos itens em preparação: o backend já rotulou os configurados, então a edição
  // nunca depende das options terem carregado para mostrar nome em vez de identificador.
  const configuredLabels = new Map(configuredValues.map((v) => [v.value, v.label ?? null]));
  const labelOf = (value: string) =>
    options.find((o) => o.value === value)?.label ?? configuredLabels.get(value) ?? SCOPE_FALLBACK_LABEL;

  async function beginSelect() {
    setEditing(true);
    setSearch('');
    setPrepared(new Set(configuredValues.map((v) => v.value)));
    const opts = await loadScopeOptions(type);
    setOptions(opts);
  }

  async function apply(mode: ScopeSelectionMode, values: string[]) {
    setBusy(true);
    try {
      await onApply(type, mode, values);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  const filtered = filterOptions(options, search);

  return (
    <div className="rounded-lg border border-zinc-800/70 bg-zinc-950/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-orange-400">{SCOPE_LABEL[type]}</span>
        <div className="inline-flex overflow-hidden rounded-lg border border-zinc-800 text-[11px] font-bold uppercase tracking-wide">
          <button
            type="button"
            disabled={busy}
            onClick={() => apply(ScopeSelectionMode.MISSING, [])}
            className={`px-2.5 py-1 transition-colors disabled:opacity-50 ${!editing && configuredMode === ScopeSelectionMode.MISSING ? 'bg-zinc-700 text-white' : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200'}`}
          >
            Nenhum
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={beginSelect}
            className={`px-2.5 py-1 transition-colors disabled:opacity-50 ${editing || configuredMode === ScopeSelectionMode.SELECTED ? 'bg-orange-600 text-white' : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200'}`}
          >
            Selecionados
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => apply(ScopeSelectionMode.ALL, [])}
            className={`px-2.5 py-1 transition-colors disabled:opacity-50 ${!editing && configuredMode === ScopeSelectionMode.ALL ? 'bg-orange-600 text-white' : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200'}`}
          >
            Todos
          </button>
        </div>
      </div>

      {/* Alcance da edição: o escopo é global por dimensão, não por tela. */}
      {alsoAffects.length > 0 && (
        <p className="mt-2 text-[11px] text-zinc-500">
          Este escopo de <strong className="text-zinc-400">{SCOPE_LABEL[type].toLowerCase()}</strong> é único por usuário:
          alterá-lo aqui também vale para {formatScreenList(alsoAffects)}.
        </p>
      )}

      {/* Estado atual (fora de edição) */}
      {!editing && (
        <div className="mt-2 space-y-1">
          {configuredMode === ScopeSelectionMode.ALL && (
            <p className="text-xs text-zinc-400">Todos — inclui novos cadastros automaticamente.</p>
          )}
          {configuredMode === ScopeSelectionMode.MISSING && derived.length === 0 && (
            <p className="text-xs font-semibold text-amber-400">⚠ Sem escopo: este usuário não verá nenhum dado desta tela.</p>
          )}
          {configuredMode === ScopeSelectionMode.SELECTED && (
            <div className="flex flex-wrap gap-1.5">
              {configuredValues.map((v) => (
                <ScopeValueChip key={v.value} entry={v} />
              ))}
            </div>
          )}
          {/* Derivados da função aparecem à parte, read-only — não são editáveis aqui e não
              devem fazer o controle indicar um modo que o admin não escolheu. */}
          {derived.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-zinc-600">Vindos da função do usuário (não editáveis)</p>
              <div className="flex flex-wrap gap-1.5">
                {derived.map((v) => (
                  <ScopeValueChip key={v.value} entry={v} derived />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edição preparada (multi-seleção) */}
      {editing && (
        <div className="mt-2 space-y-2">
          {prepared.size > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {[...prepared].map((value) => (
                <span key={value} className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-200">
                  {labelOf(value)}
                  <button type="button" onClick={() => setPrepared((p) => { const n = new Set(p); n.delete(value); return n; })} className="text-zinc-500 hover:text-rose-400">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Buscar ${SCOPE_LABEL[type].toLowerCase()}...`}
            aria-label={`Buscar ${SCOPE_LABEL[type].toLowerCase()}`}
            className="input w-full text-sm"
          />
          <div className="max-h-40 overflow-y-auto rounded-md border border-zinc-800">
            {filtered.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900/60">
                <input
                  type="checkbox"
                  checked={prepared.has(o.value)}
                  onChange={() => setPrepared((p) => { const n = new Set(p); n.has(o.value) ? n.delete(o.value) : n.add(o.value); return n; })}
                  className="h-4 w-4 accent-orange-600"
                />
                <span>{o.label}</span>
                {o.sublabel && <span className="text-zinc-600">— {o.sublabel}</span>}
              </label>
            ))}
            {filtered.length === 0 && <p className="px-2.5 py-2 text-xs text-zinc-600">Nenhum resultado.</p>}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy || prepared.size === 0}
              onClick={() => apply(ScopeSelectionMode.SELECTED, [...prepared])}
              className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-orange-500 disabled:opacity-50"
            >
              Aplicar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(false)}
              className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-400 transition-colors hover:text-zinc-200 disabled:opacity-50"
            >
              Cancelar
            </button>
            <span className="text-[10px] text-zinc-600">
              {prepared.size === 0
                ? 'Marque ao menos um item para aplicar — ou use "Nenhum"/"Todos".'
                : `${prepared.size} selecionado(s)`}
            </span>
          </div>
          {/* Sem isto, entrar em "Selecionados" numa dimensão com vínculos da função parece
              um estado travado: o admin não vê por que "Aplicar" está desabilitado se já
              existem itens listados fora da edição. */}
          {derived.length > 0 && (
            <p className="text-[10px] text-zinc-600">
              Os itens vindos da função do usuário continuam valendo e não entram nesta seleção.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Último recurso quando nem o backend nem as options trouxeram rótulo. NUNCA cair no
// identificador: o admin não consegue conferir escopo lendo UUID — foi o que deixou um
// usuário em modo "Todos" passar por "escopo configurado" até virar chamado de produção.
const SCOPE_FALLBACK_LABEL = 'Item sem nome';

// Chip de um valor de escopo. `missing` = a entidade não existe mais; sinaliza em vez de
// exibir o identificador cru.
function ScopeValueChip({ entry, derived = false }: { entry: ScopeValueEntry; derived?: boolean }) {
  if (entry.missing) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400"
        title="O item deste escopo não existe mais (excluído). Remova-o ou selecione outro."
      >
        Item removido
        <span className="text-[9px] uppercase tracking-wide text-amber-500/70">indisponível</span>
      </span>
    );
  }

  const className = derived
    ? 'inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-0.5 text-xs text-zinc-400'
    : 'inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-200';

  return (
    <span className={className} title={derived ? 'Origem: função do usuário (não editável)' : undefined}>
      {entry.label || SCOPE_FALLBACK_LABEL}
      {entry.sublabel && <span className="text-zinc-500">— {entry.sublabel}</span>}
      {derived && <span className="text-[9px] uppercase tracking-wide text-zinc-500">função</span>}
    </span>
  );
}

// Telas CONCEDIDAS (≠ NONE), fora da atual, que usam a mesma dimensão de escopo. Derivado
// da própria resposta — o escopo é global por dimensão, então a edição alcança todas elas.
function otherGrantedScreensUsing(
  screens: ScreenAccessEntry[],
  currentScreenId: string,
  type: ScopeTypeValue,
): string[] {
  return screens
    .filter(
      (screen) =>
        screen.id !== currentScreenId &&
        screen.level !== ScreenAccessLevel.NONE &&
        (screen.scopeTypes as ScopeTypeValue[]).includes(type),
    )
    .map((screen) => screen.label);
}

function formatScreenList(labels: string[]): string {
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`;
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

function filterOptions(all: ComboboxOption[], search: string): ComboboxOption[] {
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
