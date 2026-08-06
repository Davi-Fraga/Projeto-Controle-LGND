import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('usa type button por padrão e mantém nome acessível', () => {
    render(<Button>Salvar alterações</Button>);

    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toHaveAttribute('type', 'button');
  });

  it('não dispara ação quando está desabilitado', () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Enviar</Button>);

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('expõe o estado selecionado sem depender apenas de cor', () => {
    render(<Button selected aria-pressed="true">Selecionado</Button>);

    const button = screen.getByRole('button', { name: 'Selecionado' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAttribute('data-selected', 'true');
  });
});
