import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TeamMemberForm } from './team-member-form';
import { addTeamMember } from './api';

vi.mock('./api', () => ({ addTeamMember: vi.fn().mockResolvedValue({}), updateTeamMember: vi.fn() }));
vi.mock('@/features/legendarios/legendario-combobox', () => ({
  LegendarioCombobox: ({ onChange, noneLabel, disabled }: any) => (
    <button type="button" aria-label={noneLabel} disabled={disabled} onClick={() => onChange('lgnd-1', 'Fulano')}>{noneLabel}</button>
  ),
}));

describe('TeamMemberForm', () => {
  it('na criação seleciona o legendário e envia no payload', async () => {
    render(<TeamMemberForm teamId="tm1" onSaved={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Selecione' }));
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Apoio' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar membro' }));

    await waitFor(() => expect(addTeamMember).toHaveBeenCalledWith('tm1', expect.objectContaining({ legendaryId: 'lgnd-1' })));
  });

  it('na edição o combobox de legendário fica desabilitado', () => {
    render(<TeamMemberForm teamId="tm1" member={{ id: 'm1', legendaryId: 'lgnd-9', role: 'X', status: 'ACTIVE' } as any} onSaved={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Selecione' })).toBeDisabled();
  });
});
