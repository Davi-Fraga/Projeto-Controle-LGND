import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SocialActionForm } from './social-action-form';

vi.mock('@/features/legendarios/legendario-combobox', () => ({
  LegendarioCombobox: ({ onChange, noneLabel, clearable }: any) => (
    <button type="button" aria-label={noneLabel} data-clearable={String(clearable)} onClick={() => onChange('lgnd-1', 'Fulano')}>
      {noneLabel}
    </button>
  ),
}));

const base = {
  title: '', description: '', location: '', city: '', status: 'PLANNED',
  startDate: '', endDate: '', responsibleLegendaryId: '', notes: '',
} as any;

describe('SocialActionForm', () => {
  it('usa LegendarioCombobox obrigatório para o responsável e propaga o id (sem UUID manual)', () => {
    const onChange = vi.fn();
    render(<SocialActionForm value={base} onChange={onChange} onSubmit={vi.fn()} />);

    const combo = screen.getByRole('button', { name: 'Selecione o responsável' });
    expect(combo).toHaveAttribute('data-clearable', 'false');
    fireEvent.click(combo);

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ responsibleLegendaryId: 'lgnd-1' }));
    expect(screen.queryByPlaceholderText(/UUID/i)).toBeNull();
  });
});
