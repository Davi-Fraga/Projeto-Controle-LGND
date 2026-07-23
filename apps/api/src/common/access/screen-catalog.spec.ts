import { SCREEN_CATALOG, getScreen, permissionsForLevel, screenActionToggles } from './screen-catalog';

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
