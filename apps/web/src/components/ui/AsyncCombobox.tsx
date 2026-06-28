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
 * Inclui debounce, guarda anti-race, estados de carregando/vazio e a opção "Nenhum".
 */

import { useEffect, useRef, useState } from 'react';
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
  disabled?: boolean;
};

export function AsyncCombobox({
  value,
  selectedLabel,
  onChange,
  fetchOptions,
  placeholder = 'Digite para buscar...',
  noneLabel = 'Nenhum',
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 300);
  const [options, setOptions] = useState<ComboboxOption[]>([]);
  const [loading, setLoading] = useState(false);

  const ref = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);
  // Mantém o fetcher mais recente sem forçar o efeito a depender da identidade da função.
  const fetchRef = useRef(fetchOptions);
  useEffect(() => {
    fetchRef.current = fetchOptions;
  });

  // Fecha ao clicar fora.
  useEffect(() => {
    function onDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // Busca no backend ao abrir e a cada termo (com debounce). Guarda anti-race: só a
  // resposta da requisição mais recente é aplicada.
  useEffect(() => {
    if (!open) return;
    const id = ++requestId.current;
    setLoading(true);
    fetchRef
      .current(debounced)
      .then((opts) => {
        if (id === requestId.current) setOptions(opts);
      })
      .catch(() => {
        if (id === requestId.current) setOptions([]);
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [open, debounced]);

  function select(nextValue: string, nextLabel: string) {
    onChange(nextValue, nextLabel);
    setOpen(false);
    setQuery('');
  }

  const triggerText = value ? (selectedLabel ?? '...') : noneLabel;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="input flex w-full items-center justify-between gap-2 text-left disabled:opacity-50"
        aria-haspopup="listbox"
        aria-expanded={open}
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
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
              className="w-full bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
            />
          </div>

          <ul className="max-h-60 overflow-auto py-1" role="listbox">
            <li>
              <button
                type="button"
                onClick={() => select('', noneLabel)}
                className="flex w-full items-center px-3 py-2 text-left text-sm text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
              >
                {noneLabel}
              </button>
            </li>

            {loading ? (
              <li className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Buscando...</li>
            ) : options.length === 0 && debounced.trim() ? (
              <li className="px-3 py-2 text-xs text-zinc-500">Nenhum resultado para “{debounced.trim()}”.</li>
            ) : (
              options.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => select(option.value, option.label)}
                    className={clsx(
                      'flex w-full flex-col px-3 py-2 text-left transition-colors hover:bg-zinc-900',
                      option.value === value ? 'bg-zinc-900/60' : '',
                    )}
                  >
                    <span className="text-sm font-medium text-zinc-100">{option.label}</span>
                    {option.sublabel ? <span className="text-[11px] text-zinc-500">{option.sublabel}</span> : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
