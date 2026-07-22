import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChurchDetailModal } from './church-detail-modal';

const mocks = vi.hoisted(() => ({ getChurch: vi.fn() }));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}));

vi.mock('./api', () => ({ getChurch: mocks.getChurch }));

describe('ChurchDetailModal — líder espiritual', () => {
  beforeEach(() => {
    mocks.getChurch.mockReset();
  });

  it('exibe o nome efetivo vinculado com navegação ao perfil do Legendário', async () => {
    mocks.getChurch.mockResolvedValue({
      data: {
        id: 'church-1',
        name: 'Igreja Central',
        city: 'Goiânia',
        spiritualLeaderName: 'Nome livre preservado',
        spiritualLeaderEffectiveName: 'Legendário Atualizado',
        spiritualLeaderLegendaryId: 'legendary-1',
        spiritualLeaderLegendary: { id: 'legendary-1', fullName: 'Legendário Atualizado' },
        spiritualLeaderPhone: null,
        latitude: null,
        longitude: null,
        notes: null,
        legendarios: [],
      },
    });

    render(<ChurchDetailModal churchId="church-1" onClose={vi.fn()} />);

    const link = await screen.findByRole('link', { name: 'Legendário Atualizado' });
    expect(link).toHaveAttribute('href', '/dashboard/legendarios/legendary-1');
    expect(screen.queryByText('Nome livre preservado')).not.toBeInTheDocument();
  });

  it('usa o nome livre quando não existe vínculo ativo', async () => {
    mocks.getChurch.mockResolvedValue({
      data: {
        id: 'church-1',
        name: 'Igreja Central',
        city: null,
        spiritualLeaderName: 'Pastor em texto livre',
        spiritualLeaderEffectiveName: 'Pastor em texto livre',
        spiritualLeaderLegendaryId: null,
        spiritualLeaderLegendary: null,
        spiritualLeaderPhone: null,
        latitude: null,
        longitude: null,
        notes: null,
        legendarios: [],
      },
    });

    render(<ChurchDetailModal churchId="church-1" onClose={vi.fn()} />);

    expect(await screen.findByText('Pastor em texto livre')).toBeInTheDocument();
  });
});
