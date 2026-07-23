import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LideresEspirituaisPage from './page';

const mocks = vi.hoisted(() => ({
  getChurches: vi.fn(),
  useRequireAuth: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}));

vi.mock('@/hooks/use-require-auth', () => ({
  useRequireAuth: () => mocks.useRequireAuth(),
}));

vi.mock('@/features/spiritual-leaders/api', () => ({
  getSpiritualLeaderChurches: mocks.getChurches,
}));

describe('LideresEspirituaisPage', () => {
  beforeEach(() => {
    // Por padrão o usuário também tem legendarios.read (links cruzados habilitados).
    mocks.useRequireAuth.mockReturnValue({ loading: false, user: { permissions: ['legendarios.read'] } });
    mocks.getChurches.mockReset().mockResolvedValue([
      {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Igreja ADEG',
        city: 'Goiania',
        spiritualLeaderUserId: null,
        spiritualLeaderName: 'Pastor João',
        spiritualLeaderPhone: '64992485187',
        spiritualLeader: null,
        _count: { legendarios: 2 },
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Igreja do Aprisco',
        city: 'Goiania',
        spiritualLeaderUserId: null,
        spiritualLeaderName: null,
        spiritualLeaderPhone: null,
        spiritualLeader: null,
        _count: { legendarios: 1 },
      },
    ]);
  });

  it('busca no backend ao digitar e recalcula a lista/resumos a partir do resultado', async () => {
    const adeg = {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Igreja ADEG',
      city: 'Goiania',
      spiritualLeaderUserId: null,
      spiritualLeaderName: null,
      spiritualLeaderPhone: null,
      spiritualLeader: null,
      _count: { legendarios: 2 },
    };
    const aprisco = { ...adeg, id: '22222222-2222-4222-8222-222222222222', name: 'Igreja do Aprisco', _count: { legendarios: 1 } };
    mocks.getChurches.mockReset().mockResolvedValueOnce([adeg, aprisco]).mockResolvedValue([adeg]);

    render(<LideresEspirituaisPage />);
    await waitFor(() => expect(screen.getAllByRole('link', { name: /Ver legendários/i })).toHaveLength(2));

    fireEvent.change(screen.getByLabelText('Buscar líderes espirituais'), { target: { value: 'adeg' } });

    await waitFor(() => expect(mocks.getChurches).toHaveBeenCalledWith('adeg'));
    await waitFor(() => expect(screen.getAllByRole('link', { name: /Ver legendários/i })).toHaveLength(1));
  });

  it('mostra estado vazio específico da busca quando não há resultado', async () => {
    mocks.getChurches.mockReset().mockResolvedValueOnce([
      { id: '1', name: 'Igreja X', city: null, spiritualLeaderUserId: null, spiritualLeaderName: null, spiritualLeaderPhone: null, spiritualLeader: null, _count: { legendarios: 0 } },
    ]).mockResolvedValue([]);

    render(<LideresEspirituaisPage />);
    fireEvent.change(await screen.findByLabelText('Buscar líderes espirituais'), { target: { value: 'zzz' } });

    expect(await screen.findByText(/Nenhuma igreja encontrada para “zzz”/)).toBeInTheDocument();
  });

  it('links each church to its own filtered legendary list', async () => {
    render(<LideresEspirituaisPage />);

    const links = await screen.findAllByRole('link', { name: /Ver legendários/i });
    expect(links[0]).toHaveAttribute(
      'href',
      '/dashboard/legendarios?churchId=11111111-1111-4111-8111-111111111111&churchName=Igreja%20ADEG',
    );
    expect(links[1]).toHaveAttribute(
      'href',
      '/dashboard/legendarios?churchId=22222222-2222-4222-8222-222222222222&churchName=Igreja%20do%20Aprisco',
    );
  });

  it('formata o telefone do líder espiritual', async () => {
    render(<LideresEspirituaisPage />);

    expect(await screen.findByText('(64) 99248-5187')).toBeInTheDocument();
  });

  it('prioriza o Legendário vinculado e oferece navegação para seu perfil', async () => {
    mocks.getChurches.mockResolvedValueOnce([
      {
        id: 'church-1',
        name: 'Igreja Central',
        city: 'Goiânia',
        spiritualLeaderName: 'Nome livre preservado',
        spiritualLeaderEffectiveName: 'Legendário Atualizado',
        spiritualLeaderLegendaryId: 'legendary-1',
        spiritualLeaderLegendary: { id: 'legendary-1', fullName: 'Legendário Atualizado' },
        spiritualLeaderPhone: null,
        spiritualLeaderUserId: null,
        spiritualLeader: null,
        _count: { legendarios: 1 },
      },
    ]);

    render(<LideresEspirituaisPage />);

    const leaderLink = await screen.findByRole('link', { name: 'Legendário Atualizado' });
    expect(leaderLink).toHaveAttribute('href', '/dashboard/legendarios/legendary-1');
    expect(screen.queryByText('Nome livre preservado')).not.toBeInTheDocument();
  });

  // change alinhar-abas: sem legendarios.read os links cruzados somem, mas os dados ficam.
  it('sem legendarios.read: dados do líder aparecem como texto, sem links para Legendários', async () => {
    mocks.useRequireAuth.mockReturnValue({ loading: false, user: { permissions: ['spiritual-leaders.read'] } });
    mocks.getChurches.mockReset().mockResolvedValueOnce([
      {
        id: 'church-1',
        name: 'Igreja Central',
        city: 'Goiânia',
        spiritualLeaderName: null,
        spiritualLeaderEffectiveName: 'Legendário Atualizado',
        spiritualLeaderLegendaryId: 'legendary-1',
        spiritualLeaderLegendary: { id: 'legendary-1', fullName: 'Legendário Atualizado' },
        spiritualLeaderPhone: null,
        spiritualLeaderUserId: null,
        spiritualLeader: null,
        _count: { legendarios: 1 },
      },
    ]);

    render(<LideresEspirituaisPage />);

    expect(await screen.findByText('Legendário Atualizado')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Legendário Atualizado' })).toBeNull();
    expect(screen.queryByRole('link', { name: /Ver legendários/i })).toBeNull();
  });
});
