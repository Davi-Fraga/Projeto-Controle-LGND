import { PRIMARY_NAV, NAV_GROUPS, isPrimaryNavVisible, visiblePrimaryNav, groupedPrimaryNav, firstAllowedRoute, navItemForHref, canOpenRoute } from '@central-da-manada/shared';
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

// Links CRUZADOS (§4.9 da change acoes-web-e-seletores-contextuais): uma tela oferece atalho
// para outra (Líderes Espirituais → Legendários, Equipes → detalhe do Legendário...). O destino
// tem que ser governado pela regra da TELA DE DESTINO, não pela tela de origem.
describe('nav-manifest — rota de destino de link cruzado', () => {
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

  it('resolve sub-rotas para a aba dona, pelo prefixo mais específico', () => {
    expect(navItemForHref('/dashboard/legendarios/abc-123')?.screenId).toBe('legendarios');
    expect(navItemForHref('/dashboard/legendarios/abc/editar?fromTeamId=t1')?.screenId).toBe('legendarios');
    expect(navItemForHref('/dashboard/tops/t1/pre-inscricoes')?.screenId).toBe('tops');
    // `/dashboard` é prefixo de todas: a busca ingênua devolveria sempre o Painel.
    expect(navItemForHref('/dashboard')?.screenId).toBe('dashboard');
    expect(navItemForHref('/dashboard/')?.screenId).toBe('dashboard');
  });

  it('não casa por prefixo parcial de segmento', () => {
    expect(navItemForHref('/dashboard/tops-arquivados')?.screenId).not.toBe('tops');
  });

  it('rota fora do manifesto é fail-closed', () => {
    expect(navItemForHref('/outra-app/coisa')).toBeUndefined();
    expect(canOpenRoute(u(['legendarios.read']), '/outra-app/coisa')).toBe(false);
  });

  it('exige a permission da tela de DESTINO, não a da origem', () => {
    const spiritualLeaderOnly = u(['spiritual-leaders.read']);
    // Está na tela de Líderes Espirituais, mas não pode abrir o detalhe do Legendário.
    expect(canOpenRoute(spiritualLeaderOnly, '/dashboard/lideres-espirituais')).toBe(true);
    expect(canOpenRoute(spiritualLeaderOnly, '/dashboard/legendarios/abc')).toBe(false);

    expect(canOpenRoute(u(['legendarios.read']), '/dashboard/legendarios/abc')).toBe(true);
  });

  it('escopo inutilizável fecha o link, mesmo com a permission', () => {
    expect(canOpenRoute(u(['legendarios.read'], ['MEMBER'], ['legendarios']), '/dashboard/legendarios/abc')).toBe(false);
  });

  it('sem usuário, nenhum link cruzado aparece', () => {
    expect(canOpenRoute(null, '/dashboard/legendarios/abc')).toBe(false);
  });
});

// Agrupamento visual das abas (change refinar-design-system-e-acessibilidade-visual).
// O risco desta feature é o agrupamento virar filtro sem ninguém perceber — por isso o
// invariante central é "achatar as seções devolve exatamente visiblePrimaryNav".
describe('nav-manifest — agrupamento visual', () => {
  const u = (permissions: string[], roles: string[] = ['MEMBER']) => ({
    permissions,
    roles,
    screenAccess: permissions
      .filter((permission) => permission.endsWith('.read'))
      .map((permission) => ({
        screenId: permission.replace('.read', ''),
        level: 'VIEW' as const,
        state: 'AVAILABLE' as const,
        usable: true,
      })),
  });

  const admin = u(
    PRIMARY_NAV.filter((i) => !i.adminOnly).flatMap((i) => (i.rule.kind === 'permissions' ? i.rule.keys : [])),
    ['COORDINATION_ADMIN'],
  );

  const achatar = (user: Parameters<typeof groupedPrimaryNav>[0]) =>
    groupedPrimaryNav(user).flatMap((section) => section.items.map((i) => i.screenId));

  it('agrupar não esconde nem inventa aba: achatar devolve exatamente visiblePrimaryNav', () => {
    for (const user of [admin, u(['legendarios.read']), u(['tops.read', 'map.read']), u([]), null]) {
      expect(achatar(user).sort()).toEqual(visiblePrimaryNav(user).map((i) => i.screenId).sort());
    }
  });

  it('todo item do manifesto declara grupo, exceto o Painel (que fica solto no topo)', () => {
    const semGrupo = PRIMARY_NAV.filter((i) => !i.group).map((i) => i.screenId);
    expect(semGrupo).toEqual(['dashboard']);
  });

  it('grupo sem item visível não vira seção — nada de cabeçalho órfão', () => {
    // Só Legendários é visível aqui: o Organograma satisfaz a regra `anyOf` legada por
    // `legendarios.read`, mas este helper só declara `screenAccess` das permissions `.read`
    // informadas — sem entrada usável para `org-chart`, a visibilidade é fail-closed.
    const secoes = groupedPrimaryNav(u(['legendarios.read']));
    expect(secoes.every((s) => s.items.length > 0)).toBe(true);
    expect(secoes.map((s) => s.id)).toEqual(['manada']);
  });

  it('Administração só existe para o admin', () => {
    expect(groupedPrimaryNav(admin).map((s) => s.id)).toContain('administracao');
    expect(groupedPrimaryNav(u(['legendarios.read'])).map((s) => s.id)).not.toContain('administracao');
  });

  it('o Painel fica numa seção sem rótulo, sempre antes dos grupos', () => {
    const secoes = groupedPrimaryNav(admin);
    expect(secoes[0].id).toBeNull();
    expect(secoes[0].label).toBeNull();
    expect(secoes[0].items.map((i) => i.screenId)).toEqual(['dashboard']);
  });

  it('a ordem das seções segue NAV_GROUPS', () => {
    const ids = groupedPrimaryNav(admin).map((s) => s.id).filter((id): id is NonNullable<typeof id> => id !== null);
    expect(ids).toEqual(NAV_GROUPS.map((g) => g.id));
  });

  it('todo grupo declarado no manifesto existe em NAV_GROUPS', () => {
    const declarados = new Set(PRIMARY_NAV.map((i) => i.group).filter(Boolean));
    const conhecidos = new Set(NAV_GROUPS.map((g) => g.id));
    for (const grupo of declarados) expect(conhecidos.has(grupo!)).toBe(true);
  });
});
