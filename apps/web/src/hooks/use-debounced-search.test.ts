import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedSearch } from './use-debounced-search';

describe('useDebouncedSearch', () => {
  afterEach(() => vi.clearAllMocks());

  it('faz a carga inicial e expõe o resultado', async () => {
    const fetcher = vi.fn().mockResolvedValue(['a']);
    const { result } = renderHook(() => useDebouncedSearch(fetcher, [] as string[]));

    await waitFor(() => expect(result.current.initialLoading).toBe(false));
    expect(result.current.data).toEqual(['a']);
    expect(fetcher).toHaveBeenCalledWith('');
  });

  it('aplica debounce: digitação rápida não gera uma requisição por tecla', async () => {
    const fetcher = vi.fn().mockResolvedValue([]);
    const { result } = renderHook(() => useDebouncedSearch(fetcher, [] as string[]));
    await waitFor(() => expect(result.current.initialLoading).toBe(false));

    act(() => result.current.setSearch('a'));
    act(() => result.current.setSearch('ab'));
    act(() => result.current.setSearch('abc'));

    await waitFor(() => expect(fetcher).toHaveBeenCalledWith('abc'));
    expect(fetcher).not.toHaveBeenCalledWith('a');
    expect(fetcher).not.toHaveBeenCalledWith('ab');
  });

  it('ignora resposta fora de ordem: a mais recente prevalece', async () => {
    const deferred: Array<(v: string[]) => void> = [];
    const fetcher = vi.fn().mockImplementation(() => new Promise<string[]>((res) => deferred.push(res)));
    const { result } = renderHook(() => useDebouncedSearch(fetcher, [] as string[]));

    await waitFor(() => expect(deferred).toHaveLength(1)); // carga inicial
    act(() => result.current.setSearch('novo'));
    await waitFor(() => expect(deferred).toHaveLength(2)); // busca do termo

    act(() => deferred[1](['NOVO']));
    await waitFor(() => expect(result.current.data).toEqual(['NOVO']));
    // resposta antiga chega depois e NÃO pode sobrescrever
    act(() => deferred[0](['ANTIGO']));
    expect(result.current.data).toEqual(['NOVO']);
  });

  it('falha vira estado de erro distinto, não lista vazia', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useDebouncedSearch(fetcher, ['pre'] as string[]));

    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.initialLoading).toBe(false);
  });
});
