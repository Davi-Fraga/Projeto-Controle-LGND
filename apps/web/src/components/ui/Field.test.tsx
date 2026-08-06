import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field } from './Field';

describe('Field', () => {
  it('associa rótulo e ajuda ao controle', () => {
    render(
      <Field label="Nome" hint="Use o nome completo.">
        <input />
      </Field>,
    );

    const input = screen.getByRole('textbox', { name: 'Nome' });
    const hint = screen.getByText('Use o nome completo.');
    expect(input).toHaveAttribute('aria-describedby', hint.id);
  });

  it('comunica erro visual e semanticamente', () => {
    render(
      <Field label="E-mail" error="Informe um e-mail válido.">
        <input type="email" />
      </Field>,
    );

    const input = screen.getByRole('textbox', { name: 'E-mail' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Informe um e-mail válido.');
  });
});
