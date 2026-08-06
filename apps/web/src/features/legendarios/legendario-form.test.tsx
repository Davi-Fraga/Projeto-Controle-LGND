import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LegendarioForm } from './legendario-form';
import {
  getChurches,
  getExpertises,
  getProfessions,
  updateLegendario,
} from './api';

const router = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => router,
}));

vi.mock('./api', () => ({
  createChurch: vi.fn(),
  createLegendario: vi.fn(),
  getChurches: vi.fn(),
  getExpertises: vi.fn(),
  getProfessions: vi.fn(),
  updateLegendario: vi.fn(),
}));

vi.mock('@/features/tops/api', () => ({
  getTopOptions: vi.fn().mockResolvedValue({ data: [] }),
  getTopFamilyOptions: vi.fn().mockResolvedValue({ data: [] }),
}));

/** Legendário mínimo válido para renderizar o form em modo edição. */
function legendario(over: Record<string, unknown> = {}) {
  return {
    id: 'legendary-1',
    fullName: 'Joao Silva',
    isFromRotaDoCerrado: true,
    servesInChurch: false,
    status: 'ACTIVE',
    socialActionInterest: false,
    needsReview: false,
    expertises: [],
    firstTopIsExternal: false,
    ...over,
  } as any;
}

/** Payload efetivamente enviado no `updateLegendario`. */
function sentPayload() {
  return vi.mocked(updateLegendario).mock.calls[0][1] as Record<string, unknown>;
}

describe('LegendarioForm navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getChurches).mockResolvedValue({ data: [] });
    vi.mocked(getProfessions).mockResolvedValue({ data: [] });
    vi.mocked(getExpertises).mockResolvedValue({ data: [] });
    vi.mocked(updateLegendario).mockResolvedValue({
      data: { id: 'legendary-1' },
    } as any);
  });

  it('retorna ao destino contextual depois de salvar uma edição', async () => {
    render(
      <LegendarioForm
        legendario={legendario()}
        returnTo="/dashboard/legendarios/legendary-1?fromTeamId=team-1"
      />,
    );

    await waitFor(() => expect(getChurches).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Cadastro' }));

    await waitFor(() => expect(updateLegendario).toHaveBeenCalled());
    expect(router.push).toHaveBeenCalledWith(
      '/dashboard/legendarios/legendary-1?fromTeamId=team-1',
    );
  });
});

/**
 * Profissão em texto livre (change profissao-livre-vinculo-catalogo). A tela não carrega
 * mais o catálogo e a resolução é do backend; aqui interessa o que o form INICIALIZA e o
 * que ele ENVIA.
 */
