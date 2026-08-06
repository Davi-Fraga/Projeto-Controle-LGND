import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from './page';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getDashboardSummary: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => <a href={String(href)} {...props}>{children}</a>,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock('@/features/auth/actions', () => ({ getCurrentUser: () => mocks.getCurrentUser() }));
vi.mock('@/features/dashboard/api', () => ({ getDashboardSummary: () => mocks.getDashboardSummary() }));
vi.mock('@/lib/permissions', () => ({
  hasPermission: (user: any, key: string) => (user?.permissions ?? []).includes(key),
}));

const dashboardUser = {
  name: 'Gestor',
  permissions: ['dashboard.read'],
  roles: ['COORDINATION_ADMIN'],
  screenAccess: [{ screenId: 'dashboard', level: 'VIEW', state: 'AVAILABLE', usable: true }],
};

const emptySummary = {
  totals: {
    legendarios: null,
    activeLegendarios: null,
    activeTeams: null,
    tops: null,
    families: null,
    churches: null,
    cities: null,
    expertises: null,
    socialActionInterest: null,
    plannedSocialActions: null,
  },
  nextTop: null,
  highlightedTop: null,
  highlightedTopMetrics: null,
};

describe('DashboardPage feedback states', () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.getDashboardSummary.mockReset();
    mocks.replace.mockReset();
  });

  it('mantém cabeçalho e região estrutural durante o carregamento', () => {
    mocks.getCurrentUser.mockReturnValue(new Promise(() => {}));
    render(<DashboardPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Painel de Controle' })).toBeInTheDocument();
    expect(screen.getByText('Carregando painel').closest('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('preserva a navegação conceitual e recupera uma falha sem mensagem técnica', async () => {
    mocks.getCurrentUser.mockResolvedValue(dashboardUser);
    mocks.getDashboardSummary.mockRejectedValue(new Error('segredo técnico'));
    render(<DashboardPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('O resumo do painel não carregou');
    expect(screen.queryByText('segredo técnico')).toBeNull();

    const attemptsBeforeRetry = mocks.getDashboardSummary.mock.calls.length;
    mocks.getDashboardSummary.mockResolvedValue({ data: emptySummary });
    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/ }));

    expect(await screen.findByText('Nenhum evento em destaque')).toBeInTheDocument();
    expect(mocks.getDashboardSummary.mock.calls.length).toBeGreaterThan(attemptsBeforeRetry);
  });
});
