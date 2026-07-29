import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EffectiveScreenAccessState, ScopeSelectionMode, ScreenAccessLevel, UserScopeType } from '@central-da-manada/shared';
import { AccessControlService } from './access-control.service';
import { getScreen, permissionsForLevel, SCREEN_CATALOG, satisfyingScopeTypes } from '../../common/access/screen-catalog';

// Conjunto VIEW efetivo de uma tela concedida (= nível ≥ VIEW).
const viewOf = (screenId: string) => permissionsForLevel(getScreen(screenId)!, 'VIEW');

// Monta um usuário com papel (nome + permissions), overrides e escopos.
function buildUser(
  rolePermKeys: string[],
  overrides: { key: string; effect: 'GRANT' | 'REVOKE' }[] = [],
  scopes: any[] = [],
  roleName = 'MEMBER',
) {
  return {
    id: 'u1',
    roles: [{ role: { name: roleName, permissions: rolePermKeys.map((key) => ({ permission: { key } })) } }],
    permissionOverrides: overrides.map((o) => ({ effect: o.effect, permission: { key: o.key } })),
    scopes,
  };
}

const emptyScope = () => ({ isAdmin: false, churchIds: [], teamIds: [], legendaryIds: [], cityKeys: [], legendaryCities: [], topIds: [] });

