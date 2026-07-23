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

  it('ALL: mostra "inclui novos cadastros"', async () => {
    mocks.getUserScreenAccess.mockResolvedValue(acl([churchesScreen(churchState({ effectiveMode: 'ALL' }))]));
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
