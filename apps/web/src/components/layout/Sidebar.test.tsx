import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Sidebar } from './Sidebar';

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => <a href={String(href)} {...props}>{children}</a>,
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }));
vi.mock('@/features/auth/actions', () => ({ getCurrentUser: () => mocks.getCurrentUser() }));

const user = (permissions: string[], roles: string[] = ['MEMBER']) => ({
  id: 'u1',
  name: 'X',
  permissions,
  roles,
  screenAccess: [
    'dashboard', 'legendarios', 'teams', 'spiritual-leaders', 'map', 'tops',
    'org-chart', 'social-actions', 'communications', 'reports', 'churches',
  ].map((screenId) => ({ screenId, level: 'VIEW' as const, state: 'AVAILABLE' as const, usable: true })),
});

describe('Sidebar (navegação permission-driven via manifesto)', () => {
  beforeEach(() => mocks.getCurrentUser.mockReset());

  it('Igrejas aparece por churches.read, enquanto TOPs e Usuários não', async () => {
    mocks.getCurrentUser.mockResolvedValue(user(['churches.read']));
    render(<Sidebar />);
    expect(await screen.findByText('Igrejas')).toBeInTheDocument();
    expect(screen.queryByText('TOPs')).toBeNull();
    expect(screen.queryByText('Usuários')).toBeNull();
  });

  it('Ações Sociais aparece com social-actions.read e não com tops.read', async () => {
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
    expect(await screen.findByText('Legendários')).toBeInTheDocument();
    expect(screen.queryByText('Usuários')).toBeNull();
  });

  it('Administrador vê Usuários pela regra administrativa', async () => {
    mocks.getCurrentUser.mockResolvedValue(user(['dashboard.read'], ['COORDINATION_ADMIN']));
    render(<Sidebar />);
    expect(await screen.findByText('Usuários')).toBeInTheDocument();
  });

  it('identifica a navegação e comunica a rota atual', async () => {
    mocks.getCurrentUser.mockResolvedValue(user(['dashboard.read']));
    render(<Sidebar />);

    expect(await screen.findByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Painel' })).toHaveAttribute('aria-current', 'page');
  });

  it('expõe o estado do menu mobile e permite fechar pelo mesmo controle', async () => {
    mocks.getCurrentUser.mockResolvedValue(user(['dashboard.read']));
    render(<Sidebar />);

    const openButton = screen.getByRole('button', { name: 'Abrir menu' });
    expect(openButton).toHaveAttribute('aria-controls', 'primary-navigation');
    expect(openButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(openButton);
    const closeButtons = screen.getAllByRole('button', { name: 'Fechar menu' });
    expect(closeButtons[0]).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(closeButtons[0]);
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('sidebar-backdrop')).toBeNull();
  });

  it('agrupa as abas em seções rotuladas, com o Painel solto no topo', async () => {
    mocks.getCurrentUser.mockResolvedValue(user(['dashboard.read', 'legendarios.read', 'tops.read'], ['COORDINATION_ADMIN']));
    render(<Sidebar />);

    expect(await screen.findByRole('group', { name: 'Manada' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Atividades' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Administração' })).toBeInTheDocument();

    // Painel não pertence a grupo nenhum: fica na seção sem rótulo.
    expect(within(screen.getByRole('group', { name: 'Manada' })).queryByText('Painel')).toBeNull();
    expect(within(screen.getByRole('group', { name: 'Manada' })).getByText('Legendários')).toBeInTheDocument();
  });

  it('não renderiza cabeçalho de grupo sem nenhuma aba visível', async () => {
    mocks.getCurrentUser.mockResolvedValue(user(['legendarios.read']));
    render(<Sidebar />);

    expect(await screen.findByRole('group', { name: 'Manada' })).toBeInTheDocument();
    // Estrutura APARECE aqui: o Organograma usa regra `anyOf` legada e legendarios.read basta
    // para abri-lo. Ele é o único item visível do grupo.
    const estrutura = screen.getByRole('group', { name: 'Estrutura' });
    expect(within(estrutura).getByText('Organograma')).toBeInTheDocument();
    expect(within(estrutura).queryByText('Equipes')).toBeNull();

    // Estes não têm nenhum item visível — o rótulo não pode sobrar sozinho.
    expect(screen.queryByRole('group', { name: 'Atividades' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Análise' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Administração' })).toBeNull();
  });

  it('permite fechar o menu mobile pelo backdrop', async () => {
    mocks.getCurrentUser.mockResolvedValue(user(['dashboard.read']));
    render(<Sidebar />);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
    const backdrop = screen.getByTestId('sidebar-backdrop');
    expect(backdrop).toHaveAttribute('aria-label', 'Fechar menu');
    fireEvent.click(backdrop);

    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('sidebar-backdrop')).toBeNull();
  });
});
