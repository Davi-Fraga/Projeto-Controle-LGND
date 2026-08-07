import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

/**
 * Medido no navegador antes desta correção: o componente era um <div> sem role, o foco nunca
 * entrava (ficava no cabeçalho da página), Escape não fechava e 6 Tabs seguidos vazavam para a
 * navegação lateral. É o modal que confirma excluir e inativar em 13 telas.
 */
function montar(overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const props = {
    isOpen: true,
    title: 'Inativar Legendário',
    description: 'Tem certeza que deseja inativar este Legendário?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
  render(<ConfirmDialog {...props} />);
  return props;
}

describe('ConfirmDialog', () => {
  it('se anuncia como diálogo modal rotulado pelo título e descrito pelo texto', () => {
    montar();
    const dialogo = screen.getByRole('alertdialog');

    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(dialogo).toHaveAccessibleName('Inativar Legendário');
    expect(dialogo).toHaveAccessibleDescription('Tem certeza que deseja inativar este Legendário?');
  });

  it('leva o foco para Cancelar ao abrir — a opção não destrutiva', () => {
    montar();

    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
  });

  it('Escape cancela', () => {
    const { onCancel } = montar();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('o botão de fechar tem nome acessível', () => {
    montar();

    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument();
  });

  it('Tab circula dentro do diálogo em vez de vazar para a página', () => {
    montar();
    const focaveis = screen.getAllByRole('button');
    const ultimo = focaveis[focaveis.length - 1];

    ultimo.focus();
    fireEvent.keyDown(document, { key: 'Tab' });

    expect(focaveis[0]).toHaveFocus();
  });

  it('Shift+Tab circula para trás', () => {
    montar();
    const focaveis = screen.getAllByRole('button');

    focaveis[0].focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });

    expect(focaveis[focaveis.length - 1]).toHaveFocus();
  });

  it('devolve o foco ao elemento de origem ao fechar', () => {
    const origem = document.createElement('button');
    origem.textContent = 'Abrir';
    document.body.appendChild(origem);
    origem.focus();

    const props = {
      title: 'T',
      description: 'D',
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    };
    const { rerender } = render(<ConfirmDialog isOpen {...props} />);
    rerender(<ConfirmDialog isOpen={false} {...props} />);

    expect(origem).toHaveFocus();
    origem.remove();
  });

  it('não renderiza nada quando fechado', () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={false}
        title="T"
        description="D"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
