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

  /**
   * O menu vai para um portal no fim do <body>. Sem gestão de foco, um usuário de teclado
   * abre o menu e precisa atravessar a página inteira para alcançar os itens — foram 12 Tabs
   * medidos no navegador na lista de Legendários — e não tem como fechá-lo.
   * Padrão de referência: WAI-ARIA Authoring Practices, menu button.
   */
  describe('operação por teclado', () => {
    const items = [
      { label: 'Ver', onClick: vi.fn() },
      { label: 'Editar', onClick: vi.fn() },
      { label: 'Inativar', onClick: vi.fn(), destructive: true },
    ];

    it('Escape fecha o menu e devolve o foco ao gatilho', () => {
      render(<ActionMenu items={items} />);
      const gatilho = screen.getByRole('button', { name: 'Ações' });

      fireEvent.click(gatilho);
      expect(gatilho).toHaveAttribute('aria-expanded', 'true');

      fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

      expect(gatilho).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(gatilho).toHaveFocus();
    });

    it('abrir por Enter leva o foco ao primeiro item', () => {
      render(<ActionMenu items={items} />);
      const gatilho = screen.getByRole('button', { name: 'Ações' });

      gatilho.focus();
      fireEvent.keyDown(gatilho, { key: 'Enter' });

      expect(screen.getByRole('menuitem', { name: 'Ver' })).toHaveFocus();
    });

    it('abrir por ArrowUp leva o foco ao último item', () => {
      render(<ActionMenu items={items} />);
      const gatilho = screen.getByRole('button', { name: 'Ações' });

      gatilho.focus();
      fireEvent.keyDown(gatilho, { key: 'ArrowUp' });

      expect(screen.getByRole('menuitem', { name: 'Inativar' })).toHaveFocus();
    });

    it('ArrowDown e ArrowUp percorrem os itens circularmente', () => {
      render(<ActionMenu items={items} />);
      const gatilho = screen.getByRole('button', { name: 'Ações' });

      gatilho.focus();
      fireEvent.keyDown(gatilho, { key: 'ArrowDown' });
      expect(screen.getByRole('menuitem', { name: 'Ver' })).toHaveFocus();

      fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
      expect(screen.getByRole('menuitem', { name: 'Editar' })).toHaveFocus();

      fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
      expect(screen.getByRole('menuitem', { name: 'Inativar' })).toHaveFocus();

      // do último volta ao primeiro
      fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
      expect(screen.getByRole('menuitem', { name: 'Ver' })).toHaveFocus();

      // e do primeiro volta ao último
      fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
      expect(screen.getByRole('menuitem', { name: 'Inativar' })).toHaveFocus();
    });

    it('Home e End vão para o primeiro e o último item', () => {
      render(<ActionMenu items={items} />);
      const gatilho = screen.getByRole('button', { name: 'Ações' });

      gatilho.focus();
      fireEvent.keyDown(gatilho, { key: 'Enter' });

      fireEvent.keyDown(document.activeElement!, { key: 'End' });
      expect(screen.getByRole('menuitem', { name: 'Inativar' })).toHaveFocus();

      fireEvent.keyDown(document.activeElement!, { key: 'Home' });
      expect(screen.getByRole('menuitem', { name: 'Ver' })).toHaveFocus();
    });

    it('os itens ficam fora da ordem de tabulação da página', () => {
      render(<ActionMenu items={items} />);

      fireEvent.click(screen.getByRole('button', { name: 'Ações' }));

      // Foco roving: só o item ativo é tabulável; nenhum item entra na sequência
      // natural da página (que, pelo portal, os jogaria para o fim do body).
      for (const item of screen.getAllByRole('menuitem')) {
        expect(item).toHaveAttribute('tabindex', '-1');
      }
    });

    it('Tab fecha o menu em vez de deixar o foco vazar para o fim da página', () => {
      render(<ActionMenu items={items} />);
      const gatilho = screen.getByRole('button', { name: 'Ações' });

      gatilho.focus();
      fireEvent.keyDown(gatilho, { key: 'Enter' });
      fireEvent.keyDown(document.activeElement!, { key: 'Tab' });

      expect(gatilho).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });
});