describe('LegendarioForm — profissão em texto livre', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getChurches).mockResolvedValue({ data: [] });
    vi.mocked(getProfessions).mockResolvedValue({ data: [] });
    vi.mocked(getExpertises).mockResolvedValue({ data: [] });
    vi.mocked(updateLegendario).mockResolvedValue({ data: { id: 'legendary-1' } } as any);
  });

  /** Localiza o input pelo rótulo do campo. */
  function professionInput() {
    return screen.getByLabelText('Profissão') as HTMLInputElement;
  }

  it('usa input de texto, não um select', async () => {
    render(<LegendarioForm legendario={legendario()} />);
    await waitFor(() => expect(getChurches).toHaveBeenCalled());

    expect(professionInput().tagName).toBe('INPUT');
  });

  it('não carrega o catálogo de profissões nesta tela', async () => {
    render(<LegendarioForm legendario={legendario()} />);
    await waitFor(() => expect(getChurches).toHaveBeenCalled());

    expect(getProfessions).not.toHaveBeenCalled();
  });

  it('inicializa pelo nome catalogado quando há vínculo', async () => {
    render(
      <LegendarioForm
        legendario={legendario({ professionId: 'prof-1', profession: { id: 'prof-1', name: 'Médico' } })}
      />,
    );
    await waitFor(() => expect(getChurches).toHaveBeenCalled());

    expect(professionInput().value).toBe('Médico');
  });

  it('inicializa pelo texto livre quando não há vínculo', async () => {
    render(<LegendarioForm legendario={legendario({ professionText: 'Domador de Leões' })} />);
    await waitFor(() => expect(getChurches).toHaveBeenCalled());

    expect(professionInput().value).toBe('Domador de Leões');
  });

  it('fica vazio quando não há profissão alguma', async () => {
    render(<LegendarioForm legendario={legendario()} />);
    await waitFor(() => expect(getChurches).toHaveBeenCalled());

    expect(professionInput().value).toBe('');
  });

  it('envia professionText quando o campo é editado', async () => {
    render(<LegendarioForm legendario={legendario({ professionText: 'Pedreiro' })} />);
    await waitFor(() => expect(getChurches).toHaveBeenCalled());

    fireEvent.change(professionInput(), { target: { value: 'Marceneiro' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Cadastro' }));

    await waitFor(() => expect(updateLegendario).toHaveBeenCalled());
    expect(sentPayload().professionText).toBe('Marceneiro');
  });

  it('envia string vazia para limpar explicitamente a profissão', async () => {
    render(<LegendarioForm legendario={legendario({ professionText: 'Pedreiro' })} />);
    await waitFor(() => expect(getChurches).toHaveBeenCalled());

    fireEvent.change(professionInput(), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Cadastro' }));

    await waitFor(() => expect(updateLegendario).toHaveBeenCalled());
    expect(sentPayload().professionText).toBe('');
  });

  it('alteração não relacionada OMITE professionText e preserva o vínculo legado', async () => {
    // Vínculo legado cujo texto não casaria mais (profissão desativada depois).
    render(
      <LegendarioForm
        legendario={legendario({ professionId: 'prof-old', profession: { id: 'prof-old', name: 'Datilógrafo' } })}
      />,
    );
    await waitFor(() => expect(getChurches).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Joao Souza' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Cadastro' }));

    await waitFor(() => expect(updateLegendario).toHaveBeenCalled());
    expect(sentPayload().professionText).toBeUndefined();
    expect(sentPayload()).not.toHaveProperty('professionId');
  });

  it('nunca envia professionId (a web não usa mais o caminho por ID)', async () => {
    render(<LegendarioForm legendario={legendario({ professionText: 'Pedreiro' })} />);
    await waitFor(() => expect(getChurches).toHaveBeenCalled());

    fireEvent.change(professionInput(), { target: { value: 'Médico' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Cadastro' }));

    await waitFor(() => expect(updateLegendario).toHaveBeenCalled());
    expect(sentPayload()).not.toHaveProperty('professionId');
  });
});

// Progresso e envio duplicado (change refinar-design-system, task 4.4).
// `disabled` no botão NÃO basta: o Enter e o clique repetido reentram no handler antes do
// re-render, e o cadastro sairia duplicado. A trava tem que ser síncrona.
describe('LegendarioForm — progresso e envio duplicado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getChurches).mockResolvedValue({ data: [] });
    vi.mocked(getProfessions).mockResolvedValue({ data: [] });
    vi.mocked(getExpertises).mockResolvedValue({ data: [] });
  });

  function renderEdicao() {
    render(<LegendarioForm legendario={legendario()} />);
    return screen.getByRole('button', { name: /salvar cadastro/i }).closest('form') as HTMLFormElement;
  }

  it('dois envios seguidos gravam UMA vez só', async () => {
    let liberar: (v: unknown) => void = () => {};
    vi.mocked(updateLegendario).mockImplementation(
      () => new Promise((resolve) => { liberar = resolve; }) as never,
    );

    const form = renderEdicao();
    fireEvent.submit(form);
    fireEvent.submit(form); // reentrada imediata, antes de qualquer re-render
    fireEvent.submit(form);

    await waitFor(() => expect(updateLegendario).toHaveBeenCalledTimes(1));

    liberar({ data: { id: 'legendary-1' } });
    await waitFor(() => expect(router.push).toHaveBeenCalled());
  });

  it('depois de terminar, o formulário aceita um novo envio (a trava é liberada)', async () => {
    vi.mocked(updateLegendario).mockResolvedValue({ data: { id: 'legendary-1' } } as never);

    const form = renderEdicao();
    fireEvent.submit(form);
    await waitFor(() => expect(updateLegendario).toHaveBeenCalledTimes(1));

    fireEvent.submit(form);
    await waitFor(() => expect(updateLegendario).toHaveBeenCalledTimes(2));
  });

  it('falha no envio libera a trava para o usuário tentar de novo', async () => {
    vi.mocked(updateLegendario).mockRejectedValueOnce(new Error('falhou'));

    const form = renderEdicao();
    fireEvent.submit(form);
    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível salvar/i);

    vi.mocked(updateLegendario).mockResolvedValue({ data: { id: 'legendary-1' } } as never);
    fireEvent.submit(form);
    await waitFor(() => expect(updateLegendario).toHaveBeenCalledTimes(2));
  });

  it('comunica o progresso enquanto salva, para além do texto do botão', async () => {
    let liberar: (v: unknown) => void = () => {};
    vi.mocked(updateLegendario).mockImplementation(
      () => new Promise((resolve) => { liberar = resolve; }) as never,
    );

    const form = renderEdicao();
    fireEvent.submit(form);

    await waitFor(() => expect(form).toHaveAttribute('aria-busy', 'true'));
    expect(screen.getByRole('status')).toHaveTextContent(/salvando o cadastro/i);

    liberar({ data: { id: 'legendary-1' } });
    await waitFor(() => expect(form).toHaveAttribute('aria-busy', 'false'));
  });
});
