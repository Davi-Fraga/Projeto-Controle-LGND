import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('estrutura título, descrição e ações', () => {
    render(
      <PageHeader
        title="Painel de Controle"
        description="Resumo da Rota do Cerrado."
        actions={<button type="button">Nova ação</button>}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Painel de Controle' })).toBeInTheDocument();
    expect(screen.getByText('Resumo da Rota do Cerrado.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nova ação' })).toBeInTheDocument();
  });
});
