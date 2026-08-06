import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppHeader } from './AppHeader';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock('@/features/auth/actions', () => ({
  getCurrentUser: () => mocks.getCurrentUser(),
  logout: () => mocks.logout(),
}));

describe('AppHeader', () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.logout.mockReset();
    mocks.replace.mockReset();
  });

  it('expõe a saída com nome acessível em qualquer viewport', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'u1', name: 'Gestor', roles: ['COORDINATION_ADMIN'], permissions: [] });
    render(<AppHeader />);

    expect(await screen.findByText('Gestor')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sair/ })).toHaveAttribute('title', 'Sair do sistema');
  });

  it('finaliza a sessão e redireciona ao login', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'u1', name: 'Gestor', roles: ['COORDINATION_ADMIN'], permissions: [] });
    mocks.logout.mockResolvedValue(undefined);
    render(<AppHeader />);

    fireEvent.click(await screen.findByRole('button', { name: /Sair/ }));

    await vi.waitFor(() => expect(mocks.logout).toHaveBeenCalledOnce());
    expect(mocks.replace).toHaveBeenCalledWith('/login');
  });
});
