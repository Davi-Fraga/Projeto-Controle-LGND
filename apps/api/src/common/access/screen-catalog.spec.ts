import { SCREEN_CATALOG } from './screen-catalog';

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
});