describe('AccessControlService (por tela)', () => {
  let prisma: any;
  let audit: any;
  let effective: any;
  let accessPolicy: any;
  let effectiveScreenAccess: any;
  let service: AccessControlService;

  beforeEach(() => {
    prisma = {
      user: { findFirst: jest.fn() },
      permission: { findMany: jest.fn().mockResolvedValue([]) },
      userPermissionOverride: { upsert: jest.fn(), deleteMany: jest.fn() },
      userScope: { upsert: jest.fn(), findFirst: jest.fn(), delete: jest.fn(), deleteMany: jest.fn(), createMany: jest.fn(), count: jest.fn().mockResolvedValue(0) },
      userScopePolicy: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn(), deleteMany: jest.fn() },
      // `findMany` por dimensão alimenta a resolução de RÓTULO dos valores de escopo
      // (change painel-escopo-legivel-e-higiene). Default vazio = nada resolvido, que é
      // exatamente o caminho "entidade não existe mais" (missing).
      team: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      church: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      topEvent: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      legendary: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
    };
    audit = { create: jest.fn() };
    effective = { resolveKeys: jest.fn().mockResolvedValue([]) };
    accessPolicy = { resolveScopeByUserId: jest.fn().mockResolvedValue(emptyScope()) };
    effectiveScreenAccess = {
      fromPermissionsAndScope: jest.fn((permissions: Iterable<string>, scope: any) => {
        const set = new Set(permissions);
        return SCREEN_CATALOG.map((screen) => {
          const hasView = screen.view.every((key) => set.has(key));
          const satisfiers = satisfyingScopeTypes(screen);
          const hasScope = scope.isAdmin || satisfiers.some((type) =>
            type === UserScopeType.CITY ? scope.allCities || scope.cityKeys.length > 0 :
            type === UserScopeType.TEAM ? scope.allTeams || scope.teamIds.length > 0 :
            type === UserScopeType.CHURCH ? scope.allChurches || scope.churchIds.length > 0 :
            scope.allTops || scope.topIds.length > 0,
          );
          return { screenId: screen.id, state: !hasView ? EffectiveScreenAccessState.MISSING_PERMISSION : screen.scopeTypes.length && !hasScope ? EffectiveScreenAccessState.MISSING_SCOPE : EffectiveScreenAccessState.AVAILABLE };
        });
      }),
    };
    service = new AccessControlService(prisma, audit, effective, accessPolicy, effectiveScreenAccess);
  });

  describe('getUserScreenAccess — telas, não permissions', () => {
    it('deriva NONE/VIEW/EDIT das CONCESSÕES por tela e agrupa escopos', async () => {
      // Não-admin: o papel (MEMBER) NÃO concede nada; tudo vem das concessões.
      prisma.user.findFirst.mockResolvedValue(
        buildUser(
          [],
          [
            // Equipes em VIEW (só leituras)
            { key: 'teams.read', effect: 'GRANT' },
            { key: 'teams.members.read', effect: 'GRANT' },
            // Igrejas em EDIT (read + mutações)
            { key: 'churches.read', effect: 'GRANT' },
            { key: 'churches.create', effect: 'GRANT' },
            { key: 'churches.update', effect: 'GRANT' },
            { key: 'churches.delete', effect: 'GRANT' },
          ],
          [{ id: 's1', type: 'TEAM', value: 'team-seg' }],
        ),
      );
      // Efetivo: só TEAM tem escopo (satisfatório p/ Equipes; suplementar p/ Legendários).
      accessPolicy.resolveScopeByUserId.mockResolvedValue({ ...emptyScope(), teamIds: ['team-seg'] });
      prisma.team.findMany.mockResolvedValue([{ id: 'team-seg', name: 'Segurança' }]);

      const acl = await service.getUserScreenAccess('u1');
      const byId = Object.fromEntries(acl.screens.map((s) => [s.id, s]));

      expect(acl.screens.every((s) => typeof s.label === 'string')).toBe(true);
      expect(byId['teams'].level).toBe(ScreenAccessLevel.VIEW);
      expect(byId['churches'].level).toBe(ScreenAccessLevel.EDIT);
      expect(byId['legendarios'].level).toBe(ScreenAccessLevel.NONE);
      // `scopes` também sai rotulado (change painel-escopo-legivel-e-higiene).
      expect(byId['teams'].scopes).toEqual([{ id: 's1', type: 'TEAM', value: 'team-seg', label: 'Segurança' }]);
      expect(byId['churches'].scopes).toEqual([]);
      // scopeMissing: churches é escopável, concedida (EDIT) e sem escopo → estado inválido.
      expect(byId['churches'].scopeMissing).toBe(true);
      // teams é escopável mas TEM escopo → ok.
      expect(byId['teams'].scopeMissing).toBe(false);
      // legendarios está em NONE → não marca. dashboard é global (scopeTypes vazio) → nunca marca.
      expect(byId['legendarios'].scopeMissing).toBe(false);
      expect(byId['dashboard'].scopeMissing).toBe(false);
    });

    it('função (não-admin) sem concessões => todas as telas NONE', async () => {
      // Papel TEAM_COORDINATOR com permissions no papel, mas sem concessões por tela.
      prisma.user.findFirst.mockResolvedValue(buildUser(['teams.read', 'teams.members.read'], [], [], 'TEAM_COORDINATOR'));
      const acl = await service.getUserScreenAccess('u1');
      expect(acl.screens.every((s) => s.level === ScreenAccessLevel.NONE)).toBe(true);
    });

    it('Administrador vê todas as telas concedidas pelo papel', async () => {
      // Admin: papel concede as permissions (base). Igrejas com read+mutações => EDIT.
      prisma.user.findFirst.mockResolvedValue(
        buildUser(['churches.read', 'churches.create', 'churches.update', 'churches.delete'], [], [], 'COORDINATION_ADMIN'),
      );
      const acl = await service.getUserScreenAccess('u1');
      const byId = Object.fromEntries(acl.screens.map((s) => [s.id, s]));
      expect(byId['churches'].level).toBe(ScreenAccessLevel.EDIT);
    });
  });

  describe('setScreenLevel — traduz tela+nível em overrides', () => {
    beforeEach(() => {
      prisma.user.findFirst.mockResolvedValue(buildUser([])); // papel sem permissions
      prisma.permission.findMany.mockResolvedValue([
        { key: 'churches.read', id: 'p-read' },
        { key: 'churches.create', id: 'p-create' },
        { key: 'churches.update', id: 'p-update' },
        { key: 'churches.delete', id: 'p-delete' },
      ]);
    });

    it('VIEW concede só a leitura da tela', async () => {
      await service.setScreenLevel('u1', 'churches', ScreenAccessLevel.VIEW, 'admin');
      expect(prisma.userPermissionOverride.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: { userId: 'u1', permissionId: 'p-read', effect: 'GRANT' } }),
      );
      // mutações não são concedidas em VIEW
      const grantedIds = prisma.userPermissionOverride.upsert.mock.calls.map((c: any[]) => c[0].create.permissionId);
      expect(grantedIds).not.toContain('p-create');
      expect(audit.create).toHaveBeenCalled();
    });

    it('EDIT concede leitura + EDIÇÃO, mas NÃO create/delete (admin-only)', async () => {
      await service.setScreenLevel('u1', 'churches', ScreenAccessLevel.EDIT);
      const grantedIds = prisma.userPermissionOverride.upsert.mock.calls.map((c: any[]) => c[0].create.permissionId);
      // churches EDIT = churches.read + churches.update; create/delete são administrativos.
      expect(grantedIds).toEqual(expect.arrayContaining(['p-read', 'p-update']));
      expect(grantedIds).not.toContain('p-create');
      expect(grantedIds).not.toContain('p-delete');
    });

    it('rejeita tela desconhecida', async () => {
      await expect(service.setScreenLevel('u1', 'inexistente', ScreenAccessLevel.VIEW)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('NONE revoga uma permission da base do Administrador', async () => {
      // Só o papel Administrador contribui base; para ele, desligar => REVOKE.
      prisma.user.findFirst.mockResolvedValue(buildUser(['churches.read'], [], [], 'COORDINATION_ADMIN'));
      await service.setScreenLevel('u1', 'churches', ScreenAccessLevel.NONE);
      expect(prisma.userPermissionOverride.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: { userId: 'u1', permissionId: 'p-read', effect: 'REVOKE' } }),
      );
    });
  });

  describe('toggles de ação por tela (organograma)', () => {
    it('reporta os toggles do org-chart com seu estado (granted) a partir das efetivas', async () => {
      prisma.user.findFirst.mockResolvedValue(
        buildUser(
          [],
          [
            // tela org-chart concedida via legado (VIEW) + um toggle concedido
            { key: 'teams.read', effect: 'GRANT' },
            { key: 'legendarios.read', effect: 'GRANT' },
            { key: 'tops.read', effect: 'GRANT' },
            { key: 'organogram.group.move', effect: 'GRANT' },
          ],
        ),
      );

      const acl = await service.getUserScreenAccess('u1');
      const orgChart = acl.screens.find((s) => s.id === 'org-chart')!;
      const byKey = Object.fromEntries(orgChart.actionToggles.map((t) => [t.key, t.granted]));

      expect(byKey['organogram.group.move']).toBe(true);
      expect(byKey['organogram.group.reorder']).toBe(false);
      expect(byKey['organogram.structure.change']).toBe(false);
    });

    it('telas sem toggles reportam actionToggles vazio', async () => {
      prisma.user.findFirst.mockResolvedValue(buildUser([]));
      const acl = await service.getUserScreenAccess('u1');
      expect(acl.screens.find((s) => s.id === 'churches')!.actionToggles).toEqual([]);
    });

    it('setScreenToggle concede um toggle declarado na tela', async () => {
      prisma.user.findFirst.mockResolvedValue(buildUser([]));
      prisma.permission.findMany.mockResolvedValue([{ key: 'organogram.group.move', id: 'p-move' }]);

      await service.setScreenToggle('u1', 'org-chart', 'organogram.group.move', true, 'admin');

      expect(prisma.userPermissionOverride.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: { userId: 'u1', permissionId: 'p-move', effect: 'GRANT' } }),
      );
      expect(audit.create).toHaveBeenCalled();
    });

    it('setScreenToggle rejeita um toggle não declarado na tela (fail-closed)', async () => {
      prisma.user.findFirst.mockResolvedValue(buildUser([]));
      await expect(
        service.setScreenToggle('u1', 'org-chart', 'organogram.person.edit', true),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.userPermissionOverride.upsert).not.toHaveBeenCalled();
    });

    it('setScreenToggle rejeita tela desconhecida', async () => {
      prisma.user.findFirst.mockResolvedValue(buildUser([]));
      await expect(
        service.setScreenToggle('u1', 'inexistente', 'organogram.group.move', true),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.userPermissionOverride.upsert).not.toHaveBeenCalled();
    });
  });

  describe('addScope — elegibilidade derivada do catálogo', () => {
    beforeEach(() => {
      prisma.user.findFirst.mockResolvedValue(buildUser([]));
    });

    it('rejeita escopo TOP quando nenhuma tela concedida suporta TOP', async () => {
      effective.resolveKeys.mockResolvedValue(viewOf('teams')); // tela Equipes não suporta TOP
      await expect(service.addScope('u1', { type: UserScopeType.TOP, value: 'top-1' })).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.userScope.upsert).not.toHaveBeenCalled();
    });

    it('valida a referência do TOP e aceita quando a tela TOPs está concedida', async () => {
      effective.resolveKeys.mockResolvedValue(viewOf('tops'));
      prisma.topEvent.findFirst.mockResolvedValueOnce({ id: 'top-1' });
      await service.addScope('u1', { type: UserScopeType.TOP, value: 'top-1' }, 'admin');
      expect(prisma.userScope.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: { userId: 'u1', type: 'TOP', value: 'top-1' } }),
      );
    });

    it('normaliza a cidade existente quando a tela Legendários está concedida', async () => {
      effective.resolveKeys.mockResolvedValue(viewOf('legendarios'));
      prisma.legendary.findMany.mockResolvedValueOnce([{ city: 'Piracanjuba' }, { city: 'Goiânia' }]);
      await service.addScope('u1', { type: UserScopeType.CITY, value: '  Piracanjuba ' });
      expect(prisma.userScope.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: { userId: 'u1', type: 'CITY', value: 'piracanjuba' } }),
      );
    });

    it('rejeita uma cidade que não existe entre os Legendários (sem texto livre)', async () => {
      effective.resolveKeys.mockResolvedValue(viewOf('legendarios'));
      prisma.legendary.findMany.mockResolvedValueOnce([{ city: 'Goiânia' }, { city: 'Caldas Novas' }]);
      await expect(service.addScope('u1', { type: UserScopeType.CITY, value: 'Londres' })).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.userScope.upsert).not.toHaveBeenCalled();
    });

    // change alinhar-abas: CHURCH aceito com APENAS a tela Líderes Espirituais (sem churches.read).
    it('aceita CHURCH quando só a tela Líderes Espirituais está concedida', async () => {
      effective.resolveKeys.mockResolvedValue(viewOf('spiritual-leaders'));
      prisma.church.findFirst.mockResolvedValueOnce({ id: 'church-1' });
      await service.addScope('u1', { type: UserScopeType.CHURCH, value: 'church-1' }, 'admin');
      expect(prisma.userScope.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: { userId: 'u1', type: 'CHURCH', value: 'church-1' } }),
      );
    });

    it('rejeita CHURCH (400) quando nenhuma tela concedida suporta CHURCH', async () => {
      effective.resolveKeys.mockResolvedValue(viewOf('communications')); // não suporta CHURCH
      await expect(service.addScope('u1', { type: UserScopeType.CHURCH, value: 'church-1' })).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.userScope.upsert).not.toHaveBeenCalled();
    });
  });

  describe('removeScope', () => {
    it('rejeita remover escopo de outro usuário', async () => {
      prisma.userScope.findFirst.mockResolvedValueOnce(null);
      await expect(service.removeScope('u1', 's-x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // change access-scope-bulk-selection: substituição atômica + tri-estado.
  describe('setScopeSelection — substituição atômica', () => {
    beforeEach(() => {
      prisma.user.findFirst.mockResolvedValue(buildUser([]));
      effective.resolveKeys.mockResolvedValue(viewOf('tops')); // tela TOPs concedida → elegível p/ TOP
    });

    it('SELECTED vazio → 400', async () => {
      await expect(service.setScopeSelection('u1', UserScopeType.TOP, { mode: ScopeSelectionMode.SELECTED, values: [] })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('ALL com valores → 400', async () => {
      await expect(service.setScopeSelection('u1', UserScopeType.TOP, { mode: ScopeSelectionMode.ALL, values: ['x'] })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('SELECTED com duplicados → 400', async () => {
      await expect(service.setScopeSelection('u1', UserScopeType.TOP, { mode: ScopeSelectionMode.SELECTED, values: ['a', 'a'] })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('ALL: remove valores explícitos e grava política ALL', async () => {
      await service.setScopeSelection('u1', UserScopeType.TOP, { mode: ScopeSelectionMode.ALL, values: [] }, 'admin');
      expect(prisma.userScope.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1', type: UserScopeType.TOP } });
      expect(prisma.userScopePolicy.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: { userId: 'u1', type: UserScopeType.TOP, mode: ScopeSelectionMode.ALL } }),
      );
    });

    it('MISSING: limpa valores e política', async () => {
      await service.setScopeSelection('u1', UserScopeType.TOP, { mode: ScopeSelectionMode.MISSING, values: [] }, 'admin');
      expect(prisma.userScope.deleteMany).toHaveBeenCalled();
      expect(prisma.userScopePolicy.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1', type: UserScopeType.TOP } });
    });

    it('SELECTED válido: substitui valores e grava política SELECTED', async () => {
      prisma.topEvent.findFirst.mockResolvedValue({ id: 'top-1' });
      await service.setScopeSelection('u1', UserScopeType.TOP, { mode: ScopeSelectionMode.SELECTED, values: ['top-1'] }, 'admin');
      expect(prisma.userScope.createMany).toHaveBeenCalledWith({ data: [{ userId: 'u1', type: UserScopeType.TOP, value: 'top-1' }] });
      expect(prisma.userScopePolicy.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: { userId: 'u1', type: UserScopeType.TOP, mode: ScopeSelectionMode.SELECTED } }),
      );
    });
  });

  describe('unitário policy-aware — 409 SCOPE_MODE_CONFLICT em ALL', () => {
    it('addScope numa dimensão em ALL → 409', async () => {
      prisma.user.findFirst.mockResolvedValue(buildUser([]));
      effective.resolveKeys.mockResolvedValue(viewOf('tops'));
      prisma.topEvent.findFirst.mockResolvedValue({ id: 'top-1' });
      prisma.userScopePolicy.findUnique.mockResolvedValue({ mode: ScopeSelectionMode.ALL });
      await expect(service.addScope('u1', { type: UserScopeType.TOP, value: 'top-1' })).rejects.toBeInstanceOf(ConflictException);
    });

    it('removeScope numa dimensão em ALL → 409', async () => {
      prisma.userScope.findFirst.mockResolvedValue({ id: 's1', type: 'TOP', value: 'top-1' });
      prisma.userScopePolicy.findUnique.mockResolvedValue({ mode: ScopeSelectionMode.ALL });
      await expect(service.removeScope('u1', 's1')).rejects.toBeInstanceOf(ConflictException);
    });
  });

  // change painel-escopo-legivel-e-higiene: o admin não consegue conferir um escopo que
  // aparece como UUID. O backend passa a devolver rótulo humano em TODA lista de valores.
  describe('rótulo humano dos valores de escopo', () => {
    // Concede as telas que suportam cada dimensão, para os escopos serem elegíveis.
    const grantAll = () =>
      [...viewOf('churches'), ...viewOf('teams'), ...viewOf('tops'), ...viewOf('legendarios')].map((key) => ({
        key,
        effect: 'GRANT' as const,
      }));

    const stateOf = (acl: any, screenId: string, type: UserScopeType) =>
      acl.screens.find((s: any) => s.id === screenId).scopeStates.find((s: any) => s.type === type);

    it('rotula igreja, equipe e TOP no formato dos seletores da tela', async () => {
      prisma.user.findFirst.mockResolvedValue(
        buildUser([], grantAll(), [
          { id: 's1', type: 'CHURCH', value: 'church-1' },
          { id: 's2', type: 'TEAM', value: 'team-1' },
          { id: 's3', type: 'TOP', value: 'top-1' },
        ]),
      );
      accessPolicy.resolveScopeByUserId.mockResolvedValue({
        ...emptyScope(),
        churchIds: ['church-1'],
        teamIds: ['team-1'],
        topIds: ['top-1'],
      });
      prisma.church.findMany.mockResolvedValue([{ id: 'church-1', name: 'Igreja Batista Central', city: 'Goiânia' }]);
      prisma.team.findMany.mockResolvedValue([{ id: 'team-1', name: 'Segurança' }]);
      prisma.topEvent.findMany.mockResolvedValue([{ id: 'top-1', name: 'Rota do Cerrado', number: 12, city: 'Anápolis' }]);

      const acl = await service.getUserScreenAccess('u1');

      const church = stateOf(acl, 'churches', UserScopeType.CHURCH);
      expect(church.effectiveValues[0]).toMatchObject({ label: 'Igreja Batista Central', sublabel: 'Goiânia' });
      // A lista CONFIGURADA também vem rotulada: é dela que a edição parte.
      expect(church.configuredValues[0]).toMatchObject({ value: 'church-1', label: 'Igreja Batista Central' });

      expect(stateOf(acl, 'teams', UserScopeType.TEAM).effectiveValues[0].label).toBe('Segurança');
      // Mesmo formato do options de TOP (hífen), para chip e opção não divergirem.
      expect(stateOf(acl, 'tops', UserScopeType.TOP).effectiveValues[0].label).toBe('TOP #12 - Rota do Cerrado');
    });

    it('rotula cidade com a grafia REAL do legendário, não com a key normalizada', async () => {
      prisma.user.findFirst.mockResolvedValue(
        buildUser([], grantAll(), [{ id: 's1', type: 'CITY', value: 'goiania' }]),
      );
      accessPolicy.resolveScopeByUserId.mockResolvedValue({ ...emptyScope(), cityKeys: ['goiania'] });
      prisma.legendary.findMany.mockResolvedValue([{ city: 'Goiânia' }, { city: 'Anápolis' }]);

      const acl = await service.getUserScreenAccess('u1');
      const city = stateOf(acl, 'legendarios', UserScopeType.CITY);

      expect(city.effectiveValues[0]).toMatchObject({ value: 'goiania', label: 'Goiânia' });
      expect(city.effectiveValues[0].label).not.toBe('goiania');
    });

    it('marca missing quando o valor aponta para entidade que não existe mais', async () => {
      prisma.user.findFirst.mockResolvedValue(
        buildUser([], grantAll(), [{ id: 's1', type: 'CHURCH', value: 'church-apagada' }]),
      );
      accessPolicy.resolveScopeByUserId.mockResolvedValue({ ...emptyScope(), churchIds: ['church-apagada'] });
      prisma.church.findMany.mockResolvedValue([]); // soft-deleted / inexistente

      const acl = await service.getUserScreenAccess('u1');
      const church = stateOf(acl, 'churches', UserScopeType.CHURCH);

      expect(church.effectiveValues[0]).toMatchObject({ value: 'church-apagada', label: null, missing: true });
    });

    it('em ALL e MISSING não consulta rótulo (não há valor a rotular)', async () => {
      prisma.user.findFirst.mockResolvedValue(buildUser([], grantAll(), []));
      prisma.userScopePolicy.findMany.mockResolvedValue([{ type: 'CHURCH', mode: ScopeSelectionMode.ALL }]);
      accessPolicy.resolveScopeByUserId.mockResolvedValue({ ...emptyScope(), allChurches: true });

      const acl = await service.getUserScreenAccess('u1');

      expect(prisma.church.findMany).not.toHaveBeenCalled();
      expect(prisma.team.findMany).not.toHaveBeenCalled();
      expect(prisma.topEvent.findMany).not.toHaveBeenCalled();
      const church = stateOf(acl, 'churches', UserScopeType.CHURCH);
      expect(church.effectiveMode).toBe(ScopeSelectionMode.ALL);
      expect(church.effectiveValues).toEqual([]);
    });
  });
});
