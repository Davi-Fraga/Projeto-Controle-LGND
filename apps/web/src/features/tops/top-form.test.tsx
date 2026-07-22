import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TopForm } from './top-form';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock('./api', () => ({ createTop: vi.fn(), updateTop: vi.fn() }));
vi.mock('@/features/legendarios/legendario-combobox', () => ({
  LegendarioCombobox: ({ noneLabel }: any) => <button type="button" aria-label={noneLabel}>{noneLabel}</button>,
}));

describe('TopForm', () => {
  it('migra os 6 campos de Legendário para LegendarioCombobox (sem PersonSelect/select)', () => {
    render(<TopForm />);
    // 6 bindings: representante, sub-representante, coordenador geral + 3 de famílias.
    expect(screen.getAllByRole('button', { name: 'Não definido' })).toHaveLength(6);
  });
});
