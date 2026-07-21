import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LegendarioCombobox, toLegendarioOption } from './legendario-combobox';
import { getLegendario, getLegendarioOptions } from './api';

vi.mock('./api', () => ({
  getLegendario: vi.fn(),
  getLegendarioOptions: vi.fn(),
}));

describe('toLegendarioOption', () => {
  it('centraliza nome + cidade + LGND em label/sublabel', () => {
    const option = toLegendarioOption({
      id: '1',
      value: '1',
      label: 'ignored',
      metadata: { fullName: 'João Silva', city: 'Goiânia', lgndNumber: '123' },
    });
    expect(option).toEqual({ value: '1', label: 'João Silva', sublabel: 'Goiânia · LGND 123' });
  });

  it('omite sublabel quando não há cidade nem número', () => {
    const option = toLegendarioOption({ id: '2', value: '2', label: 'Maria', metadata: {} });
    expect(option).toEqual({ value: '2', label: 'Maria', sublabel: undefined });
  });
});

describe('LegendarioCombobox', () => {
  afterEach(() => vi.clearAllMocks());

  it('busca no backend, apresenta desambiguação e seleciona (mesmo fluxo de usuário e convite)', async () => {
    vi.mocked(getLegendarioOptions).mockResolvedValue({
      data: [{ id: '1', value: '1', label: 'João', metadata: { fullName: 'João Silva', city: 'Goiânia', lgndNumber: '123' } }],
    });
    const onChange = vi.fn();
    render(<LegendarioCombobox value="" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Nenhum' }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'joao' } });

    await waitFor(() => expect(getLegendarioOptions).toHaveBeenLastCalledWith('joao', 20));
    // Sublabel de desambiguação presente antes de selecionar.
    expect(await screen.findByText('Goiânia · LGND 123')).toBeInTheDocument();
    fireEvent.click(screen.getByText('João Silva'));
    expect(onChange).toHaveBeenCalledWith('1', 'João Silva');
  });

  it('permite limpar chamando onChange com valor vazio', async () => {
    vi.mocked(getLegendarioOptions).mockResolvedValue({ data: [] });
    const onChange = vi.fn();
    render(<LegendarioCombobox value="" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Nenhum' }));
    const noneOption = screen.getByRole('option', { name: 'Nenhum' });
    fireEvent.click(within(noneOption).getByRole('button'));
    expect(onChange).toHaveBeenCalledWith('', 'Nenhum');
  });

  it('resolve o rótulo do valor vinculado na edição via getLegendario', async () => {
    vi.mocked(getLegendario).mockResolvedValue({
      data: { id: 'v1', fullName: 'Ana Souza', lgndNumber: '77' },
    } as any);
    vi.mocked(getLegendarioOptions).mockResolvedValue({ data: [] });

    render(<LegendarioCombobox value="v1" onChange={vi.fn()} />);

    expect(await screen.findByRole('button', { name: 'Ana Souza - LGND 77' })).toBeInTheDocument();
    expect(getLegendario).toHaveBeenCalledWith('v1');
  });
});
