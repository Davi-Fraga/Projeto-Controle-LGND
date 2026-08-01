import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TeamMemberForm } from './team-member-form';
import { addTeamMember, getTeamMemberCandidateOptions } from './api';

vi.mock('./api', () => ({
  addTeamMember: vi.fn().mockResolvedValue({}),
  updateTeamMember: vi.fn(),
  getTeamMemberCandidateOptions: vi.fn().mockResolvedValue({ data: [] }),
}));

/** Captura o `fetchOptions` recebido pelo combobox para provar QUAL endpoint o formulário usa. */
let capturedFetchOptions: ((search: string, limit: number) => Promise<unknown>) | undefined;

vi.mock('@/features/legendarios/legendario-combobox', () => ({
  // A fonte contextual é injetada pelo formulário; no teste basta um passe-adiante.
  contextualLegendarioSource: (fetcher: any) => fetcher,
  LegendarioCombobox: ({ onChange, noneLabel, disabled, fetchOptions }: any) => {
    capturedFetchOptions = fetchOptions;
    return (
      <button type="button" aria-label={noneLabel} disabled={disabled} onClick={() => onChange('lgnd-1', 'Fulano')}>{noneLabel}</button>
    );
  },
}));

describe('TeamMemberForm', () => {
  it('na criação seleciona o legendário e envia no payload', async () => {
    render(<TeamMemberForm teamId="tm1" onSaved={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Selecione' }));
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Apoio' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar membro' }));

    await waitFor(() => expect(addTeamMember).toHaveBeenCalledWith('tm1', expect.objectContaining({ legendaryId: 'lgnd-1' })));
  });

  it('na edição o combobox de legendário fica desabilitado', () => {
    render(<TeamMemberForm teamId="tm1" member={{ id: 'm1', legendaryId: 'lgnd-9', role: 'X', status: 'ACTIVE' } as any} onSaved={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Selecione' })).toBeDisabled();
    expect(screen.getByRole('heading', { name: 'Editar vínculo com a equipe' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar vínculo' })).toBeInTheDocument();
  });

  it('busca candidatos no endpoint contextual da equipe, não no diretório global', async () => {
    capturedFetchOptions = undefined;
    render(<TeamMemberForm teamId="tm1" onSaved={vi.fn()} onCancel={vi.fn()} />);

    expect(capturedFetchOptions).toBeDefined();
    await capturedFetchOptions!('ana', 20);

    // É esta chamada que faz `teams.members.add` bastar: sem ela o seletor voltaria a
    // depender de `legendarios.read` e devolveria 403 para quem só pode adicionar membro.
    expect(getTeamMemberCandidateOptions).toHaveBeenCalledWith('tm1', 'ana', 20);
  });
});
