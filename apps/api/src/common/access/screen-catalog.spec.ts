import { UserScopeType } from '@central-da-manada/shared';
import {
  SCREEN_CATALOG,
  getScreen,
  permissionsForLevel,
  screenActionToggles,
  satisfyingScopeTypes,
  supplementalScopeTypes,
} from './screen-catalog';

// Criar/excluir/restaurar de entidade de topo é ação administrativa: NÃO pode
// constar em nenhum conjunto concedível por tela (só o admin as tem via base).
const ADMIN_ONLY = [
  'legendarios.create', 'legendarios.delete', 'legendarios.restore',
  'teams.create', 'teams.delete', 'teams.restore',
  'churches.create', 'churches.delete',
  'tops.create', 'tops.delete', 'tops.restore',
  'families.create',
  'social-actions.create', 'social-actions.delete', 'social-actions.restore',
  'communications.create', 'communications.delete',
  'users.create', 'users.deactivate',
];

describe('screen-catalog', () => {
  const grantable = new Set(SCREEN_CATALOG.flatMap((s) => [...s.view, ...s.edit]));

  it('não torna create/delete de topo concedível por tela (admin-only)', () => {
    for (const key of ADMIN_ONLY) {
      expect(grantable.has(key)).toBe(false);
    }
  });

  it('mantém editar e sub-recursos concedíveis por tela', () => {
    expect(grantable.has('tops.update')).toBe(true);
    expect(grantable.has('teams.update')).toBe(true);
    expect(grantable.has('teams.members.add')).toBe(true);
    expect(grantable.has('tops.participants.add')).toBe(true);
    expect(grantable.has('tops.families.create')).toBe(true); // família dentro do TOP do escopo
  });

  // Higiene do catálogo (change access-scope-semantics-hardening).
  it('não expõe a tela fantasma "Famílias" (o domínio real é tops.families.*)', () => {
    expect(getScreen('families')).toBeUndefined();
    expect(grantable.has('families.read')).toBe(false);
    expect(grantable.has('families.update')).toBe(false);
  });

  it('não expõe a tela "Usuários" (administração é role-gated; users.* fica só-admin)', () => {
    expect(getScreen('users')).toBeUndefined();
    // users.update gera password-reset — não pode ser concedível por tela.
    expect(grantable.has('users.update')).toBe(false);
    expect(grantable.has('users.read')).toBe(false);
    expect(grantable.has('audit.read')).toBe(false);
  });
});

// change organograma-navegacao-escalavel (decisão Q1): o modelo de tela ganha
// TOGGLES de ação, concedidos separadamente de VIEW/EDIT. Isso permite conceder
// "editar pessoa sem mover" — o que NONE/VIEW/EDIT sozinho não expressa.
describe('screen-catalog action toggles (organograma)', () => {
  it('org-chart declara toggles de ação, separados de VIEW/EDIT (editar sem mover)', () => {
    const orgChart = getScreen('org-chart');
    expect(orgChart).toBeDefined();

    const toggles = screenActionToggles(orgChart!);
    expect(toggles).toEqual(
      expect.arrayContaining([
        'organogram.group.reorder',
        'organogram.group.move',
        'organogram.structure.change',
      ]),
    );

    // Conceder EDIT NÃO concede os toggles: quem edita não ganha mover por tabela.
    const byEdit = new Set(permissionsForLevel(orgChart!, 'EDIT'));
    for (const toggle of toggles) {
      expect(byEdit.has(toggle)).toBe(false);
    }
  });

  it('não adiciona toggles às demais telas (extensão aditiva)', () => {
    for (const screen of SCREEN_CATALOG.filter((s) => s.id !== 'org-chart')) {
      expect(screenActionToggles(screen)).toEqual([]);
    }
  });

  it('org-chart concede organogram.person.edit no nível EDIT (Fase 2)', () => {
    const orgChart = getScreen('org-chart')!;
    expect(permissionsForLevel(orgChart, 'EDIT')).toContain('organogram.person.edit');
  });
});

