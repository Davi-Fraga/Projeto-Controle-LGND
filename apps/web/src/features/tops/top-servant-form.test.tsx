import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TopServantForm } from './top-servant-form';
import { addTopServant } from './api';

vi.mock('./api', () => ({
  addTopServant: vi.fn().mockResolvedValue({}),
  updateTopServant: vi.fn(),
  getTopTeams: vi.fn().mockResolvedValue({ data: [] }),
}));
vi.mock('@/features/legendarios/legendario-combobox', () => ({
  LegendarioCombobox: ({ onChange, noneLabel, clearable }: any) => (
    <button type="button" aria-label={noneLabel} data-clearable={String(clearable)} onClick={() => onChange('lgnd-1', 'Fulano')}>{noneLabel}</button>
  ),
}));

describe('TopServantForm', () => {
  it('seleciona o legendário obrigatório e envia no payload', async () => {
    render(<TopServantForm topId="t1" onSaved={vi.fn()} onCancel={vi.fn()} />);

    const combo = screen.getByRole('button', { name: 'Selecione...' });
    expect(combo).toHaveAttribute('data-clearable', 'false');
    fireEvent.click(combo);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(addTopServant).toHaveBeenCalledWith('t1', expect.objectContaining({ legendaryId: 'lgnd-1' })));
  });
});
