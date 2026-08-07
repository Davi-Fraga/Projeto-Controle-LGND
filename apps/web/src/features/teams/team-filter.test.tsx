import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TeamFilter } from './team-filter';
import { getTeamOptions } from './api';

vi.mock('./api', () => ({
  getTeamOptions: vi.fn(),
}));

describe('TeamFilter', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('searches options on the backend and supports selection and clearing', async () => {
    vi.mocked(getTeamOptions).mockResolvedValue({
      data: [{ id: 'team-1', value: 'team-1', label: 'Equipe Midia' }],
    });
    const onChange = vi.fn();

    const { rerender } = render(
      <TeamFilter value="" onChange={onChange} />,
    );

    // O gatilho é nomeado pela FUNÇÃO do campo ("Equipe"), não pelo valor exibido — antes
    // um leitor de tela anunciava "Todas as equipes, botão" sem dizer de que campo se tratava.
    fireEvent.click(screen.getByRole('button', { name: 'Equipe' }));
    fireEvent.change(screen.getByPlaceholderText('Buscar equipe...'), {
      target: { value: 'mid' },
    });

    await waitFor(() => expect(getTeamOptions).toHaveBeenLastCalledWith('mid', 20));
    fireEvent.click(await screen.findByRole('button', { name: 'Equipe Midia' }));
    expect(onChange).toHaveBeenCalledWith('team-1', 'Equipe Midia');

    rerender(
      <TeamFilter value="team-1" selectedLabel="Equipe Midia" onChange={onChange} />,
    );
    // O gatilho segue sendo "Equipe" mesmo com valor selecionado; "Todas as equipes" agora
    // designa só a opção de limpar, dentro do popup.
    fireEvent.click(screen.getByRole('button', { name: 'Equipe' }));
    fireEvent.click(screen.getByRole('button', { name: 'Todas as equipes' }));
    expect(onChange).toHaveBeenLastCalledWith('', 'Todas as equipes');
  });
});
