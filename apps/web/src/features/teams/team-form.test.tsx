import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TeamForm } from './team-form';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock('./api', () => ({ createTeam: vi.fn(), updateTeam: vi.fn() }));
vi.mock('@/features/legendarios/legendario-combobox', () => ({
  LegendarioCombobox: ({ noneLabel }: any) => <button type="button" aria-label={noneLabel}>{noneLabel}</button>,
}));

describe('TeamForm', () => {
  it('migra coordenador e subcoordenador para LegendarioCombobox (sem select/carga de 100)', () => {
    render(<TeamForm />);
    expect(screen.getAllByRole('button', { name: 'Não definido' })).toHaveLength(2);
  });
});
