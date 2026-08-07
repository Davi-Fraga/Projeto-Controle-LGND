'use client';

import { AsyncCombobox } from '@/components/ui/AsyncCombobox';
import { getTeamOptions } from './api';

type Props = {
  value: string;
  selectedLabel?: string;
  onChange: (value: string, label: string) => void;
};

export function TeamFilter({ value, selectedLabel, onChange }: Props) {
  return (
    <AsyncCombobox
      label="Equipe"
      value={value}
      selectedLabel={selectedLabel}
      onChange={onChange}
      noneLabel="Todas as equipes"
      placeholder="Buscar equipe..."
      fetchOptions={async (search) => {
        const response = await getTeamOptions(search, 20);
        return response.data.map((option) => ({
          value: option.value,
          label: option.label,
        }));
      }}
    />
  );
}
