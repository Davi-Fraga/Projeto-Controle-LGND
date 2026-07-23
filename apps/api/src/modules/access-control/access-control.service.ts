import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  PermissionEffect,
  ScopeSelectionMode,
  ScopeValueSource,
  ScreenAccessLevel,
  UserScopeType,
  type ScreenScopeEntry,
  type ScreenScopeState,
  type SetScopeSelectionInput,
  type UserScreenAccessControl,
} from '@central-da-manada/shared';
import { PrismaService } from '../../database/prisma.service';
import { AccessPolicyService, type AccessScope } from '../../common/access/access-policy.service';
import { AuditService } from '../audit/audit.service';
import { EffectivePermissionsService } from '../../common/access/effective-permissions.service';
import { roleContributesBase } from '../../common/access/access.constants';
import { SCREEN_CATALOG, getScreen, permissionsForLevel, satisfyingScopeTypes, screenActionToggles } from '../../common/access/screen-catalog';
import { normalizeCityKey } from '../../common/org-chart/org-chart.util';
import { AddUserScopeDto } from './dto/access-control.dto';

const MAX_SELECTED = 500;

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
    private readonly accessPolicy: AccessPolicyService,
  ) {}

  // Estado de acesso de um usuário POR TELA (o admin nunca vê permissions cruas).
  async getUserScreenAccess(userId: string): Promise<UserScreenAccessControl> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: userAccessInclude,
    });
    if (!user) throw new NotFoundException('User not found.');

    const effective = this.computeEffective(user);

    // Estado de escopo por tipo (change access-scope-bulk-selection): configurado x efetivo.
    const [policies, scope] = await Promise.all([
      this.prisma.userScopePolicy.findMany({ where: { userId }, select: { type: true, mode: true } }),
      this.accessPolicy.resolveScopeByUserId(userId),
    ]);
    const policyByType = new Map(policies.map((policy) => [policy.type as UserScopeType, policy.mode as ScopeSelectionMode]));
    const baseStateByType = new Map<UserScopeType, Omit<ScreenScopeState, 'satisfying'>>();
    for (const type of Object.values(UserScopeType)) {
      baseStateByType.set(type, this.buildScopeBaseState(type, user.scopes, policyByType.get(type), scope));
    }

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

      const actionToggles = screenActionToggles(screen).map((key) => ({ key, granted: effective.has(key) }));

      const satisfying = satisfyingScopeTypes(screen);
      const scopeStates: ScreenScopeState[] = screen.scopeTypes.map((type) => ({
        ...baseStateByType.get(type)!,
        satisfying: satisfying.includes(type),
      }));

      // Estado inválido (refinado na change access-scope-bulk-selection): tela concedida, com
      // dimensão SATISFATÓRIA, mas NENHUMA satisfatória tem escopo EFETIVO (SELECTED com valores,
      // ALL, ou derivado do papel). Escopo apenas suplementar (ex.: TEAM em Legendários) NÃO conta.
      const scopeMissing =
        level !== ScreenAccessLevel.NONE &&
        satisfying.length > 0 &&
        !satisfying.some((type) => this.hasEffectiveScope(type, scope));

      return { id: screen.id, label: screen.label, level, supportsEdit, scopeTypes: screen.scopeTypes, scopes, actionToggles, scopeMissing, scopeStates };
    });

    return { userId: user.id, roles: user.roles.map((userRole) => userRole.role.name), screens };
  }

  private hasEffectiveScope(type: UserScopeType, scope: AccessScope): boolean {
    if (scope.isAdmin) return true; // admin é irrestrito → nunca "sem escopo".
    const { all, ids } = this.effectiveDimension(type, scope);
    return all || ids.length > 0;
  }

  private effectiveDimension(type: UserScopeType, scope: AccessScope): { all: boolean; ids: string[] } {
    switch (type) {
      case UserScopeType.CITY:
        return { all: !!scope.allCities, ids: scope.cityKeys };
      case UserScopeType.TEAM:
        return { all: !!scope.allTeams, ids: scope.teamIds };
      case UserScopeType.CHURCH:
        return { all: !!scope.allChurches, ids: scope.churchIds };
      default:
        return { all: !!scope.allTops, ids: scope.topIds };
    }
  }

  private buildScopeBaseState(
    type: UserScopeType,
    allScopes: { type: string; value: string }[],
    policyMode: ScopeSelectionMode | undefined,
    scope: AccessScope,
  ): Omit<ScreenScopeState, 'satisfying'> {
    const explicitValues = allScopes.filter((s) => s.type === type).map((s) => s.value);
    const configuredMode =
      policyMode === ScopeSelectionMode.ALL
        ? ScopeSelectionMode.ALL
        : explicitValues.length
          ? ScopeSelectionMode.SELECTED
          : ScopeSelectionMode.MISSING;
    const { all, ids } = this.effectiveDimension(type, scope);
    const effectiveMode = all ? ScopeSelectionMode.ALL : ids.length ? ScopeSelectionMode.SELECTED : ScopeSelectionMode.MISSING;
    const explicitSet = new Set(explicitValues);
    const effectiveValues = all
      ? []
      : ids.map((value) => ({ value, sources: [explicitSet.has(value) ? ScopeValueSource.EXPLICIT : ScopeValueSource.ROLE_DERIVED] }));
    return { type, configuredMode, configuredValues: explicitValues, effectiveMode, effectiveValues };
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

  // Concede/revoga um TOGGLE de ação de uma tela (à parte do nível VIEW/EDIT).
  // Fail-closed: só aceita toggles declarados na tela; nunca uma permission arbitrária.
  async setScreenToggle(userId: string, screenId: string, toggleKey: string, on: boolean, actorUserId?: string): Promise<UserScreenAccessControl> {
    await this.ensureUserExists(userId);
    const screen = getScreen(screenId);
    if (!screen) throw new NotFoundException(`Unknown screen: ${screenId}`);
    if (!screenActionToggles(screen).includes(toggleKey)) {
      throw new BadRequestException(`Toggle ${toggleKey} is not an action toggle of screen ${screenId}.`);
    }

    const [permission] = await this.prisma.permission.findMany({ where: { key: toggleKey } });
    if (!permission) throw new BadRequestException(`Permission ${toggleKey} is not seeded.`);

    const roleHas = this.roleKeys(await this.loadUserWithAccess(userId)).has(toggleKey);
    if (on) {
      // Ligar: se o papel já concede (admin), basta herdar; senão concede explicitamente.
      if (roleHas) await this.prisma.userPermissionOverride.deleteMany({ where: { userId, permissionId: permission.id } });
      else await this.upsertOverride(userId, permission.id, PermissionEffect.GRANT);
    } else {
      // Desligar: se o papel concede, revoga; senão herdar (sem override).
      if (roleHas) await this.upsertOverride(userId, permission.id, PermissionEffect.REVOKE);
      else await this.prisma.userPermissionOverride.deleteMany({ where: { userId, permissionId: permission.id } });
    }

    await this.audit.create({
      actorUserId,
      entityType: 'UserScreenAccess',
      entityId: userId,
      action: 'set-toggle',
      after: { screen: screenId, toggle: toggleKey, on },
    });

    return this.getUserScreenAccess(userId);
  }

  // Substituição ATÔMICA do escopo de um tipo (change access-scope-bulk-selection):
  // MISSING (limpa) / SELECTED (1..500 ids únicos válidos) / ALL (política, sem valores).
  // Valida tudo ANTES de escrever; transação garante ausência de estado parcial.
  async setScopeSelection(userId: string, type: UserScopeType, input: SetScopeSelectionInput, actorUserId?: string): Promise<UserScreenAccessControl> {
    await this.ensureUserExists(userId);
    if (!Object.values(UserScopeType).includes(type)) {
      throw new BadRequestException(`Unknown scope type: ${type}`);
    }
    const values = input.values ?? [];

    if (input.mode === ScopeSelectionMode.SELECTED) {
      if (values.length < 1) throw new BadRequestException('SELECTED exige ao menos um valor.');
      if (values.length > MAX_SELECTED) throw new BadRequestException(`SELECTED aceita no máximo ${MAX_SELECTED} valores — reduza a seleção ou use "Todos".`);
      if (new Set(values).size !== values.length) throw new BadRequestException('Valores de escopo duplicados.');
      await this.assertScopeAllowed(userId, type);
      const normalized: string[] = [];
      for (const value of values) normalized.push(await this.normalizeScopeValue(type, value)); // 400 se inexistente/tipo errado
      const unique = Array.from(new Set(normalized));
      await this.prisma.$transaction(async (tx) => {
        await tx.userScope.deleteMany({ where: { userId, type } });
        await tx.userScope.createMany({ data: unique.map((value) => ({ userId, type, value })) });
        await tx.userScopePolicy.upsert({
          where: { userId_type: { userId, type } },
          update: { mode: ScopeSelectionMode.SELECTED },
          create: { userId, type, mode: ScopeSelectionMode.SELECTED },
        });
      });
    } else if (input.mode === ScopeSelectionMode.ALL) {
      if (values.length) throw new BadRequestException('ALL não aceita valores.');
      await this.assertScopeAllowed(userId, type);
      await this.prisma.$transaction(async (tx) => {
        await tx.userScope.deleteMany({ where: { userId, type } });
        await tx.userScopePolicy.upsert({
          where: { userId_type: { userId, type } },
          update: { mode: ScopeSelectionMode.ALL },
          create: { userId, type, mode: ScopeSelectionMode.ALL },
        });
      });
    } else {
      if (values.length) throw new BadRequestException('MISSING não aceita valores.');
      await this.prisma.$transaction(async (tx) => {
        await tx.userScope.deleteMany({ where: { userId, type } });
        await tx.userScopePolicy.deleteMany({ where: { userId, type } });
      });
    }

    await this.audit.create({ actorUserId, entityType: 'UserScope', entityId: userId, action: 'set-selection', after: { type, mode: input.mode } });
    return this.getUserScreenAccess(userId);
  }

  // Adiciona um escopo (1-N). Valida a combinação tela×escopo e o modo (409 em ALL).
  async addScope(userId: string, dto: AddUserScopeDto, actorUserId?: string): Promise<UserScreenAccessControl> {
    await this.ensureUserExists(userId);

    const value = await this.normalizeScopeValue(dto.type, dto.value);
    await this.assertScopeAllowed(userId, dto.type);
    await this.assertNotAllMode(userId, dto.type);

    await this.prisma.userScope.upsert({
      where: { userId_type_value: { userId, type: dto.type, value } },
      update: {},
      create: { userId, type: dto.type, value },
    });
    // A dimensão passa a ter valores explícitos → garante política SELECTED.
    await this.prisma.userScopePolicy.upsert({
      where: { userId_type: { userId, type: dto.type } },
      update: { mode: ScopeSelectionMode.SELECTED },
      create: { userId, type: dto.type, mode: ScopeSelectionMode.SELECTED },
    });

    await this.audit.create({ actorUserId, entityType: 'UserScope', entityId: userId, action: 'add', after: { type: dto.type, value } });
    return this.getUserScreenAccess(userId);
  }

  async removeScope(userId: string, scopeId: string, actorUserId?: string): Promise<UserScreenAccessControl> {
    const scope = await this.prisma.userScope.findFirst({ where: { id: scopeId, userId } });
    if (!scope) throw new NotFoundException('Scope not found for this user.');
    await this.assertNotAllMode(userId, scope.type as UserScopeType);

    await this.prisma.userScope.delete({ where: { id: scope.id } });
    // Removeu o último valor do tipo → volta a MISSING (remove a política).
    const remaining = await this.prisma.userScope.count({ where: { userId, type: scope.type } });
    if (remaining === 0) {
      await this.prisma.userScopePolicy.deleteMany({ where: { userId, type: scope.type } });
    }

    await this.audit.create({ actorUserId, entityType: 'UserScope', entityId: userId, action: 'remove', before: { type: scope.type, value: scope.value } });
    return this.getUserScreenAccess(userId);
  }

  // Operação unitária é incompatível com dimensão em ALL → 409 (o cliente deve usar o PUT).
  private async assertNotAllMode(userId: string, type: UserScopeType) {
    const policy = await this.prisma.userScopePolicy.findUnique({ where: { userId_type: { userId, type } } });
    if (policy?.mode === ScopeSelectionMode.ALL) {
      throw new ConflictException('SCOPE_MODE_CONFLICT: dimensão em "Todos"; use a substituição em lote (PUT) para alterar.');
    }
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

  // Elegibilidade de escopo DERIVADA do catálogo (change alinhar-abas-controle-acessos):
  // um tipo é aceito quando existe ao menos UMA tela efetivamente concedida (todo o conjunto
  // VIEW efetivo — equivalente ao nível ≥ VIEW) cujo `scopeTypes` contenha o tipo. Substitui o
  // antigo mapa hardcoded (1 permission por tipo), permitindo, ex.: CHURCH com apenas a tela
  // Líderes Espirituais. Não amplia acesso: o valor ainda é validado como entidade real.
  private async assertScopeAllowed(userId: string, type: UserScopeType) {
    const effective = new Set(await this.effectivePermissions.resolveKeys(userId));
    const hasCompatibleScreen = SCREEN_CATALOG.some(
      (screen) =>
        screen.scopeTypes.includes(type) &&
        screen.view.length > 0 &&
        screen.view.every((key) => effective.has(key)),
    );
    if (!hasCompatibleScreen) {
      throw new BadRequestException(`Invalid screen×scope: no granted screen supports scope ${type}.`);
    }
  }
}
