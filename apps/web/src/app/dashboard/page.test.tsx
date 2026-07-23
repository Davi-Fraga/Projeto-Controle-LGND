import { render, screen } from '@testing-library/react';
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

function summary(overrides: Record<string, unknown> = {}) {
  return {
    totals: {
      legendarios: 5,
      activeLegendarios: 3,
      activeTeams: null,
      tops: null,
      families: null,
      churches: null,
      cities: 2,
      expertises: null,
      socialActionInterest: 1,
      plannedSocialActions: null,
      ...overrides,
    },
    nextTop: null,
    highlightedTop: null,
    highlightedTopMetrics: null,
  };
}

describe('DashboardPage (gating de cards por permissão)', () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.getDashboardSummary.mockReset();
    mocks.replace.mockReset();
  });

  it('mostra só os cards permitidos e esconde os de entidades sem permissão (valor null)', async () => {
    mocks.getCurrentUser.mockResolvedValue({ name: 'Membro', permissions: ['dashboard.read', 'legendarios.read'] });
    mocks.getDashboardSummary.mockResolvedValue({ data: summary() });

    render(<DashboardPage />);

    expect(await screen.findByText('Legendários')).toBeInTheDocument();
    expect(screen.getByText('Cidades')).toBeInTheDocument(); // derivado de legendarios.read
    // Sem permissão + backend devolve null → card omitido (não vaza contagem global).
    expect(screen.queryByText('TOPs')).toBeNull();
    expect(screen.queryByText('Expertises')).toBeNull();
    expect(screen.queryByText('Igrejas')).toBeNull();
  });

  it('mostra o card TOPs quando o usuário tem tops.read e o valor não é nulo', async () => {
    mocks.getCurrentUser.mockResolvedValue({ name: 'Coord', permissions: ['dashboard.read', 'tops.read'] });
    mocks.getDashboardSummary.mockResolvedValue({ data: summary({ tops: 4 }) });

    render(<DashboardPage />);

    expect(await screen.findByText('TOPs')).toBeInTheDocument();
    // Tem valor (5) mas não tem legendarios.read → card escondido.
    expect(screen.queryByText('Legendários')).toBeNull();
  });

  // change alinhar-abas: entrada em /dashboard sem dashboard.read.
  it('sem dashboard.read redireciona para a primeira aba permitida', async () => {
    mocks.getCurrentUser.mockResolvedValue({ name: 'Líder', permissions: ['spiritual-leaders.read'] });

    render(<DashboardPage />);

    await vi.waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/dashboard/lideres-espirituais'));
    expect(mocks.getDashboardSummary).not.toHaveBeenCalled();
  });

  it('sem nenhuma tela concedida mostra o estado terminal "Acesso ainda não configurado"', async () => {
    mocks.getCurrentUser.mockResolvedValue({ name: 'Ninguém', permissions: [] });

    render(<DashboardPage />);

    expect(await screen.findByText(/Acesso ainda não configurado/i)).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
