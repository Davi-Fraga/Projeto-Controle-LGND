'use client';

/**
 * Adaptador canônico de seleção de Legendário. Único ponto que converte o payload
 * de `GET /legendarios/options` em `ComboboxOption` (nome + cidade + número LGND)
 * e resolve o rótulo do valor atual na edição. Todos os campos que selecionam um
 * Legendário devem consumir este componente — nada de mapeamento local duplicado.
 */

import { useEffect, useRef, useState } from 'react';
import { AsyncCombobox, type ComboboxOption } from '@/components/ui/AsyncCombobox';
import { getLegendario, getLegendarioOptions, type LegendarioOption } from './api';

/** Converte uma opção do endpoint em `ComboboxOption` com sublabel de desambiguação. */
export function toLegendarioOption(option: LegendarioOption): ComboboxOption {
  const fullName = option.metadata?.fullName ?? option.label;
  const parts = [
    option.metadata?.city ?? undefined,
    option.metadata?.lgndNumber ? `LGND ${option.metadata.lgndNumber}` : undefined,
  ].filter(Boolean) as string[];
  return { value: option.value, label: fullName, sublabel: parts.join(' · ') || undefined };
}

/** Busca opções no backend (escopadas pelo `AccessPolicyService`) já no formato do combobox. */
export async function fetchLegendarioOptions(search: string, limit = 20): Promise<ComboboxOption[]> {
  const response = await getLegendarioOptions(search, limit);
  return response.data.map(toLegendarioOption);
}

/**
 * Adapta um endpoint CONTEXTUAL de candidatos ao mesmo formato do combobox. Existe para que o
 * mapeamento `LegendarioOption → ComboboxOption` continue num lugar só: cada formulário passa a
 * sua função de busca, não a sua própria conversão.
 */
export function contextualLegendarioSource(
  fetcher: (search: string, limit: number) => Promise<{ data: LegendarioOption[] }>,
) {
  return async (search: string, limit: number): Promise<ComboboxOption[]> => {
    const response = await fetcher(search, limit);
    return response.data.map(toLegendarioOption);
  };
}

type Props = {
  value: string;
  onChange: (value: string, label: string) => void;
  /** Rótulo já conhecido do valor atual (evita a busca por id na abertura). */
  initialLabel?: string;
  /**
   * Fonte contextual de opções — `GET /<pai>/:id/<algo>-candidates/options`, autorizado pela
   * permission da AÇÃO. Quando informada, substitui `GET /legendarios/options` e o componente
   * deixa de tentar resolver o rótulo por `GET /legendarios/:id`: quem tem só a permission da
   * ação tomaria `403` nessa rota. Nesses casos, passe `initialLabel`.
   */
  fetchOptions?: (search: string, limit: number) => Promise<ComboboxOption[]>;
  placeholder?: string;
  noneLabel?: string;
  clearable?: boolean;
  disabled?: boolean;
  limit?: number;
};

export function LegendarioCombobox({
  value,
  onChange,
  initialLabel,
  fetchOptions,
  placeholder = 'Buscar por nome, cidade ou LGND...',
  noneLabel = 'Nenhum',
  clearable = true,
  disabled = false,
  limit = 20,
}: Props) {
  const [selectedLabel, setSelectedLabel] = useState(initialLabel ?? '');
  // Id cujo rótulo já resolvemos — evita refetch após seleção manual e loop de deps.
  const resolvedFor = useRef<string | null>(initialLabel ? value : null);
  // Lido por ref, não por dependência: um `fetchOptions` inline muda a cada render e
  // reiniciaria o efeito em loop antes de o rótulo chegar.
  const contextualFetch = useRef(fetchOptions);
  contextualFetch.current = fetchOptions;

  // Resolve o rótulo do Legendário já vinculado na edição, quando não veio pronto.
  useEffect(() => {
    if (!value) {
      setSelectedLabel('');
      resolvedFor.current = null;
      return;
    }
    if (resolvedFor.current === value) return;
    if (contextualFetch.current) {
      // Fonte contextual não concede o detalhe da pessoa — não sondar `/legendarios/:id`.
      setSelectedLabel('(legendário vinculado)');
      resolvedFor.current = value;
      return;
    }
    let active = true;
    getLegendario(value)
      .then((response) => {
        if (!active) return;
        const l = response.data;
        setSelectedLabel(l.lgndNumber ? `${l.fullName} - LGND ${l.lgndNumber}` : l.fullName);
        resolvedFor.current = value;
      })
      .catch(() => {
        if (!active) return;
        setSelectedLabel('(legendário vinculado)');
        resolvedFor.current = value;
      });
    return () => {
      active = false;
    };
  }, [value]);

  return (
    <AsyncCombobox
      value={value}
      selectedLabel={selectedLabel}
      onChange={(nextValue, label) => {
        setSelectedLabel(nextValue ? label : '');
        resolvedFor.current = nextValue || null;
        onChange(nextValue, label);
      }}
      fetchOptions={(search) => (fetchOptions ?? fetchLegendarioOptions)(search, limit)}
      placeholder={placeholder}
      noneLabel={noneLabel}
      clearable={clearable}
      disabled={disabled}
    />
  );
}
