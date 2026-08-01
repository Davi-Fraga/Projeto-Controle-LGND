import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TopParticipantForm } from './top-participant-form';
import { addTopParticipant, getTopParticipantCandidateOptions } from './api';

vi.mock('./api', () => ({
  addTopParticipant: vi.fn().mockResolvedValue({}),
  updateTopParticipant: vi.fn(),
  getTopParticipantCandidateOptions: vi.fn().mockResolvedValue({ data: [] }),
}));
/** Captura o `fetchOptions` recebido pelo combobox para provar QUAL endpoint o formulário usa. */
let capturedFetchOptions: ((search: string, limit: number) => Promise<unknown>) | undefined;

vi.mock('@/features/legendarios/legendario-combobox', () => ({
  // A fonte contextual é injetada pelo formulário; no teste basta um passe-adiante.
  contextualLegendarioSource: (fetcher: any) => fetcher,
  LegendarioCombobox: ({ onChange, noneLabel, clearable, fetchOptions }: any) => {
    capturedFetchOptions = fetchOptions;
    return (
      <button type="button" aria-label={noneLabel} data-clearable={String(clearable)} onClick={() => onChange('lgnd-1', 'Fulano')}>{noneLabel}</button>
    );
  },
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
  it('busca candidatos no endpoint contextual do TOP, não no diretório global', async () => {
    capturedFetchOptions = undefined;
    render(<TopParticipantForm topId="t1" onSaved={vi.fn()} onCancel={vi.fn()} />);

    expect(capturedFetchOptions).toBeDefined();
    await capturedFetchOptions!('ana', 20);

    // Sem esta chamada o seletor voltaria a exigir `legendarios.read` e daria 403 para quem
    // só tem `tops.participants.add`.
    expect(getTopParticipantCandidateOptions).toHaveBeenCalledWith('t1', 'ana', 20);
  });
});
