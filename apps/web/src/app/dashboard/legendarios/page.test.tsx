import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LegendariosPage from './page';

const mocks = vi.hoisted(() => ({
  search: '',
  replace: vi.fn(),
  push: vi.fn(),
  getChurches: vi.fn(),
  getExpertises: vi.fn(),
  getLegendarios: vi.fn(),
  getProfessions: vi.fn(),
  // Permissions efetivas do usuário sob teste + captura dos itens do ActionMenu, para
  // verificar a autorização visual das ações da lista.
  permissions: [] as string[],
  actionLabels: [] as string[],
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, push: mocks.push }),
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
    user: { id: 'user-1', roles: [], permissions: mocks.permissions },
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
  ActionMenu: ({ items }: { items: Array<{ label: string }> }) => {
    mocks.actionLabels = items.map((item) => item.label);
    return null;
  },
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

  it('formata telefone legado na listagem', async () => {
    mocks.getLegendarios.mockResolvedValueOnce({
      data: [{
        id: 'legendary-1',
        fullName: 'Joao Silva',
        phone: '64992485187',
        status: 'ACTIVE',
        expertises: [],
        needsReview: false,
      }],
      meta: { page: 1, perPage: 10, total: 1, totalPages: 1 },
    });

    render(<LegendariosPage />);

    expect(await screen.findByText('(64) 99248-5187')).toBeInTheDocument();
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

/**
 * Autorização visual das ações da lista (change acoes-web-e-seletores-contextuais).
 * Antes, "Editar" e "Inativar" eram um array literal sem filtro: quem tinha apenas
 * `legendarios.read` via as duas.
 */
describe('LegendariosPage — ações por permission', () => {
  beforeEach(() => {
    mocks.search = '';
    mocks.actionLabels = [];
    mocks.getLegendarios.mockReset().mockResolvedValue({
      data: [{ id: 'l1', fullName: 'João', status: 'ACTIVE', expertises: [] }],
      meta: { page: 1, perPage: 10, total: 1, totalPages: 1 },
    });
    mocks.getChurches.mockReset().mockResolvedValue({ data: [] });
    mocks.getProfessions.mockReset().mockResolvedValue({ data: [] });
    mocks.getExpertises.mockReset().mockResolvedValue({ data: [] });
  });

  async function renderWith(...permissions: string[]) {
    mocks.permissions = permissions;
    render(<LegendariosPage />);
    await waitFor(() => expect(mocks.getLegendarios).toHaveBeenCalled());
    await waitFor(() => expect(mocks.actionLabels.length).toBeGreaterThan(0));
  }

  it('somente leitura oferece apenas Ver', async () => {
    await renderWith('legendarios.read');

    expect(mocks.actionLabels).toEqual(['Ver']);
  });

  it('legendarios.delete acrescenta Inativar, mas não Editar', async () => {
    await renderWith('legendarios.read', 'legendarios.delete');

    expect(mocks.actionLabels).toEqual(['Ver', 'Inativar']);
  });

  // Regressão do inventário: PATCH /legendarios/:id é
  // @AnyPermissions('legendarios.update', 'organogram.person.edit').
  it('organogram.person.edit sozinho já habilita Editar', async () => {
    await renderWith('legendarios.read', 'organogram.person.edit');

    expect(mocks.actionLabels).toContain('Editar');
  });

  it('legendarios.update também habilita Editar', async () => {
    await renderWith('legendarios.read', 'legendarios.update');

    expect(mocks.actionLabels).toContain('Editar');
  });
});

// Estados assíncronos da lista (change refinar-design-system, task 4.3).
// A distinção que importa: "não há cadastro" e "sua busca não achou nada" são situações
// diferentes e pedem saídas diferentes — misturar as duas deixa o usuário sem próximo passo.
describe('LegendariosPage — vazio, sem resultado e erro', () => {
  beforeEach(() => {
    mocks.search = '';
    mocks.permissions = [];
    mocks.push.mockReset();
    mocks.getLegendarios.mockReset().mockResolvedValue(emptyResponse);
    mocks.getChurches.mockReset().mockResolvedValue({ data: [] });
    mocks.getProfessions.mockReset().mockResolvedValue({ data: [] });
    mocks.getExpertises.mockReset().mockResolvedValue({ data: [] });
  });

  it('lista vazia sem busca orienta a cadastrar o primeiro', async () => {
    mocks.permissions = ['legendarios.create'];
    render(<LegendariosPage />);

    expect(await screen.findByText('Nenhum Legendário cadastrado')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar Legendário' }));
    expect(mocks.push).toHaveBeenCalledWith('/dashboard/legendarios/novo');
  });

  it('sem permissão de criar, o vazio não oferece uma ação que a API recusaria', async () => {
    mocks.permissions = [];
    render(<LegendariosPage />);

    expect(await screen.findByText('Nenhum Legendário cadastrado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cadastrar Legendário' })).toBeNull();
  });

  it('busca sem resultado é tratada como resultado, não como ausência de cadastro', async () => {
    render(<LegendariosPage />);
    await screen.findByText('Nenhum Legendário cadastrado');

    fireEvent.change(screen.getByPlaceholderText(/buscar/i), { target: { value: 'zzzz' } });

    expect(await screen.findByText('Nenhum Legendário para esta busca')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum Legendário cadastrado')).toBeNull();
    expect(screen.getByRole('button', { name: 'Limpar busca e filtros' })).toBeInTheDocument();
  });

  it('limpar a busca devolve o estado de lista vazia', async () => {
    render(<LegendariosPage />);
    fireEvent.change(screen.getByPlaceholderText(/buscar/i), { target: { value: 'zzzz' } });
    await screen.findByText('Nenhum Legendário para esta busca');

    fireEvent.click(screen.getByRole('button', { name: 'Limpar busca e filtros' }));

    expect(await screen.findByText('Nenhum Legendário cadastrado')).toBeInTheDocument();
  });

  it('erro oferece recuperação e a nova tentativa refaz a busca', async () => {
    mocks.getLegendarios.mockReset().mockRejectedValueOnce(new Error('falhou')).mockResolvedValue(emptyResponse);
    render(<LegendariosPage />);

    expect(await screen.findByText('Não foi possível carregar Legendários')).toBeInTheDocument();
    const chamadasAntes = mocks.getLegendarios.mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    await waitFor(() => expect(mocks.getLegendarios.mock.calls.length).toBeGreaterThan(chamadasAntes));
  });

  it('a mensagem de erro não vaza detalhe técnico', async () => {
    mocks.getLegendarios.mockReset().mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:3333'));
    render(<LegendariosPage />);

    await screen.findByText('Não foi possível carregar Legendários');
    expect(screen.queryByText(/ECONNREFUSED|127\.0\.0\.1|stack/i)).toBeNull();
  });
});
