'use client';

/**
 * Adaptador de domínio TOP para o `AsyncCombobox` da fundação de busca reutilizável.
 * Não é um segundo componente de busca: reusa o mesmo `AsyncCombobox`, apenas injetando
 * como fonte o endpoint existente `GET /tops/:id/participants/options`.
 *
 * O valor persistido é o `TopParticipant.id` (não `Legendary.id`), pois membro de Família
 * aponta para o participante do TOP. Busca com `availableForFamily=true` para trazer só
 * participantes elegíveis (não cancelados e sem Família ativa no mesmo TOP).
 */

import { AsyncCombobox, type ComboboxOption } from '@/components/ui/AsyncCombobox';
import { getTopParticipantOptions } from './api';
import type { OptionItem } from './types';

/** Converte uma opção do endpoint de participantes em `ComboboxOption` com desambiguação. */
export function toParticipantOption(option: OptionItem): ComboboxOption {
  const fullName = (option.metadata?.fullName as string | undefined) ?? option.label;
  const city = option.metadata?.city as string | undefined;
  const lgndNumber = option.metadata?.lgndNumber as string | undefined;
  const parts = [city ?? undefined, lgndNumber ? `LGND ${lgndNumber}` : undefined].filter(Boolean) as string[];
  return { value: option.value, label: fullName, sublabel: parts.join(' · ') || undefined };
}

/** Busca participantes elegíveis para Família do TOP, já no formato do combobox. */
export async function fetchParticipantOptions(topId: string, search: string, limit = 20): Promise<ComboboxOption[]> {
  const response = await getTopParticipantOptions(topId, { search, limit, availableForFamily: true });
  return response.data.map(toParticipantOption);
}

type Props = {
  topId: string;
  value: string;
  selectedLabel?: string;
  onChange: (value: string, label: string) => void;
  disabled?: boolean;
};

export function ParticipantCombobox({ topId, value, selectedLabel, onChange, disabled = false }: Props) {
  return (
    <AsyncCombobox
      value={value}
      selectedLabel={selectedLabel}
      onChange={onChange}
      fetchOptions={(search) => fetchParticipantOptions(topId, search)}
      placeholder="Buscar participante por nome ou LGND..."
      noneLabel="Buscar participante"
      clearable={false}
      disabled={disabled}
    />
  );
}
