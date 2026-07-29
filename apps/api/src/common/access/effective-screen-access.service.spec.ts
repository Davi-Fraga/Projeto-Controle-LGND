import { EffectiveScreenAccessState, ScreenAccessLevel } from '@central-da-manada/shared';
import type { AccessScope } from './access-policy.service';
import { EffectiveScreenAccessService } from './effective-screen-access.service';

const emptyScope = (overrides: Partial<AccessScope> = {}): AccessScope => ({
  isAdmin: false,
  churchIds: [],
  teamIds: [],
  legendaryIds: [],
  cityKeys: [],
  legendaryCities: [],
  topIds: [],
  ...overrides,
});

describe('EffectiveScreenAccessService', () => {
  const service = new EffectiveScreenAccessService({} as any);

  it('marca a tela sem permissao de leitura como MISSING_PERMISSION', () => {
    const access = service.fromPermissionsAndScope([], emptyScope()).find((entry) => entry.screenId === 'teams');

    expect(access).toMatchObject({
      level: ScreenAccessLevel.NONE,
      state: EffectiveScreenAccessState.MISSING_PERMISSION,
      usable: false,
    });
  });

  it('marca a tela com permissao sem escopo como MISSING_SCOPE', () => {
    const access = service.fromPermissionsAndScope(['teams.read', 'teams.members.read'], emptyScope())
      .find((entry) => entry.screenId === 'teams');

    expect(access).toMatchObject({
      level: ScreenAccessLevel.VIEW,
      state: EffectiveScreenAccessState.MISSING_SCOPE,
      usable: false,
    });
  });

  it('aceita escopo derivado ou ALL como acesso efetivo', () => {
    const permissions = ['teams.read', 'teams.members.read'];
    const derived = service.fromPermissionsAndScope(permissions, emptyScope({ teamIds: ['team-1'] }))
      .find((entry) => entry.screenId === 'teams');
    const unrestricted = service.fromPermissionsAndScope(permissions, emptyScope({ allTeams: true }))
      .find((entry) => entry.screenId === 'teams');

    expect(derived).toMatchObject({ state: EffectiveScreenAccessState.AVAILABLE, usable: true });
    expect(unrestricted).toMatchObject({ state: EffectiveScreenAccessState.AVAILABLE, usable: true });
  });

  it('nao aceita escopo suplementar isolado para Legendarios', () => {
    const permissions = ['legendarios.read', 'legendarios.history.read', 'professions.read', 'expertises.read'];
    const access = service.fromPermissionsAndScope(permissions, emptyScope({ teamIds: ['team-1'] }))
      .find((entry) => entry.screenId === 'legendarios');

    expect(access).toMatchObject({ state: EffectiveScreenAccessState.MISSING_SCOPE, usable: false });
  });
});
