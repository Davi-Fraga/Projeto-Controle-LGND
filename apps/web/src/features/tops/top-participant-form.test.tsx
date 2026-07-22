import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TopParticipantForm } from './top-participant-form';
import { addTopParticipant } from './api';

vi.mock('./api', () => ({ addTopParticipant: vi.fn().mockResolvedValue({}), updateTopParticipant: vi.fn() }));
vi.mock('@/features/legendarios/legendario-combobox', () => ({
  LegendarioCombobox: ({ onChange, noneLabel, clearable }: any) => (
    <button type="button" aria-label={noneLabel} data-clearable={String(clearable)} onClick={() => onChange('lgnd-1', 'Fulano')}>{noneLabel}</button>
  ),
}));

describe('TopParticipantForm', () => {
  it('seleciona o legendário obrigatório e envia no payload', async () => {
    render(<TopParticipantForm topId="t1" onSaved={vi.fn()} onCancel={vi.fn()} />);

    const combo = screen.getByRole('button', { name: 'Selecione...' });
    expect(combo).toHaveAttribute('data-clearable', 'false');
    fireEvent.click(combo);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(addTopParticipant).toHaveBeenCalledWith('t1', expect.objectContaining({ legendaryId: 'lgnd-1' })));
  });
});
