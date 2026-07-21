'use client';

/**
 * Busca remota com debounce e barreira anti-race, reutilizável por listagens que
 * pesquisam no backend (ex.: abas Igrejas e Líderes Espirituais).
 *
 * - `search`/`setSearch`: termo digitado (cru).
 * - dispara `fetcher(termo)` com debounce; um id monotônico garante que apenas a
 *   resposta/erro/finalização da requisição MAIS RECENTE altere o estado.
 * - distingue `initialLoading` (primeira carga) de `searching` (buscas seguintes)
 *   e expõe `error` como estado distinto — falha nunca vira "lista vazia".
 */

import { useEffect, useRef, useState } from 'react';
import { useDebounce } from './use-debounce';

type Options = { enabled?: boolean; delay?: number };

export function useDebouncedSearch<T>(fetcher: (search: string) => Promise<T>, initial: T, options?: Options) {
  const enabled = options?.enabled ?? true;
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, options?.delay ?? 300);
  const [data, setData] = useState<T>(initial);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(false);

  const reqId = useRef(0);
  const firstDone = useRef(false);
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    if (!enabled) return;
    const id = ++reqId.current;
    if (firstDone.current) setSearching(true);
    else setInitialLoading(true);
    setError(false);
    fetcherRef
      .current(debounced)
      .then((result) => {
        if (id !== reqId.current) return;
        setData(result);
      })
      .catch(() => {
        if (id !== reqId.current) return;
        setError(true);
      })
      .finally(() => {
        if (id !== reqId.current) return;
        firstDone.current = true;
        setInitialLoading(false);
        setSearching(false);
      });
  }, [enabled, debounced]);

  return { search, setSearch, debounced, data, setData, initialLoading, searching, error };
}
