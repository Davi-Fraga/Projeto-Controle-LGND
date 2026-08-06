import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState, ErrorState, LoadingState, SuccessState } from './AsyncState';

describe('AsyncState', () => {
  it('comunica carregamento sem remover a região estrutural', () => {
    render(<LoadingState title="Carregando painel" />);
    expect(screen.getByText('Carregando painel').closest('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('oferece próxima ação no vazio', () => {
    const onClick = vi.fn();
    render(<EmptyState title="Nenhum registro" description="Comece agora." action={{ label: 'Criar', onClick }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('expõe erro como alerta e permite nova tentativa', () => {
    const onClick = vi.fn();
    render(<ErrorState title="Falha no painel" description="Tente novamente." action={{ label: 'Tentar novamente', onClick }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Falha no painel');
    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/ }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('comunica sucesso sem bloquear a continuidade', () => {
    render(<SuccessState title="Salvo" description="As alterações foram registradas." />);
    expect(screen.getByRole('status')).toHaveTextContent('Salvo');
  });
});
