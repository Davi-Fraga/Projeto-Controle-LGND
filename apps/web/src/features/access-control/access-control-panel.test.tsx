import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessControlPanel } from './access-control-panel';

const mocks = vi.hoisted(() => ({ getUserScreenAccess: vi.fn(), setScopeSelection: vi.fn() }));

vi.mock('./api', () => ({
  getUserScreenAccess: () => mocks.getUserScreenAccess(),
  setScopeSelection: (userId: string, type: string, mode: string, values: string[]) => mocks.setScopeSelection(userId, type, mode, values),
  setScreenLevel: vi.fn(),
  setScreenToggle: vi.fn(),
}));
vi.mock('@/features/churches/api', () => ({
  getChurches: () => Promise.resolve({ data: [{ id: 'c1', name: 'Igreja A' }, { id: 'c2', name: 'Igreja B' }] }),
}));
vi.mock('@/features/tops/api', () => ({
  getTeamsOptionsList: () => Promise.resolve({ data: [] }),
  getTopOptions: () => Promise.resolve({ data: [] }),
}));
vi.mock('@/features/org-chart/api', () => ({ getCityOrgChartOptions: () => Promise.resolve({ data: [] }) }));

function acl(screens: unknown[]) {
  return { data: { userId: 'u1', roles: ['MEMBER'], screens } };
}

const churchState = (over: Record<string, unknown> = {}) => ({
  type: 'CHURCH', satisfying: true, configuredMode: 'MISSING', configuredValues: [], effectiveMode: 'MISSING', effectiveValues: [], ...over,
});

const churchesScreen = (state: any) => ({
  id: 'churches', label: 'Igrejas', level: 'EDIT', supportsEdit: true,
  scopeTypes: ['CHURCH'], scopes: [], actionToggles: [], scopeMissing: state.effectiveMode === 'MISSING', scopeStates: [state],
});

const dashboardScreen = {
  id: 'dashboard', label: 'Painel', level: 'VIEW', supportsEdit: false,
  scopeTypes: [], scopes: [], actionToggles: [], scopeMissing: false, scopeStates: [],
};