// change alinhar-abas-controle-acessos: tela Líderes Espirituais independente de Igrejas.
describe('screen-catalog — Líderes Espirituais', () => {
  const grantable = new Set(SCREEN_CATALOG.flatMap((s) => [...s.view, ...s.edit]));

  it('declara a tela spiritual-leaders VIEW-only com escopo CHURCH', () => {
    const s = getScreen('spiritual-leaders');
    expect(s).toBeDefined();
    expect(s!.label).toBe('Líderes Espirituais');
    expect(s!.view).toEqual(['spiritual-leaders.read']);
    expect(s!.edit).toEqual([]);
    expect(s!.scopeTypes).toEqual([UserScopeType.CHURCH]);
  });

  it('torna spiritual-leaders.read concedível por tela, sem tocar em churches.*', () => {
    expect(grantable.has('spiritual-leaders.read')).toBe(true);
    // Independência: a tela de Líderes NÃO concede permissões de Igrejas.
    const s = getScreen('spiritual-leaders')!;
    expect([...s.view, ...s.edit].some((k) => k.startsWith('churches.'))).toBe(false);
  });
});

// change access-scope-bulk-selection: dimensões satisfatórias x suplementares.
describe('screen-catalog — satisfying/supplemental', () => {
  it('Legendários: CITY/CHURCH satisfazem, TEAM é suplementar', () => {
    const leg = getScreen('legendarios')!;
    expect(satisfyingScopeTypes(leg)).toEqual([UserScopeType.CITY, UserScopeType.CHURCH]);
    expect(supplementalScopeTypes(leg)).toEqual([UserScopeType.TEAM]);
  });

  it('demais telas escopáveis: satisfying = scopeTypes; supplemental vazio (default)', () => {
    for (const id of ['churches', 'teams', 'tops', 'social-actions', 'map', 'reports', 'spiritual-leaders']) {
      const s = getScreen(id)!;
      expect(satisfyingScopeTypes(s)).toEqual(s.scopeTypes);
      expect(supplementalScopeTypes(s)).toEqual([]);
    }
  });
});

// Invariante DECLARAÇÃO × ENFORCEMENT.
//
// O catálogo não é decorativo: `scopeMissing` (o aviso "Sem escopo" do painel) e a
// elegibilidade de escopo (`assertScopeAllowed`) saem daqui. Quando ele diverge do
// builder que o service realmente usa, o admin recebe um sinal FALSO — foi o caso de
// Igrejas (declarava só CHURCH, filtrava por cidade ∪ igreja) e do Mapa.
//
// Este teste é a trava: mudar o builder de uma tela sem mexer no catálogo quebra aqui.
describe('screen-catalog — declaração × enforcement', () => {
  // Dimensões que cada build*Where do AccessPolicyService de fato considera.
  const BUILDER_DIMENSIONS: Record<string, UserScopeType[]> = {
    buildCityWhere: [UserScopeType.CITY],
    buildTeamWhere: [UserScopeType.TEAM],
    buildTopWhere: [UserScopeType.TOP],
    buildChurchWhere: [UserScopeType.CHURCH],
    buildChurchScopeWhere: [UserScopeType.CHURCH, UserScopeType.CITY],
    buildLegendaryWhere: [UserScopeType.CITY, UserScopeType.CHURCH],
  };

  // Builder que filtra a LISTAGEM principal de cada tela escopável.
  // `org-chart` fica fora de propósito: tem abas com builders distintos
  // (equipes via buildTeamWhere, cidades via buildLegendaryWhere + assertCityAllowed).
  const SCREEN_ENFORCEMENT: Record<string, keyof typeof BUILDER_DIMENSIONS> = {
    legendarios: 'buildLegendaryWhere',
    teams: 'buildTeamWhere',
    churches: 'buildChurchScopeWhere',
    'spiritual-leaders': 'buildChurchWhere',
    tops: 'buildTopWhere',
    'social-actions': 'buildCityWhere',
    reports: 'buildCityWhere',
    map: 'buildLegendaryWhere',
  };

  const sorted = (types: UserScopeType[]) => [...types].sort();

  it.each(Object.entries(SCREEN_ENFORCEMENT))(
    'tela "%s": dimensões satisfatórias == dimensões de %s',
    (screenId, builder) => {
      const screen = getScreen(screenId)!;
      expect(screen).toBeDefined();
      expect(sorted(satisfyingScopeTypes(screen))).toEqual(sorted(BUILDER_DIMENSIONS[builder]));
    },
  );

  it('toda tela escopável do catálogo está coberta (exceto org-chart, multi-aba)', () => {
    const uncovered = SCREEN_CATALOG.filter(
      (screen) => screen.scopeTypes.length > 0 && screen.id !== 'org-chart' && !SCREEN_ENFORCEMENT[screen.id],
    ).map((screen) => screen.id);
    expect(uncovered).toEqual([]);
  });
});
