import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChurchForm } from './church-form';

const mocks = vi.hoisted(() => ({
  createChurch: vi.fn(),
  updateChurch: vi.fn(),
  getUsers: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh, back: vi.fn() }),
}));

vi.mock('./api', () => ({
  createChurch: mocks.createChurch,
  updateChurch: mocks.updateChurch,
  geocodeChurch: vi.fn(),
}));

vi.mock('@/features/users/api', () => ({
  getUsers: mocks.getUsers,
}));

vi.mock('@/features/legendarios/legendario-combobox', () => ({
  LegendarioCombobox: ({ value, initialLabel, onChange }: {
    value: string;
    initialLabel?: string;
    onChange: (value: string, label: string) => void;
  }) => (
    <select
      aria-label="Legendário vinculado"
      value={value}
      onChange={(event) => onChange(event.target.value, event.target.selectedOptions[0]?.text ?? '')}
    >
      <option value="">Nenhum</option>
      {value ? <option value={value}>{initialLabel ?? 'Atual'}</option> : null}
      <option value="legendary-new">Legendário Novo</option>
    </select>
  ),
}));

describe('ChurchForm — vínculo do líder espiritual', () => {
  beforeEach(() => {
    mocks.createChurch.mockReset().mockResolvedValue({ data: { id: 'church-1' } });
    mocks.updateChurch.mockReset().mockResolvedValue({ data: { id: 'church-1' } });
    mocks.getUsers.mockReset().mockResolvedValue({ data: [] });
    mocks.push.mockReset();
    mocks.refresh.mockReset();
  });

  it('pré-preenche o vínculo e troca o Legendário sem apagar o nome livre', async () => {
    render(<ChurchForm church={{
      id: 'church-1',
      name: 'Igreja Central',
      spiritualLeaderName: 'Nome livre preservado',
      spiritualLeaderLegendaryId: 'legendary-old',
      spiritualLeaderLegendary: { id: 'legendary-old', fullName: 'Legendário Atual' },
    }} />);

    expect(screen.getByRole('option', { name: 'Legendário Atual' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Nome livre preservado')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Legendário vinculado'), { target: { value: 'legendary-new' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Igreja' }));

    await waitFor(() => expect(mocks.updateChurch).toHaveBeenCalledWith(
      'church-1',
      expect.objectContaining({
        spiritualLeaderLegendaryId: 'legendary-new',
        spiritualLeaderName: 'Nome livre preservado',
      }),
    ));
  });

  it('envia null ao limpar o vínculo', async () => {
    render(<ChurchForm church={{
      id: 'church-1',
      name: 'Igreja Central',
      spiritualLeaderLegendaryId: 'legendary-old',
      spiritualLeaderLegendary: { id: 'legendary-old', fullName: 'Legendário Atual' },
    }} />);

    fireEvent.change(screen.getByLabelText('Legendário vinculado'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Igreja' }));

    await waitFor(() => expect(mocks.updateChurch).toHaveBeenCalledWith(
      'church-1',
      expect.objectContaining({ spiritualLeaderLegendaryId: null }),
    ));
  });
});
