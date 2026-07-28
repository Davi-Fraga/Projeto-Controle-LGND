import { PRIMARY_NAV, isPrimaryNavVisible, visiblePrimaryNav, firstAllowedRoute } from '@central-da-manada/shared';
import { getScreen } from './screen-catalog';

// Paridade manifesto de navegação ↔ SCREEN_CATALOG (change alinhar-abas-controle-acessos).
describe('nav-manifest ↔ SCREEN_CATALOG (paridade)', () => {
  const grantable = PRIMARY_NAV.filter((item) => !item.adminOnly);

  it('cada aba concedível mapeia uma tela do catálogo e usa permissions do VIEW dela', () => {
    for (const item of grantable) {
      const screen = getScreen(item.screenId);
      expect(screen).toBeDefined();
      expect(item.rule.kind).toBe('permissions');
      if (item.rule.kind === 'permissions') {
        for (const key of item.rule.keys) {
          expect(screen!.view).toContain(key);
        }
      }
    }
  });

  it('screenId e href são únicos', () => {
    const ids = PRIMARY_NAV.map((i) => i.screenId);
    const hrefs = PRIMARY_NAV.map((i) => i.href);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('Usuários é exceção administrativa: fora do catálogo, por papel', () => {
    const users = PRIMARY_NAV.find((i) => i.screenId === 'users')!;
    expect(users.adminOnly).toBe(true);
    expect(users.rule).toEqual({ kind: 'admin-role', role: 'COORDINATION_ADMIN' });
    expect(getScreen('users')).toBeUndefined();
  });

  it('nenhuma aba fantasma families/users como concedível', () => {
    expect(grantable.some((i) => i.screenId === 'families')).toBe(false);
    expect(grantable.some((i) => i.screenId === 'users')).toBe(false);
  });

  it('cobre exatamente as 11 abas concedíveis esperadas', () => {
    expect(grantable.map((i) => i.screenId).sort()).toEqual(
      ['churches', 'communications', 'dashboard', 'legendarios', 'map', 'org-chart', 'reports', 'social-actions', 'spiritual-leaders', 'teams', 'tops'].sort(),
    );
  });
});

describe('nav-manifest — visibilidade e destino inicial', () => {
  const u = (permissions: string[], roles: string[] = ['MEMBER'], unavailable: string[] = []) => ({
    permissions,
    roles,
    screenAccess: permissions
      .filter((permission) => permission.endsWith('.read'))
      .map((permission) => ({
        screenId: permission.replace('.read', ''),
        level: 'VIEW' as const,
        state: unavailable.includes(permission.replace('.read', '')) ? 'MISSING_SCOPE' as const : 'AVAILABLE' as const,
        usable: !unavailable.includes(permission.replace('.read', '')),
      })),
  });

  it('Ações Sociais aparece com social-actions.read e TOPs não (gate correto, não tops.read)', () => {
    const ids = visiblePrimaryNav(u(['social-actions.read'])).map((i) => i.screenId);
    expect(ids).toContain('social-actions');
    expect(ids).not.toContain('tops');
  });

  it('TOPs aparece com tops.read e Ações Sociais não', () => {
    const ids = visiblePrimaryNav(u(['tops.read'])).map((i) => i.screenId);
    expect(ids).toContain('tops');
    expect(ids).not.toContain('social-actions');
  });

  it('Igrejas aparece por churches.read (permission, não papel)', () => {
    expect(visiblePrimaryNav(u(['churches.read'])).map((i) => i.screenId)).toContain('churches');
  });

  it('Líderes Espirituais independe de Igrejas', () => {
    const ids = visiblePrimaryNav(u(['spiritual-leaders.read'])).map((i) => i.screenId);
    expect(ids).toContain('spiritual-leaders');
    expect(ids).not.toContain('churches');
  });

  it('Usuários só para COORDINATION_ADMIN; users.* residual não mostra', () => {
    expect(visiblePrimaryNav(u(['users.read', 'users.update'])).map((i) => i.screenId)).not.toContain('users');
    expect(visiblePrimaryNav(u([], ['COORDINATION_ADMIN'])).map((i) => i.screenId)).toContain('users');
  });

  it('Painel some sem dashboard.read', () => {
    expect(visiblePrimaryNav(u(['legendarios.read'])).map((i) => i.screenId)).not.toContain('dashboard');
  });

  it('esconde a aba quando o contrato informa MISSING_SCOPE', () => {
    expect(visiblePrimaryNav(u(['teams.read'], ['MEMBER'], ['teams'])).map((i) => i.screenId)).not.toContain('teams');
  });

  it('sem usuário nada protegido aparece', () => {
    expect(visiblePrimaryNav(null)).toEqual([]);
    expect(isPrimaryNavVisible(undefined, PRIMARY_NAV[0])).toBe(false);
  });

  it('firstAllowedRoute: Painel com dashboard.read; senão primeira aba; null sem nenhuma', () => {
    expect(firstAllowedRoute(u(['dashboard.read']))).toBe('/dashboard');
    expect(firstAllowedRoute(u(['spiritual-leaders.read']))).toBe('/dashboard/lideres-espirituais');
    expect(firstAllowedRoute(u([]))).toBeNull();
  });
});
