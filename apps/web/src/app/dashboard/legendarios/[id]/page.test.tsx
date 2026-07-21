import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LegendarioDetalhePage from './page';

const mocks = vi.hoisted(() => ({
  permissions: [] as string[],
  replace: vi.fn(),
  getLegendario: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'legendary-1' }),
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams('fromTeamId=11111111-1111-4111-8111-111111111111'),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}));

vi.mock('@/hooks/use-require-auth', () => ({
  useRequireAuth: () => ({
    loading: false,
    user: {
      id: 'user-1',
      name: 'Gestor',
      email: 'gestor@example.com',
      roles: [],
      permissions: mocks.permissions,
    },
  }),
}));

vi.mock('@/features/legendarios/api', () => ({
  getLegendario: mocks.getLegendario,
}));

vi.mock('@/features/legendarios/legendario-history-section', () => ({
  LegendarioHistorySection: ({ canCreate }: { canCreate: boolean }) => (
    <div>Historico canCreate={String(canCreate)}</div>
  ),
}));

vi.mock('@/components/ui/StatusBadge', () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

const legendary = {
  id: 'legendary-1',
  fullName: 'Joao Silva',
  status: 'ACTIVE',
  isFromRotaDoCerrado: true,
  socialActionInterest: false,
  servesInChurch: false,
  expertises: [],
  topServants: [],
  phone: '64992485187',
  spiritualLeaderName: 'Pastor João',
  spiritualLeaderPhone: '5564992485187',
  relativeName: 'Maria Silva',
  relativePhone: '+55 64 99988-7766',
};

describe('LegendarioDetalhePage from a team', () => {
  beforeEach(() => {
    mocks.permissions = ['teams.members.read'];
    mocks.replace.mockReset();
    mocks.getLegendario.mockReset().mockResolvedValue({ data: legendary });
  });

  it('returns to the source team and hides edit/history without their permissions', async () => {
    render(<LegendarioDetalhePage />);

    expect(await screen.findByRole('heading', { name: 'Joao Silva' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Voltar para equipe/ })).toHaveAttribute(
      'href',
      '/dashboard/equipes/11111111-1111-4111-8111-111111111111',
    );
    expect(screen.queryByRole('link', { name: 'Editar Cadastro' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Historico canCreate/)).not.toBeInTheDocument();
    expect(screen.getAllByText('(64) 99248-5187')).toHaveLength(2);
    expect(screen.getByText('(64) 99988-7766')).toBeInTheDocument();
  });

  it('shows edit and history only when the effective permissions allow them', async () => {
    mocks.permissions = [
      'legendarios.update',
      'legendarios.history.read',
      'legendarios.history.create',
    ];

    render(<LegendarioDetalhePage />);

    expect(await screen.findByRole('link', { name: 'Editar Cadastro' })).toBeInTheDocument();
    expect(screen.getByText('Historico canCreate=true')).toBeInTheDocument();
  });
});
