import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IgrejasPage from './page';

const mocks = vi.hoisted(() => ({
  getChurches: vi.fn(),
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
  getChurches: (search?: string) => mocks.getChurches(search),
  deleteChurch: (id: string) => mocks.deleteChurch(id),
}));

function church(id: string, name: string) {
  return { id, name, city: 'Goiânia', spiritualLeaderName: null, spiritualLeaderPhone: null, latitude: null, longitude: null };
}

describe('IgrejasPage', () => {
  beforeEach(() => {
    mocks.getChurches.mockReset();
    mocks.deleteChurch.mockReset();
  });

  it('carrega e lista as igrejas do backend', async () => {
    mocks.getChurches.mockResolvedValue({ data: [church('c1', 'Igreja Central'), church('c2', 'Igreja da Paz')] });
    render(<IgrejasPage />);

    expect(await screen.findByText('Igreja Central')).toBeInTheDocument();
    expect(screen.getByText('Igreja da Paz')).toBeInTheDocument();
    expect(mocks.getChurches).toHaveBeenCalledWith('');
  });

  it('busca no backend ao digitar o termo', async () => {
    mocks.getChurches
      .mockResolvedValueOnce({ data: [church('c1', 'Igreja Central'), church('c2', 'Igreja da Paz')] })
      .mockResolvedValue({ data: [church('c1', 'Igreja Central')] });
    render(<IgrejasPage />);
    await screen.findByText('Igreja da Paz');

    fireEvent.change(screen.getByLabelText('Buscar igrejas'), { target: { value: 'central' } });

    await waitFor(() => expect(mocks.getChurches).toHaveBeenCalledWith('central'));
    await waitFor(() => expect(screen.queryByText('Igreja da Paz')).toBeNull());
    expect(screen.getByText('Igreja Central')).toBeInTheDocument();
  });

  it('mostra estado vazio específico da busca', async () => {
    mocks.getChurches.mockResolvedValueOnce({ data: [church('c1', 'Igreja Central')] }).mockResolvedValue({ data: [] });
    render(<IgrejasPage />);
    await screen.findByText('Igreja Central');

    fireEvent.change(screen.getByLabelText('Buscar igrejas'), { target: { value: 'zzz' } });

    expect(await screen.findByText(/Nenhuma igreja encontrada para “zzz”/)).toBeInTheDocument();
  });

  it('mostra estado de erro sem tratar a falha como lista vazia', async () => {
    mocks.getChurches.mockRejectedValue(new Error('boom'));
    render(<IgrejasPage />);

    expect(await screen.findByText(/Não foi possível carregar as igrejas/)).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma igreja cadastrada.')).toBeNull();
  });
});
