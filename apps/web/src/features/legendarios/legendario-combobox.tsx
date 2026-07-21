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

type Props = {
  value: string;
  onChange: (value: string, label: string) => void;
  /** Rótulo já conhecido do valor atual (evita a busca por id na abertura). */
  initialLabel?: string;
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
  placeholder = 'Buscar por nome, cidade ou LGND...',
  noneLabel = 'Nenhum',
  clearable = true,
  disabled = false,
  limit = 20,
}: Props) {
  const [selectedLabel, setSelectedLabel] = useState(initialLabel ?? '');
  // Id cujo rótulo já resolvemos — evita refetch após seleção manual e loop de deps.
  const resolvedFor = useRef<string | null>(initialLabel ? value : null);

  // Resolve o rótulo do Legendário já vinculado na edição, quando não veio pronto.
  useEffect(() => {
    if (!value) {
      setSelectedLabel('');
      resolvedFor.current = null;
      return;
    }
    if (resolvedFor.current === value) return;
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
      fetchOptions={(search) => fetchLegendarioOptions(search, limit)}
      placeholder={placeholder}
      noneLabel={noneLabel}
      clearable={clearable}
      disabled={disabled}
    />
  );
}
