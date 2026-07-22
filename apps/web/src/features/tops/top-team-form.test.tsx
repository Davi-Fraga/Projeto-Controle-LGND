import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TopTeamForm } from './top-team-form';

vi.mock('./api', () => ({
  getTeamsOptions: vi.fn().mockResolvedValue({ data: [] }),
  addTopTeam: vi.fn(),
  updateTopTeam: vi.fn(),
}));
vi.mock('@/features/legendarios/legendario-combobox', () => ({
  LegendarioCombobox: ({ noneLabel }: any) => <button type="button" aria-label={noneLabel}>{noneLabel}</button>,
}));

describe('TopTeamForm', () => {
  it('migra coordenador e subcoordenador para LegendarioCombobox', async () => {
    render(<TopTeamForm topId="t1" onSaved={vi.fn()} onCancel={vi.fn()} />);
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Não definido' })).toHaveLength(2));
  });
});
