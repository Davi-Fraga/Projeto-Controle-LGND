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

    fireEvent.click(screen.getByRole('button', { name: 'Todas as equipes' }));
    fireEvent.change(screen.getByPlaceholderText('Buscar equipe...'), {
      target: { value: 'mid' },
    });

    await waitFor(() => expect(getTeamOptions).toHaveBeenLastCalledWith('mid', 20));
    fireEvent.click(await screen.findByRole('button', { name: 'Equipe Midia' }));
    expect(onChange).toHaveBeenCalledWith('team-1', 'Equipe Midia');

    rerender(
      <TeamFilter value="team-1" selectedLabel="Equipe Midia" onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Equipe Midia' }));
    fireEvent.click(screen.getByRole('button', { name: 'Todas as equipes' }));
    expect(onChange).toHaveBeenLastCalledWith('', 'Todas as equipes');
  });
});