describe('AccessControlPanel — escopo tri-estado (bulk-selection)', () => {
  beforeEach(() => {
    mocks.getUserScreenAccess.mockReset();
    mocks.setScopeSelection.mockReset().mockResolvedValue(acl([]));
  });

  it('MISSING: badge e aviso "sem escopo"; tela global não sinaliza', async () => {
    mocks.getUserScreenAccess.mockResolvedValue(acl([churchesScreen(churchState()), dashboardScreen]));
    render(<AccessControlPanel userId="u1" />);
    expect(await screen.findByText('Sem escopo')).toBeInTheDocument();
    expect(screen.getByText(/não verá nenhum dado desta tela/i)).toBeInTheDocument();
  });

  it('clicar "Todos" envia setScopeSelection(ALL, [])', async () => {
    mocks.getUserScreenAccess.mockResolvedValue(acl([churchesScreen(churchState())]));
    render(<AccessControlPanel userId="u1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Todos' }));
    await waitFor(() => expect(mocks.setScopeSelection).toHaveBeenCalledWith('u1', 'CHURCH', 'ALL', []));
  });

  // Efetivo ALL só nasce de configurado ALL (`resolveScope` deriva a flag da política), então
  // o fixture carrega os dois — o controle passou a refletir o CONFIGURADO.
  it('ALL: mostra "inclui novos cadastros"', async () => {
    mocks.getUserScreenAccess.mockResolvedValue(
      acl([churchesScreen(churchState({ configuredMode: 'ALL', effectiveMode: 'ALL' }))]),
    );
    render(<AccessControlPanel userId="u1" />);
    expect(await screen.findByText(/inclui novos cadastros/i)).toBeInTheDocument();
  });

  it('valor derivado do papel aparece read-only (função)', async () => {
    const state = churchState({ effectiveMode: 'SELECTED', effectiveValues: [{ value: 'c1', label: 'Igreja A', sources: ['ROLE_DERIVED'] }] });
    mocks.getUserScreenAccess.mockResolvedValue(acl([churchesScreen(state)]));
    render(<AccessControlPanel userId="u1" />);
    expect(await screen.findByText('Igreja A')).toBeInTheDocument();
    expect(screen.getByText('função')).toBeInTheDocument();
  });

  it('Selecionados: prepara múltiplos e Aplicar envia SELECTED num único request', async () => {
    mocks.getUserScreenAccess.mockResolvedValue(acl([churchesScreen(churchState())]));
    render(<AccessControlPanel userId="u1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Selecionados' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Igreja A' }));
    // nenhum request de mutação antes de "Aplicar"
    expect(mocks.setScopeSelection).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    await waitFor(() => expect(mocks.setScopeSelection).toHaveBeenCalledWith('u1', 'CHURCH', 'SELECTED', ['c1']));
  });
});

// change painel-escopo-legivel-e-higiene
describe('AccessControlPanel — escopo legível e alcance da dimensão', () => {
  const UUID = '3f2a1b9c-0000-4000-8000-000000000001';

  const leadersScreen = (state: any) => ({
    id: 'spiritual-leaders', label: 'Líderes Espirituais', level: 'VIEW', supportsEdit: false,
    scopeTypes: ['CHURCH'], scopes: [], actionToggles: [], scopeMissing: false, scopeStates: [state],
  });

  beforeEach(() => {
    mocks.getUserScreenAccess.mockReset();
    mocks.setScopeSelection.mockReset().mockResolvedValue(acl([]));
  });

  it('exibe o nome da igreja com a cidade como subtítulo, e nunca o UUID', async () => {
    const state = churchState({
      configuredMode: 'SELECTED',
      configuredValues: [{ value: UUID, label: 'Igreja Batista Central', sublabel: 'Goiânia', sources: ['EXPLICIT'] }],
      effectiveMode: 'SELECTED',
      effectiveValues: [{ value: UUID, label: 'Igreja Batista Central', sublabel: 'Goiânia', sources: ['EXPLICIT'] }],
    });
    mocks.getUserScreenAccess.mockResolvedValue(acl([churchesScreen(state)]));

    render(<AccessControlPanel userId="u1" />);

    expect(await screen.findByText('Igreja Batista Central')).toBeInTheDocument();
    expect(screen.getByText(/Goiânia/)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain(UUID);
  });

  it('sinaliza valor cujo item não existe mais, sem cair no identificador', async () => {
    const state = churchState({
      configuredMode: 'SELECTED',
      configuredValues: [{ value: UUID, label: null, missing: true, sources: ['EXPLICIT'] }],
      effectiveMode: 'SELECTED',
      effectiveValues: [{ value: UUID, label: null, missing: true, sources: ['EXPLICIT'] }],
    });
    mocks.getUserScreenAccess.mockResolvedValue(acl([churchesScreen(state)]));

    render(<AccessControlPanel userId="u1" />);

    expect(await screen.findByText('Item removido')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain(UUID);
  });

  it('avisa o alcance quando outra tela concedida usa a mesma dimensão', async () => {
    const state = churchState();
    mocks.getUserScreenAccess.mockResolvedValue(acl([churchesScreen(state), leadersScreen(state)]));

    render(<AccessControlPanel userId="u1" />);

    // O card de Igrejas aponta Líderes Espirituais, e vice-versa.
    expect(await screen.findByText(/também vale para Líderes Espirituais/)).toBeInTheDocument();
    expect(screen.getByText(/também vale para Igrejas/)).toBeInTheDocument();
  });

  it('não avisa alcance quando a outra tela da dimensão está sem acesso', async () => {
    const state = churchState();
    mocks.getUserScreenAccess.mockResolvedValue(
      acl([churchesScreen(state), { ...leadersScreen(state), level: 'NONE' }]),
    );

    render(<AccessControlPanel userId="u1" />);

    await screen.findByText('Igrejas');
    expect(screen.queryByText(/também vale para/)).not.toBeInTheDocument();
  });

  it('vínculo derivado da função não falseia o modo: controle indica o configurado', async () => {
    const state = churchState({
      configuredMode: 'MISSING',
      configuredValues: [],
      effectiveMode: 'SELECTED',
      effectiveValues: [{ value: UUID, label: 'Igreja da Função', sources: ['ROLE_DERIVED'] }],
    });
    mocks.getUserScreenAccess.mockResolvedValue(acl([churchesScreen(state)]));

    render(<AccessControlPanel userId="u1" />);

    // O derivado aparece à parte, identificado e sem virar "Selecionados" configurado.
    expect(await screen.findByText('Igreja da Função')).toBeInTheDocument();
    expect(screen.getByText(/vindos da função do usuário/i)).toBeInTheDocument();
    // Com vínculo da função valendo, não afirma que o usuário "não verá nenhum dado".
    expect(screen.queryByText(/não verá nenhum dado desta tela/i)).not.toBeInTheDocument();
  });

  it('a edição parte dos configurados já rotulados, sem depender das options', async () => {
    const state = churchState({
      configuredMode: 'SELECTED',
      configuredValues: [{ value: UUID, label: 'Igreja Pré-selecionada', sources: ['EXPLICIT'] }],
      effectiveMode: 'SELECTED',
      effectiveValues: [{ value: UUID, label: 'Igreja Pré-selecionada', sources: ['EXPLICIT'] }],
    });
    mocks.getUserScreenAccess.mockResolvedValue(acl([churchesScreen(state)]));

    render(<AccessControlPanel userId="u1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Selecionados' }));

    // O chip em preparação mostra o rótulo do backend — o UUID não vaza nem em edição,
    // apesar de esse id não estar entre as options mockadas.
    expect(await screen.findByText('Igreja Pré-selecionada')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain(UUID);
  });
});
