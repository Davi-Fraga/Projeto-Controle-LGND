import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActionMenu } from './ActionMenu';

/**
 * Com as ações filtradas por permission (change acoes-web-e-seletores-contextuais), um
 * usuário sem nenhuma ação disponível não pode ficar com um gatilho "⋮" que abre nada.
 */
describe('ActionMenu', () => {
  it('não renderiza nada quando não sobra nenhum item', () => {
    const { container } = render(<ActionMenu items={[]} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renderiza o gatilho quando há ao menos um item', () => {
    render(<ActionMenu items={[{ label: 'Editar', href: '/x' }]} />);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('abre e mostra apenas os itens recebidos', () => {
    render(<ActionMenu items={[{ label: 'Ver', href: '/x' }]} />);

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('Ver')).toBeInTheDocument();
    expect(screen.queryByText('Excluir')).not.toBeInTheDocument();
  });

  it('dispara o onClick do item e fecha o menu', () => {
    const onClick = vi.fn();
    render(<ActionMenu items={[{ label: 'Inativar', onClick, destructive: true }]} />);

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Inativar'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
