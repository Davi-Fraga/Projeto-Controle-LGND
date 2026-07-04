import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  PermissionEffect,
  ScreenAccessLevel,
  UserScopeType,
  type ScreenScopeEntry,
  type UserScreenAccessControl,
} from '@central-da-manada/shared';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EffectivePermissionsService } from '../../common/access/effective-permissions.service';
import { roleContributesBase } from '../../common/access/access.constants';
import { SCREEN_CATALOG, getScreen, permissionsForLevel } from '../../common/access/screen-catalog';
import { normalizeCityKey } from '../../common/org-chart/org-chart.util';
import { AddUserScopeDto } from './dto/access-control.dto';

// Permission de leitura exigida por tipo de escopo: um escopo sem a permission
// correspondente é uma combinação inválida (tela×escopo).
const SCOPE_REQUIRED_PERMISSION: Record<UserScopeType, string> = {
  [UserScopeType.CITY]: 'legendarios.read',
  [UserScopeType.TEAM]: 'teams.read',
  [UserScopeType.CHURCH]: 'churches.read',
  [UserScopeType.TOP]: 'tops.read',
};

const userAccessInclude = {
  roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
  permissionOverrides: { include: { permission: true } },
  scopes: true,
} as const;

@Injectable()
export class AccessControlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly effectivePermissions: EffectivePermissionsService,
  ) {}

  // Estado de acesso de um usuário POR TELA (o admin nunca vê permissions cruas).
  async getUserScreenAccess(userId: string): Promise<UserScreenAccessControl> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: userAccessInclude,
    });
    if (!user) throw new NotFoundException('User not found.');

    const effective = this.computeEffective(user);

    const screens = SCREEN_CATALOG.map((screen) => {
      const supportsEdit = screen.edit.length > 0;
      const hasAllView = screen.view.every((key) => effective.has(key));
      const hasAllEdit = supportsEdit && screen.edit.every((key) => effective.has(key));
      const level = !hasAllView
        ? ScreenAccessLevel.NONE
        : hasAllEdit
          ? ScreenAccessLevel.EDIT
          : ScreenAccessLevel.VIEW;

      const scopes: ScreenScopeEntry[] = user.scopes
        .filter((scope) => screen.scopeTypes.includes(scope.type as UserScopeType))
        .map((scope) => ({ id: scope.id, type: scope.type as UserScopeType, value: scope.value }));

      return { id: screen.id, label: screen.label, level, supportsEdit, scopeTypes: screen.scopeTypes, scopes };
    });

    return { userId: user.id, roles: user.roles.map((userRole) => userRole.role.name), screens };
  }

  // Define o nível de acesso de UMA tela, traduzindo para o conjunto de overrides
  // (GRANT/REVOKE/INHERIT) das permissions daquela tela. NONE remove o acesso.
  async setScreenLevel(userId: string, screenId: string, level: ScreenAccessLevel, actorUserId?: string): Promise<UserScreenAccessControl> {
    await this.ensureUserExists(userId);
    const screen = getScreen(screenId);
    if (!screen) throw new NotFoundException(`Unknown screen: ${screenId}`);

    // Tela só-leitura: EDIT é tratado como VIEW.
    const effectiveLevel = level === ScreenAccessLevel.EDIT && screen.edit.length === 0 ? ScreenAccessLevel.VIEW : level;

    const desiredOn = new Set<string>(
      effectiveLevel === ScreenAccessLevel.NONE
        ? []
        : permissionsForLevel(screen, effectiveLevel === ScreenAccessLevel.EDIT ? 'EDIT' : 'VIEW'),
    );

    const rolePerms = this.roleKeys(await this.loadUserWithAccess(userId));
    const allScreenKeys = Array.from(new Set([...screen.view, ...screen.edit]));
    const permissions = await this.prisma.permission.findMany({ where: { key: { in: allScreenKeys } } });
    const idByKey = new Map(permissions.map((permission) => [permission.key, permission.id] as const));

    for (const key of allScreenKeys) {
      const permissionId = idByKey.get(key);
      if (!permissionId) continue; // permission do catálogo não semeada → ignora
      const roleHas = rolePerms.has(key);
      const wantOn = desiredOn.has(key);

      if (wantOn) {
        // Ligar: se o papel já concede, basta herdar; senão concede explicitamente.
        if (roleHas) {
          await this.prisma.userPermissionOverride.deleteMany({ where: { userId, permissionId } });
        } else {
          await this.upsertOverride(userId, permissionId, PermissionEffect.GRANT);
        }
      } else {
        // Desligar: se o papel concede, revoga; senão herdar (sem override).
        if (roleHas) {
          await this.upsertOverride(userId, permissionId, PermissionEffect.REVOKE);
        } else {
          await this.prisma.userPermissionOverride.deleteMany({ where: { userId, permissionId } });
        }
      }
    }

    await this.audit.create({
      actorUserId,
      entityType: 'UserScreenAccess',
      entityId: userId,
      action: 'set-level',
      after: { screen: screenId, level: effectiveLevel },
    });

    return this.getUserScreenAccess(userId);
  }

  // Adiciona um escopo (1-N). Valida a combinação tela×escopo (permission de leitura).
  async addScope(userId: string, dto: AddUserScopeDto, actorUserId?: string): Promise<UserScreenAccessControl> {
    await this.ensureUserExists(userId);

    const value = await this.normalizeScopeValue(dto.type, dto.value);
    await this.assertScopeAllowed(userId, dto.type);

    await this.prisma.userScope.upsert({
      where: { userId_type_value: { userId, type: dto.type, value } },
      update: {},
      create: { userId, type: dto.type, value },
    });

    await this.audit.create({ actorUserId, entityType: 'UserScope', entityId: userId, action: 'add', after: { type: dto.type, value } });
    return this.getUserScreenAccess(userId);
  }

  async removeScope(userId: string, scopeId: string, actorUserId?: string): Promise<UserScreenAccessControl> {
    const scope = await this.prisma.userScope.findFirst({ where: { id: scopeId, userId } });
    if (!scope) throw new NotFoundException('Scope not found for this user.');

    await this.prisma.userScope.delete({ where: { id: scope.id } });
    await this.audit.create({ actorUserId, entityType: 'UserScope', entityId: userId, action: 'remove', before: { type: scope.type, value: scope.value } });
    return this.getUserScreenAccess(userId);
  }

  private upsertOverride(userId: string, permissionId: string, effect: PermissionEffect) {
    return this.prisma.userPermissionOverride.upsert({
      where: { userId_permissionId: { userId, permissionId } },
      update: { effect },
      create: { userId, permissionId, effect },
    });
  }

  private computeEffective(user: Awaited<ReturnType<AccessControlService['loadUserWithAccess']>>): Set<string> {
    const effective = this.roleKeys(user);
    for (const override of user!.permissionOverrides) {
      if ((override.effect as PermissionEffect) === PermissionEffect.GRANT) effective.add(override.permission.key);
      else effective.delete(override.permission.key);
    }
    return effective;
  }

  // Base de permissions do papel: só conta para o Administrador. Para as demais
  // funções é vazia — o acesso vem exclusivamente das concessões por tela.
  private roleKeys(user: Awaited<ReturnType<AccessControlService['loadUserWithAccess']>>): Set<string> {
    const keys = new Set<string>();
    for (const userRole of user!.roles) {
      if (!roleContributesBase(userRole.role.name)) continue;
      for (const rolePermission of userRole.role.permissions) keys.add(rolePermission.permission.key);
    }
    return keys;
  }

  private loadUserWithAccess(userId: string) {
    return this.prisma.user.findFirst({ where: { id: userId, deletedAt: null }, include: userAccessInclude });
  }

  private async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found.');
  }

  // CITY: armazena a key normalizada e VALIDA que a cidade existe (entre os
  // Legendários). TEAM/CHURCH/TOP: valida a referência e usa o id. Nunca aceita
  // valor arbitrário — o escopo só pode ser uma entidade real (sem texto livre).
  private async normalizeScopeValue(type: UserScopeType, value: string): Promise<string> {
    if (type === UserScopeType.CITY) {
      const key = normalizeCityKey(value);
      if (!key) throw new BadRequestException('City scope value is empty.');
      if (!(await this.cityExists(key))) {
        throw new BadRequestException('City not found among legendaries.');
      }
      return key;
    }

    if (type === UserScopeType.TEAM) {
      const team = await this.prisma.team.findFirst({ where: { id: value, deletedAt: null }, select: { id: true } });
      if (!team) throw new BadRequestException('Team not found for scope.');
      return team.id;
    }

    if (type === UserScopeType.CHURCH) {
      const church = await this.prisma.church.findFirst({ where: { id: value, deletedAt: null }, select: { id: true } });
      if (!church) throw new BadRequestException('Church not found for scope.');
      return church.id;
    }

    const top = await this.prisma.topEvent.findFirst({ where: { id: value, deletedAt: null }, select: { id: true } });
    if (!top) throw new BadRequestException('TOP not found for scope.');
    return top.id;
  }

  // A cidade existe se algum Legendário tem esse `city` (normalizado).
  private async cityExists(normalizedKey: string): Promise<boolean> {
    const rows = await this.prisma.legendary.findMany({
      where: { deletedAt: null, city: { not: null } },
      select: { city: true },
      distinct: ['city'],
    });
    return rows.some((row) => row.city && normalizeCityKey(row.city) === normalizedKey);
  }

  private async assertScopeAllowed(userId: string, type: UserScopeType) {
    const required = SCOPE_REQUIRED_PERMISSION[type];
    const effective = await this.effectivePermissions.resolveKeys(userId);
    if (!effective.includes(required)) {
      throw new BadRequestException(`Invalid screen×scope: scope ${type} requires permission ${required}.`);
    }
  }
}
