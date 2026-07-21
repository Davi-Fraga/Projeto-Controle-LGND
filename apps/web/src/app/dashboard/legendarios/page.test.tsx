import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LegendariosPage from './page';

const mocks = vi.hoisted(() => ({
  search: '',
  replace: vi.fn(),
  getChurches: vi.fn(),
  getExpertises: vi.fn(),
  getLegendarios: vi.fn(),
  getProfessions: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}));

vi.mock('@/hooks/use-require-auth', () => ({
  useRequireAuth: () => ({
    loading: false,
    user: { id: 'user-1', roles: [], permissions: [] },
  }),
}));

vi.mock('@/features/legendarios/api', () => ({
  deactivateLegendario: vi.fn(),
  getChurches: mocks.getChurches,
  getExpertises: mocks.getExpertises,
  getLegendarios: mocks.getLegendarios,
  getProfessions: mocks.getProfessions,
}));

vi.mock('@/components/ui/StatusBadge', () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock('@/components/ui/ConfirmDialog', () => ({
  ConfirmDialog: () => null,
}));

vi.mock('@/components/ui/ActionMenu', () => ({
  ActionMenu: () => null,
}));

vi.mock('@/features/teams/team-filter', () => ({
  TeamFilter: () => null,
}));

const emptyResponse = {
  data: [],
  meta: { page: 1, perPage: 10, total: 0, totalPages: 1 },
};

describe('LegendariosPage church deep-link', () => {
  beforeEach(() => {
    mocks.search = '';
    mocks.replace.mockReset();
    mocks.getLegendarios.mockReset().mockResolvedValue(emptyResponse);
    mocks.getChurches.mockReset().mockResolvedValue({
      data: [
        { id: 'church-1', name: 'Igreja ADEG' },
        { id: 'church-2', name: 'Igreja do Aprisco' },
      ],
    });
    mocks.getProfessions.mockReset().mockResolvedValue({ data: [] });
    mocks.getExpertises.mockReset().mockResolvedValue({ data: [] });
  });

  it('sends the URL churchId in the first request and shows its label', async () => {
    mocks.search = 'churchId=church-1&churchName=Igreja%20ADEG';
    mocks.getChurches.mockRejectedValue(new Error('forbidden'));

    render(<LegendariosPage />);

    await waitFor(() => expect(mocks.getLegendarios).toHaveBeenCalled());
    expect(mocks.getLegendarios.mock.calls[0][0]).toMatchObject({ churchId: 'church-1' });
    expect(screen.getByText('Igreja: Igreja ADEG')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Filtrar por igreja' })).toHaveValue('church-1');
  });

  it('loads without a church filter when the URL has no churchId', async () => {
    render(<LegendariosPage />);

    await waitFor(() => expect(mocks.getLegendarios).toHaveBeenCalled());
    expect(mocks.getLegendarios.mock.calls[0][0].churchId).toBeUndefined();
    expect(screen.queryByRole('button', { name: 'Limpar filtro de igreja' })).not.toBeInTheDocument();

    const statusSelect = screen.getByRole('option', { name: 'Inativo' }).closest('select');
    fireEvent.change(statusSelect!, { target: { value: 'INACTIVE' } });
    await waitFor(() => {
      expect(mocks.getLegendarios.mock.calls.at(-1)?.[0]).toMatchObject({ status: 'INACTIVE' });
    });
  });

  it('updates the URL when selecting a church and removes the filter when clearing it', async () => {
    render(<LegendariosPage />);

    const select = await screen.findByRole('combobox', { name: 'Filtrar por igreja' });
    await waitFor(() => expect(screen.getByRole('option', { name: 'Igreja do Aprisco' })).toBeInTheDocument());
    fireEvent.change(select, { target: { value: 'church-2' } });

    expect(mocks.replace).toHaveBeenLastCalledWith(
      '/dashboard/legendarios?churchId=church-2&churchName=Igreja+do+Aprisco',
    );
    expect(await screen.findByText('Igreja: Igreja do Aprisco')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtro de igreja' }));

    expect(mocks.replace).toHaveBeenLastCalledWith('/dashboard/legendarios');
    await waitFor(() => {
      expect(mocks.getLegendarios.mock.calls.at(-1)?.[0].churchId).toBeUndefined();
    });
  });
});
