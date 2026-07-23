import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Sidebar } from './Sidebar';

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => <a href={String(href)} {...props}>{children}</a>,
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }));
vi.mock('@/features/auth/actions', () => ({ getCurrentUser: () => mocks.getCurrentUser() }));

const user = (permissions: string[], roles: string[] = ['MEMBER']) => ({ id: 'u1', name: 'X', permissions, roles });

describe('Sidebar (navegação permission-driven via manifesto)', () => {
  beforeEach(() => mocks.getCurrentUser.mockReset());

  it('Igrejas aparece por churches.read (permission, não papel); TOPs e Usuários não', async () => {
    mocks.getCurrentUser.mockResolvedValue(user(['churches.read']));
    render(<Sidebar />);
    expect(await screen.findByText('Igrejas')).toBeInTheDocument();
    expect(screen.queryByText('TOPs')).toBeNull();
    expect(screen.queryByText('Usuários')).toBeNull();
  });

  it('Ações Sociais aparece com social-actions.read (não com tops.read)', async () => {
    mocks.getCurrentUser.mockResolvedValue(user(['social-actions.read']));
    render(<Sidebar />);
    expect(await screen.findByText('Ações Sociais')).toBeInTheDocument();
    expect(screen.queryByText('TOPs')).toBeNull();
  });

  it('Líderes Espirituais independe de Igrejas', async () => {
    mocks.getCurrentUser.mockResolvedValue(user(['spiritual-leaders.read']));
    render(<Sidebar />);
    expect(await screen.findByText('Líderes Espirituais')).toBeInTheDocument();
    expect(screen.queryByText('Igrejas')).toBeNull();
  });

  it('Usuários não aparece a não-admin mesmo com users.* residual', async () => {
    mocks.getCurrentUser.mockResolvedValue(user(['legendarios.read', 'users.read', 'users.update']));
    render(<Sidebar />);
    // Legendários confirma que o usuário carregou; Usuários deve continuar ausente.
    expect(await screen.findByText('Legendários')).toBeInTheDocument();
    expect(screen.queryByText('Usuários')).toBeNull();
  });

  it('Administrador vê Usuários pela regra administrativa', async () => {
    mocks.getCurrentUser.mockResolvedValue(user(['dashboard.read'], ['COORDINATION_ADMIN']));
    render(<Sidebar />);
    expect(await screen.findByText('Usuários')).toBeInTheDocument();
  });
});
