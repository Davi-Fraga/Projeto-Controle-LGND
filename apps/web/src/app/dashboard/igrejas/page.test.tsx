import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IgrejasPage from './page';

const mocks = vi.hoisted(() => ({
  getChurchesPage: vi.fn(),
  getChurchCities: vi.fn(),
  deleteChurch: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}));

vi.mock('@/hooks/use-require-auth', () => ({
  useRequireAuth: () => ({ user: { permissions: [] }, loading: false }),
}));

vi.mock('@/features/churches/api', () => ({
  getChurchesPage: (filters: unknown) => mocks.getChurchesPage(filters),
  getChurchCities: () => mocks.getChurchCities(),
  deleteChurch: (id: string) => mocks.deleteChurch(id),
}));

function church(id: string, name: string, spiritualLeaderPhone: string | null = null) {
  return { id, name, city: 'Goiânia', spiritualLeaderName: null, spiritualLeaderPhone, latitude: null, longitude: null };
}

function pageResponse(data: ReturnType<typeof church>[], options?: { page?: number; total?: number; totalPages?: number }) {
  return {
    data,
    meta: { page: options?.page ?? 1, perPage: 10, total: options?.total ?? data.length, totalPages: options?.totalPages ?? 1 },
  };
}

describe('IgrejasPage', () => {
  beforeEach(() => {
    mocks.getChurchesPage.mockReset();
    mocks.getChurchCities.mockReset();
    mocks.deleteChurch.mockReset();
    mocks.getChurchCities.mockResolvedValue({ data: ['Anápolis', 'Goiânia'] });
  });

  it('carrega a primeira página no endpoint dedicado', async () => {
    mocks.getChurchesPage.mockResolvedValue(pageResponse([
      church('c1', 'Igreja Central', '5564992485187'),
      church('c2', 'Igreja da Paz'),
    ]));
    render(<IgrejasPage />);

    expect(await screen.findByText('Igreja Central')).toBeInTheDocument();
    expect(screen.getByText('Igreja da Paz')).toBeInTheDocument();
    expect(screen.getByText('(64) 99248-5187')).toBeInTheDocument();
    expect(mocks.getChurchesPage).toHaveBeenCalledWith({
      page: 1, perPage: 10, search: undefined, city: undefined,
      hasCoordinates: undefined, hasLegendarios: undefined,
      orderBy: 'name', orderDirection: 'asc',
    });
  });

  it('envia a busca ao backend com debounce e volta para a primeira página', async () => {
    mocks.getChurchesPage.mockResolvedValue(pageResponse([church('c1', 'Igreja Central')]));
    render(<IgrejasPage />);
    await screen.findByText('Igreja Central');

    fireEvent.change(screen.getByLabelText('Buscar igrejas'), { target: { value: 'central' } });

    await waitFor(() => expect(mocks.getChurchesPage).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, search: 'central' }),
    ));
  });

  it('combina cidade, coordenadas e vínculo de legendários na consulta', async () => {
    mocks.getChurchesPage.mockResolvedValue(pageResponse([]));
    render(<IgrejasPage />);
    await screen.findByText('Nenhuma igreja cadastrada.');

    fireEvent.change(screen.getByLabelText('Filtrar por cidade'), { target: { value: 'Goiânia' } });
    fireEvent.change(screen.getByLabelText('Filtrar por coordenadas'), { target: { value: 'false' } });
    fireEvent.change(screen.getByLabelText('Filtrar por legendários'), { target: { value: 'true' } });

    await waitFor(() => expect(mocks.getChurchesPage).toHaveBeenCalledWith(expect.objectContaining({
      page: 1, city: 'Goiânia', hasCoordinates: false, hasLegendarios: true,
    })));
    expect(await screen.findByText('Nenhuma igreja encontrada com os filtros atuais.')).toBeInTheDocument();
  });

  it('pagina mantendo os filtros no backend', async () => {
    mocks.getChurchesPage.mockImplementation(({ page }: { page: number }) => Promise.resolve(pageResponse(
      [church(`c${page}`, `Igreja ${page}`)],
      { page, total: 12, totalPages: 2 },
    )));
    render(<IgrejasPage />);
    await screen.findByText('Igreja 1');

    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));

    expect(await screen.findByText('Igreja 2')).toBeInTheDocument();
    expect(mocks.getChurchesPage).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
  });

  it('descarta resposta obsoleta que chega depois da busca mais recente', async () => {
    let resolveOld: (value: ReturnType<typeof pageResponse>) => void = () => undefined;
    const oldRequest = new Promise<ReturnType<typeof pageResponse>>((resolve) => { resolveOld = resolve; });
    mocks.getChurchesPage.mockImplementation(({ search }: { search?: string }) => {
      if (search === 'antiga') return oldRequest;
      if (search === 'nova') return Promise.resolve(pageResponse([church('new', 'Igreja Nova')]));
      return Promise.resolve(pageResponse([church('initial', 'Igreja Inicial')]));
    });
    render(<IgrejasPage />);
    await screen.findByText('Igreja Inicial');

    fireEvent.change(screen.getByLabelText('Buscar igrejas'), { target: { value: 'antiga' } });
    await waitFor(() => expect(mocks.getChurchesPage).toHaveBeenCalledWith(expect.objectContaining({ search: 'antiga' })));
    fireEvent.change(screen.getByLabelText('Buscar igrejas'), { target: { value: 'nova' } });
    expect(await screen.findByText('Igreja Nova')).toBeInTheDocument();

    await act(async () => { resolveOld(pageResponse([church('old', 'Igreja Antiga')])); await oldRequest; });
    expect(screen.queryByText('Igreja Antiga')).toBeNull();
    expect(screen.getByText('Igreja Nova')).toBeInTheDocument();
  });

  it('mostra estado de erro sem tratar a falha como lista vazia', async () => {
    mocks.getChurchesPage.mockRejectedValue(new Error('boom'));
    render(<IgrejasPage />);
    expect(await screen.findByText(/Não foi possível carregar as igrejas/)).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma igreja cadastrada.')).toBeNull();
  });
});
