import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CommunicationForm } from './communication-form';

vi.mock('@/features/tops/api', () => ({
  getTopOptions: vi.fn().mockResolvedValue({ data: [] }),
  getTopFamilyOptions: vi.fn().mockResolvedValue({ data: [] }),
  getTeamsOptionsList: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock('@/features/legendarios/legendario-combobox', () => ({
  LegendarioCombobox: ({ onChange, noneLabel, clearable }: any) => (
    <button type="button" aria-label={noneLabel} data-clearable={String(clearable)} onClick={() => onChange('lgnd-1', 'Fulano')}>
      {noneLabel}
    </button>
  ),
}));

const val = {
  title: '', body: '', targetType: 'LEGENDARY', targetId: '', topEventId: '', requiresConfirmation: false,
} as any;

describe('CommunicationForm', () => {
  it('para destinatário LEGENDARY usa LegendarioCombobox e propaga o targetId', () => {
    const onChange = vi.fn();
    render(<CommunicationForm value={val} onChange={onChange} onSubmit={vi.fn()} />);

    const combo = screen.getByRole('button', { name: 'Selecione o legendário' });
    expect(combo).toHaveAttribute('data-clearable', 'false');
    fireEvent.click(combo);

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ targetId: 'lgnd-1' }));
  });
});
