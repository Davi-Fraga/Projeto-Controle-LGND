import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Surface } from './Surface';

describe('Surface', () => {
  it('preserva a semântica do elemento escolhido', () => {
    render(<Surface as="section" aria-label="Resumo operacional">Conteúdo</Surface>);

    expect(screen.getByRole('region', { name: 'Resumo operacional' })).toHaveTextContent('Conteúdo');
  });

  it('aplica superfície e borda sem exigir valores crus', () => {
    render(<Surface data-testid="surface" tone="raised" border="strong">Conteúdo</Surface>);

    expect(screen.getByTestId('surface')).toHaveClass('bg-surface-raised', 'border-line-strong');
  });
});
