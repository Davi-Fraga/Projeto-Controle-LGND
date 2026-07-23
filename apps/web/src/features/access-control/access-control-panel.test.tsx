import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessControlPanel } from './access-control-panel';

const mocks = vi.hoisted(() => ({ getUserScreenAccess: vi.fn() }));

vi.mock('./api', () => ({
  getUserScreenAccess: () => mocks.getUserScreenAccess(),
  addUserScope: vi.fn(),
  removeUserScope: vi.fn(),
  setScreenLevel: vi.fn(),
  setScreenToggle: vi.fn(),
}));
vi.mock('@/features/churches/api', () => ({ getChurches: () => Promise.resolve({ data: [] }) }));
vi.mock('@/features/tops/api', () => ({
  getTeamsOptionsList: () => Promise.resolve({ data: [] }),
  getTopOptions: () => Promise.resolve({ data: [] }),
}));
vi.mock('@/features/org-chart/api', () => ({ getCityOrgChartOptions: () => Promise.resolve({ data: [] }) }));
vi.mock('@/components/ui/AsyncCombobox', () => ({ AsyncCombobox: () => <div data-testid="combobox" /> }));

function acl(screens: unknown[]) {
  return { data: { userId: 'u1', roles: ['MEMBER'], screens } };
}

const churchesScopeMissing = {
  id: 'churches',
  label: 'Igrejas',
  level: 'EDIT',
  supportsEdit: true,
  scopeTypes: ['CHURCH'],
  scopes: [],
  actionToggles: [],
  scopeMissing: true,
};

const dashboardGlobal = {
  id: 'dashboard',
  label: 'Painel',
  level: 'VIEW',
  supportsEdit: false,
  scopeTypes: [],
  scopes: [],
  actionToggles: [],
  scopeMissing: false,
};

describe('AccessControlPanel — sinalização de escopo faltante', () => {
  beforeEach(() => mocks.getUserScreenAccess.mockReset());

  it('destaca tela escopável concedida sem escopo e orienta a adicionar', async () => {
    mocks.getUserScreenAccess.mockResolvedValue(acl([churchesScopeMissing, dashboardGlobal]));

    render(<AccessControlPanel userId="u1" />);

    expect(await screen.findByText('Sem escopo')).toBeInTheDocument();
    expect(screen.getByText(/não verá nenhum dado desta tela/i)).toBeInTheDocument();
  });

  it('não sinaliza telas globais (sem recorte de dados)', async () => {
    mocks.getUserScreenAccess.mockResolvedValue(acl([dashboardGlobal]));

    render(<AccessControlPanel userId="u1" />);

    expect(await screen.findByText('Painel')).toBeInTheDocument();
    expect(screen.queryByText('Sem escopo')).toBeNull();
    expect(screen.queryByText(/não verá nenhum dado/i)).toBeNull();
  });
});
