import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AsyncCombobox, type ComboboxOption } from './AsyncCombobox';

function openPopup() {
  // Sem valor selecionado o gatilho exibe o rótulo "Nenhum".
  fireEvent.click(screen.getByRole('button', { name: 'Nenhum' }));
  return screen.getByRole('combobox');
}

describe('AsyncCombobox', () => {
  afterEach(() => vi.clearAllMocks());

  it('aplica debounce: não dispara uma requisição por tecla', async () => {
    const fetchOptions = vi.fn().mockResolvedValue([]);
    render(<AsyncCombobox value="" onChange={vi.fn()} fetchOptions={fetchOptions} />);

    const input = openPopup();
    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.change(input, { target: { value: 'ab' } });
    fireEvent.change(input, { target: { value: 'abc' } });

    await waitFor(() => expect(fetchOptions).toHaveBeenCalledWith('abc'));
    expect(fetchOptions).not.toHaveBeenCalledWith('a');
    expect(fetchOptions).not.toHaveBeenCalledWith('ab');
  });

  it('ignora resposta obsoleta que chega depois da mais recente', async () => {
    const deferred: Array<(opts: ComboboxOption[]) => void> = [];
    const fetchOptions = vi.fn().mockImplementation(
      () => new Promise<ComboboxOption[]>((resolve) => deferred.push(resolve)),
    );
    render(<AsyncCombobox value="" onChange={vi.fn()} fetchOptions={fetchOptions} />);

    const input = openPopup();
    await waitFor(() => expect(deferred).toHaveLength(1)); // busca da abertura (termo '')
    fireEvent.change(input, { target: { value: 'zzz' } });
    await waitFor(() => expect(deferred).toHaveLength(2)); // busca do termo atual

    // A busca atual resolve primeiro...
    act(() => deferred[1]([{ value: '2', label: 'NOVO' }]));
    await screen.findByText('NOVO');
    // ...e a busca antiga resolve depois: não pode sobrescrever.
    act(() => deferred[0]([{ value: '1', label: 'ANTIGO' }]));

    expect(screen.getByText('NOVO')).toBeInTheDocument();
    expect(screen.queryByText('ANTIGO')).toBeNull();
  });

  it('mostra estado de erro distinto e não o trata como resultado vazio', async () => {
    const fetchOptions = vi.fn().mockRejectedValue(new Error('boom'));
    render(<AsyncCombobox value="" onChange={vi.fn()} fetchOptions={fetchOptions} />);

    const input = openPopup();
    fireEvent.change(input, { target: { value: 'abc' } });

    await screen.findByText(/Erro ao buscar/);
    expect(screen.queryByText(/Nenhum resultado/)).toBeNull();
  });

  it('preserva o rótulo do valor atual mesmo quando ele não está nos resultados', async () => {
    const fetchOptions = vi.fn().mockResolvedValue([]);
    render(<AsyncCombobox value="v1" selectedLabel="Fulano" onChange={vi.fn()} fetchOptions={fetchOptions} />);

    // O gatilho exibe o rótulo selecionado antes e depois de uma busca sem correspondência.
    expect(screen.getByRole('button', { name: 'Fulano' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fulano' }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'zzz' } });
    await waitFor(() => expect(fetchOptions).toHaveBeenCalledWith('zzz'));
    expect(screen.getByRole('button', { name: 'Fulano' })).toBeInTheDocument();
  });

  it('respeita a limpeza configurável: sem "Nenhum" quando não limpável', async () => {
    const fetchOptions = vi.fn().mockResolvedValue([]);
    const { rerender } = render(
      <AsyncCombobox value="" clearable onChange={vi.fn()} fetchOptions={fetchOptions} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Nenhum' }));
    expect(screen.getByRole('option', { name: 'Nenhum' })).toBeInTheDocument();

    rerender(<AsyncCombobox value="" clearable={false} onChange={vi.fn()} fetchOptions={fetchOptions} />);
    expect(screen.queryByRole('option', { name: 'Nenhum' })).toBeNull();
  });

  it('opera por teclado: ArrowDown percorre, Enter confirma e Escape fecha', async () => {
    const fetchOptions = vi.fn().mockResolvedValue([
      { value: '1', label: 'Alpha' },
      { value: '2', label: 'Beta' },
    ]);
    const onChange = vi.fn();
    render(<AsyncCombobox value="" onChange={onChange} fetchOptions={fetchOptions} />);

    const input = openPopup();
    await screen.findByText('Alpha');

    // entries = [Nenhum, Alpha, Beta]; dois ArrowDown chegam em Alpha.
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const alphaOption = screen.getByText('Alpha').closest('li');
    expect(input).toHaveAttribute('aria-activedescendant', alphaOption?.id);

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('1', 'Alpha');
  });

  it('Escape fecha o popup sem alterar o valor', async () => {
    const fetchOptions = vi.fn().mockResolvedValue([]);
    const onChange = vi.fn();
    render(<AsyncCombobox value="" onChange={onChange} fetchOptions={fetchOptions} />);

    const input = openPopup();
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByRole('combobox')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});
