import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EditarLegendarioPage from './page';

const mocks = vi.hoisted(() => ({
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
  useRequireAuth: () => ({ loading: false }),
}));

vi.mock('@/features/legendarios/api', () => ({
  getLegendario: mocks.getLegendario,
}));

vi.mock('@/features/legendarios/legendario-form', () => ({
  LegendarioForm: ({ returnTo }: { returnTo?: string }) => (
    <div data-testid="legendario-form" data-return-to={returnTo} />
  ),
}));

describe('EditarLegendarioPage from a team', () => {
  beforeEach(() => {
    mocks.replace.mockReset();
    mocks.getLegendario.mockReset().mockResolvedValue({
      data: { id: 'legendary-1', fullName: 'Joao Silva' },
    });
  });

  it('reusa a tela canônica e preserva o contexto da equipe no retorno', async () => {
    render(<EditarLegendarioPage />);

    expect(await screen.findByRole('heading', { name: 'Editar Legendário' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Voltar para detalhes/ })).toHaveAttribute(
      'href',
      '/dashboard/legendarios/legendary-1?fromTeamId=11111111-1111-4111-8111-111111111111',
    );
    expect(screen.getByTestId('legendario-form')).toHaveAttribute(
      'data-return-to',
      '/dashboard/legendarios/legendary-1?fromTeamId=11111111-1111-4111-8111-111111111111',
    );
  });
});
