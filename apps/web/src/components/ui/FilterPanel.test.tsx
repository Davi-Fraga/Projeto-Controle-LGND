import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FilterPanel } from './FilterPanel';

/**
 * O contrato deste componente é sobre o que NUNCA some quando o painel está recolhido:
 * busca, resumo dos filtros ativos e a saída para limpar. Esconder isso junto com os
 * campos é o que faz o usuário achar que a lista está errada.
 */
describe('FilterPanel', () => {
  const busca = <input aria-label="Buscar" />;

  it('a busca fica fora do bloco recolhível', () => {
    render(<FilterPanel search={busca}><select aria-label="Cidade" /></FilterPanel>);

    const campos = screen.getByTestId('filtros-secundarios');
    expect(screen.getByLabelText('Buscar')).toBeInTheDocument();
    expect(campos).not.toContainElement(screen.getByLabelText('Buscar'));
  });

  it('o botão de filtros comunica seu estado e o que controla', () => {
    render(<FilterPanel search={busca}><select aria-label="Cidade" /></FilterPanel>);

    const toggle = screen.getByRole('button', { name: /filtros/i });
    const campos = screen.getByTestId('filtros-secundarios');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', campos.getAttribute('id'));

    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: /filtros/i })).toHaveAttribute('aria-expanded', 'true');
  });

  it('mostra quantos filtros estão aplicados — painel fechado sem aviso engana o usuário', () => {
    render(<FilterPanel search={busca} activeCount={3}><select aria-label="Cidade" /></FilterPanel>);

    expect(screen.getByRole('button', { name: /filtros/i })).toHaveTextContent('3');
  });

  it('a saída para limpar aparece só quando há o que limpar', () => {
    const limpar = vi.fn();
    const { rerender } = render(<FilterPanel search={busca} activeCount={0} onClear={limpar}><span /></FilterPanel>);
    expect(screen.queryByRole('button', { name: 'Limpar' })).toBeNull();

    rerender(<FilterPanel search={busca} activeCount={2} onClear={limpar}><span /></FilterPanel>);
    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }));
    expect(limpar).toHaveBeenCalledTimes(1);
  });

  it('o resumo dos filtros ativos sobrevive ao painel recolhido', () => {
    render(
      <FilterPanel search={busca} activeCount={1} activeSummary={<span>Igreja: MPR</span>}>
        <select aria-label="Cidade" />
      </FilterPanel>,
    );

    const resumo = screen.getByText('Igreja: MPR');
    expect(resumo).toBeInTheDocument();
    expect(screen.getByTestId('filtros-secundarios')).not.toContainElement(resumo);
  });
});
