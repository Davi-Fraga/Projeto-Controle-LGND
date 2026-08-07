'use client';

/**
 * Combobox genérico com busca no backend, para dropdowns de "lista cheia"
 * (centenas de itens) onde carregar tudo no front é inviável.
 *
 * Reutilizável: a fonte de dados é injetada por `fetchOptions(search)`. Para usar
 * em outro campo, passe um fetcher que devolva `ComboboxOption[]`:
 *
 *   <AsyncCombobox
 *     value={churchId}
 *     selectedLabel={churchLabel}
 *     onChange={(value, label) => { setChurchId(value); setChurchLabel(label); }}
 *     fetchOptions={async (s) => (await getChurchOptions(s)).data.map(toOption)}
 *   />
 *
 * Inclui debounce, guarda anti-race, estados distintos de carregando/vazio/erro,
 * navegação completa por teclado (ARIA combobox/listbox/option) e limpeza
 * configurável (`clearable`) com a opção "Nenhum" como padrão de campos opcionais.
 */

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronsUpDown, Search } from 'lucide-react';
import clsx from 'clsx';
import { useDebounce } from '@/hooks/use-debounce';

export type ComboboxOption = { value: string; label: string; sublabel?: string };

type Props = {
  value: string;
  /** Rótulo do valor atualmente selecionado (para exibir no edit antes de qualquer busca). */
  selectedLabel?: string;
  onChange: (value: string, label: string) => void;
  /** Fonte de dados injetável — torna o componente reutilizável em qualquer dropdown de lista cheia. */
  fetchOptions: (search: string) => Promise<ComboboxOption[]>;
  placeholder?: string;
  noneLabel?: string;
  /**
   * Nome acessível do gatilho — a FUNÇÃO do campo ("Equipe"), não o valor. Sem isto o nome
   * vem do conteúdo, que é o valor selecionado: um leitor de tela anuncia "Todas as equipes,
   * botão" e não diz de que campo se trata. Use o mesmo texto do rótulo visível.
   */
  label?: string;
  /** Quando `true` (padrão), oferece a opção de limpar ("Nenhum"). Campos obrigatórios passam `false`. */
  clearable?: boolean;
  disabled?: boolean;
};

export function AsyncCombobox({
  value,
  selectedLabel,
  onChange,
  fetchOptions,
  placeholder = 'Digite para buscar...',
  noneLabel = 'Nenhum',
  label,
  clearable = true,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 300);
  const [options, setOptions] = useState<ComboboxOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const requestId = useRef(0);
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  // Mantém o fetcher mais recente sem forçar o efeito a depender da identidade da função.
  const fetchRef = useRef(fetchOptions);
  useEffect(() => {
    fetchRef.current = fetchOptions;
  });

  // Entradas navegáveis por teclado: a opção "Nenhum" (quando limpável) precede os resultados.
  const entries: ComboboxOption[] = clearable ? [{ value: '', label: noneLabel }, ...options] : options;

  // Fecha ao clicar fora.
  useEffect(() => {
    function onDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // Busca no backend ao abrir e a cada termo (com debounce). Guarda anti-race: só a
  // resposta, o erro ou a finalização da requisição mais recente alteram a tela.
  useEffect(() => {
    if (!open) return;
    const id = ++requestId.current;
    setLoading(true);
    setError(false);
    setActiveIndex(-1);
    fetchRef
      .current(debounced)
      .then((opts) => {
        if (id !== requestId.current) return;
        setOptions(opts);
        setError(false);
      })
      .catch(() => {
        // Falha de rede NÃO é resultado vazio: mantém estado de erro distinto.
        if (id !== requestId.current) return;
        setOptions([]);
        setError(true);
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [open, debounced]);

  function select(nextValue: string, nextLabel: string) {
    onChange(nextValue, nextLabel);
    setOpen(false);
    setQuery('');
    setActiveIndex(-1);
  }

  function closeAndFocusTrigger() {
    setOpen(false);
    setQuery('');
    setActiveIndex(-1);
    triggerRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((current) => Math.min(entries.length - 1, current + 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((current) => Math.max(0, current - 1));
        break;
      case 'Enter': {
        if (activeIndex < 0 || activeIndex >= entries.length) return;
        event.preventDefault();
        const entry = entries[activeIndex];
        select(entry.value, entry.label);
        break;
      }
      case 'Escape':
        event.preventDefault();
        closeAndFocusTrigger();
        break;
      case 'Tab':
        // Fecha o popup sem capturar a navegação (foco segue naturalmente).
        setOpen(false);
        break;
      default:
        break;
    }
  }

  const triggerText = value ? (selectedLabel ?? '...') : noneLabel;
  const activeDescendant = activeIndex >= 0 ? optionId(activeIndex) : undefined;

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="input flex w-full items-center justify-between gap-2 text-left disabled:opacity-50"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
      >
        <span className={clsx('truncate', !value && 'text-zinc-500')}>{triggerText}</span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-zinc-500" />
      </button>

      {open ? (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl shadow-black/40">
          <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-zinc-500" />
            <input
              autoFocus
              role="combobox"
              aria-expanded={open}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={activeDescendant}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              className="w-full bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
            />
          </div>

          <ul id={listboxId} role="listbox" className="max-h-60 overflow-auto py-1">
            {clearable ? (
              <li id={optionId(0)} role="option" aria-selected={value === ''}>
                <button
                  type="button"
                  onClick={() => select('', noneLabel)}
                  className={clsx(
                    'flex w-full items-center px-3 py-2 text-left text-sm text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-200',
                    activeIndex === 0 ? 'bg-zinc-900 text-zinc-200' : '',
                  )}
                >
                  {noneLabel}
                </button>
              </li>
            ) : null}

            {loading ? (
              <li className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Buscando...</li>
            ) : error ? (
              <li className="px-3 py-2 text-xs text-rose-400">Erro ao buscar. Ajuste o termo e tente novamente.</li>
            ) : options.length === 0 && debounced.trim() ? (
              <li className="px-3 py-2 text-xs text-zinc-500">Nenhum resultado para “{debounced.trim()}”.</li>
            ) : (
              options.map((option, index) => {
                const entryIndex = clearable ? index + 1 : index;
                return (
                  <li key={option.value} id={optionId(entryIndex)} role="option" aria-selected={option.value === value}>
                    <button
                      type="button"
                      onClick={() => select(option.value, option.label)}
                      className={clsx(
                        'flex w-full flex-col px-3 py-2 text-left transition-colors hover:bg-zinc-900',
                        activeIndex === entryIndex ? 'bg-zinc-900' : option.value === value ? 'bg-zinc-900/60' : '',
                      )}
                    >
                      <span className="text-sm font-medium text-zinc-100">{option.label}</span>
                      {option.sublabel ? <span className="text-[11px] text-zinc-500">{option.sublabel}</span> : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
