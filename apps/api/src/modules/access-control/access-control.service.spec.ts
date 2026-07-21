import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ScreenAccessLevel, UserScopeType } from '@central-da-manada/shared';
import { AccessControlService } from './access-control.service';

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

describe('AccessControlService (por tela)', () => {
  let prisma: any;
  let audit: any;
  let effective: any;
  let service: AccessControlService;

  beforeEach(() => {
    prisma = {
      user: { findFirst: jest.fn() },
      permission: { findMany: jest.fn().mockResolvedValue([]) },
      userPermissionOverride: { upsert: jest.fn(), deleteMany: jest.fn() },
      userScope: { upsert: jest.fn(), findFirst: jest.fn(), delete: jest.fn() },
      team: { findFirst: jest.fn() },
      church: { findFirst: jest.fn() },
      topEvent: { findFirst: jest.fn() },
      legendary: { findMany: jest.fn().mockResolvedValue([]) },
    };
    audit = { create: jest.fn() };
    effective = { resolveKeys: jest.fn().mockResolvedValue([]) };
    service = new AccessControlService(prisma, audit, effective);
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

      const acl = await service.getUserScreenAccess('u1');
      const byId = Object.fromEntries(acl.screens.map((s) => [s.id, s]));

      expect(acl.screens.every((s) => typeof s.label === 'string')).toBe(true);
      expect(byId['teams'].level).toBe(ScreenAccessLevel.VIEW);
      expect(byId['churches'].level).toBe(ScreenAccessLevel.EDIT);
      expect(byId['legendarios'].level).toBe(ScreenAccessLevel.NONE);
      expect(byId['teams'].scopes).toEqual([{ id: 's1', type: 'TEAM', value: 'team-seg' }]);
      expect(byId['churches'].scopes).toEqual([]);
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

  describe('addScope — validação tela×escopo (inclui TOP)', () => {
    beforeEach(() => {
      prisma.user.findFirst.mockResolvedValue(buildUser([]));
    });

    it('rejeita escopo TOP quando o usuário não tem tops.read', async () => {
      effective.resolveKeys.mockResolvedValue(['teams.read']);
      await expect(service.addScope('u1', { type: UserScopeType.TOP, value: 'top-1' })).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.userScope.upsert).not.toHaveBeenCalled();
    });

    it('valida a referência do TOP e aceita quando o usuário tem tops.read', async () => {
      effective.resolveKeys.mockResolvedValue(['tops.read']);
      prisma.topEvent.findFirst.mockResolvedValueOnce({ id: 'top-1' });
      await service.addScope('u1', { type: UserScopeType.TOP, value: 'top-1' }, 'admin');
      expect(prisma.userScope.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: { userId: 'u1', type: 'TOP', value: 'top-1' } }),
      );
    });

    it('normaliza a cidade existente e exige legendarios.read', async () => {
      effective.resolveKeys.mockResolvedValue(['legendarios.read']);
      prisma.legendary.findMany.mockResolvedValueOnce([{ city: 'Piracanjuba' }, { city: 'Goiânia' }]);
      await service.addScope('u1', { type: UserScopeType.CITY, value: '  Piracanjuba ' });
      expect(prisma.userScope.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: { userId: 'u1', type: 'CITY', value: 'piracanjuba' } }),
      );
    });

    it('rejeita uma cidade que não existe entre os Legendários (sem texto livre)', async () => {
      effective.resolveKeys.mockResolvedValue(['legendarios.read']);
      prisma.legendary.findMany.mockResolvedValueOnce([{ city: 'Goiânia' }, { city: 'Caldas Novas' }]);
      await expect(service.addScope('u1', { type: UserScopeType.CITY, value: 'Londres' })).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.userScope.upsert).not.toHaveBeenCalled();
    });
  });

  describe('removeScope', () => {
    it('rejeita remover escopo de outro usuário', async () => {
      prisma.userScope.findFirst.mockResolvedValueOnce(null);
      await expect(service.removeScope('u1', 's-x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
