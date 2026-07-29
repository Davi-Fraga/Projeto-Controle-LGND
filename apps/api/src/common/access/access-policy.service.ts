import { ForbiddenException, Injectable } from '@nestjs/common';
import { TeamMembershipStatus, UserScopeType } from '@central-da-manada/shared';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { normalizeCityKey } from '../org-chart/org-chart.util';
import { hasAdminRole } from './access.constants';
import { PrismaService } from '../../database/prisma.service';

export type AccessScope = {
  isAdmin: boolean;
  churchIds: string[];
  teamIds: string[];
  legendaryIds: string[];
  // Chaves de cidade normalizadas em escopo (fonte da verdade das checagens).
  cityKeys: string[];
  // Valores concretos de `Legendary.city` cujo key normalizado está em cityKeys
  // (precomputados para manter os build*Where síncronos).
  legendaryCities: string[];
  // IDs de TopEvent em escopo.
  topIds: string[];
  // Flags de dimensão IRRESTRITA (change access-scope-bulk-selection): política `ALL` daquele
  // tipo. Independentes de `isAdmin`. Ausente = false (SELECTED/MISSING pelas listas acima).
  // Quando `all*` é true, a lista correspondente é ignorada (o modo ALL domina a dimensão).
  allCities?: boolean;
  allTeams?: boolean;
  allChurches?: boolean;
  allTops?: boolean;
};

@Injectable()
export class AccessPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveScope(user: AuthenticatedUser): Promise<AccessScope> {
    if (this.isAdmin(user)) {
      return this.unrestrictedScope();
    }

    const [roleChurchIds, roleTeamIds, userScopes, policies] = await Promise.all([
      this.resolveSpiritualLeaderChurchIds(user),
      this.resolveTeamLeaderTeamIds(user),
      this.resolveUserScopes(user),
      this.resolveUserScopePolicies(user.sub),
    ]);

    // Modo ALL domina a dimensão (change access-scope-bulk-selection): ignora a lista explícita
    // e os vínculos derivados. Caso contrário, o efetivo SELECTED = explícito ∪ derivado do papel.
    const allChurches = policies.get(UserScopeType.CHURCH) === 'ALL';
    const allTeams = policies.get(UserScopeType.TEAM) === 'ALL';
    const allTops = policies.get(UserScopeType.TOP) === 'ALL';
    const allCities = policies.get(UserScopeType.CITY) === 'ALL';

    const churchIds = allChurches ? [] : this.union(roleChurchIds, userScopes.churchIds);
    const teamIds = allTeams ? [] : this.union(roleTeamIds, userScopes.teamIds);
    const topIds = allTops ? [] : userScopes.topIds;
    const cityKeys = allCities ? [] : userScopes.cityKeys;
    const legendaryCities = cityKeys.length
      ? await this.resolveLegendaryCities(cityKeys)
      : [];

    return {
      isAdmin: false,
      churchIds,
      teamIds,
      legendaryIds: [],
      cityKeys,
      legendaryCities,
      topIds,
      allCities,
      allTeams,
      allChurches,
      allTops,
    };
  }

  // Filtro GEOGRÁFICO de legendários (telas Legendários/Relatórios/Mapa):
  // cidade ∪ igreja (∪ ids explícitos). O escopo de EQUIPE NÃO entra aqui — ele
  // vale só nas telas Equipes/Organograma (buildTeamWhere), para não vazar membros
  // de equipe de outras cidades na listagem de legendários.
  buildLegendaryWhere(scope: AccessScope) {
    // CITY=ALL = "todos os Legendários" (geografia completa) → sem predicado.
    if (scope.isAdmin || scope.allCities) return {};

    const OR: any[] = [];

    if (scope.allChurches) {
      // CHURCH=ALL: legendários de QUALQUER igreja (a dimensão Igreja é irrestrita).
      OR.push({ churchId: { not: null } });
    } else if (scope.churchIds.length) {
      OR.push({ churchId: { in: scope.churchIds } });
    }

    if (scope.legendaryCities.length) {
      OR.push({ city: { in: scope.legendaryCities } });
    }

    if (scope.legendaryIds.length) {
      OR.push({ id: { in: scope.legendaryIds } });
    }

    return OR.length ? { OR } : { id: { in: [] } };
  }

  buildTeamMembershipWhere(scope: AccessScope, teamId?: string) {
    if (scope.isAdmin || scope.allTeams) {
      return teamId ? { teamId } : {};
    }

    const allowedTeamIds = teamId
      ? scope.teamIds.filter((allowedId) => allowedId === teamId)
      : scope.teamIds;

    return { teamId: { in: allowedTeamIds } };
  }

  buildLegendaryDetailWhere(scope: AccessScope) {
    if (scope.isAdmin) return {};

    const geographic = this.buildLegendaryWhere(scope);
    if (!scope.teamIds.length && !scope.allTeams) return geographic;

    return {
      OR: [
        geographic,
        {
          teamMemberships: {
            some: {
              ...this.buildTeamMembershipWhere(scope),
              status: TeamMembershipStatus.ACTIVE,
              deletedAt: null,
              team: { deletedAt: null },
            },
          },
        },
      ],
    };
  }

  buildTeamWhere(scope: AccessScope) {
    if (scope.isAdmin || scope.allTeams) return {};
    return scope.teamIds.length ? { id: { in: scope.teamIds } } : { id: { in: [] } };
  }

  buildChurchWhere(scope: AccessScope) {
    if (scope.isAdmin || scope.allChurches) return {};
    return scope.churchIds.length ? { id: { in: scope.churchIds } } : { id: { in: [] } };
  }

  // Filtro da listagem administrativa de igrejas: cidade ∪ igrejas explícitas.
  // `buildChurchWhere` permanece restrito a churchIds para não alterar outros
  // consumidores que dependem dessa semântica mais estreita.
  //
  // Modo ALL de QUALQUER das duas dimensões libera a listagem inteira. Isso não é
  // detalhe: `resolveScope` esvazia a lista da dimensão em ALL (o modo domina), então
  // ler só as listas confundiria "irrestrito" com "sem escopo" e zeraria a tela.
  buildChurchScopeWhere(scope: AccessScope) {
    if (scope.isAdmin || scope.allChurches || scope.allCities) return {};

    const OR: any[] = [];
    if (scope.legendaryCities.length) {
      OR.push({ city: { in: scope.legendaryCities } });
    }
    if (scope.churchIds.length) {
      OR.push({ id: { in: scope.churchIds } });
    }

    return OR.length ? { OR } : { id: { in: [] } };
  }

  buildTopWhere(scope: AccessScope) {
    if (scope.isAdmin || scope.allTops) return {};
    return scope.topIds.length ? { id: { in: scope.topIds } } : { id: { in: [] } };
  }

  // Filtro por cidade para entidades com campo `city` (ex.: SocialAction).
  // Não-admin sem escopo de cidade não vê nada (fail-closed); CITY=ALL → sem predicado.
  buildCityWhere(scope: AccessScope) {
    if (scope.isAdmin || scope.allCities) return {};
    return scope.legendaryCities.length ? { city: { in: scope.legendaryCities } } : { id: { in: [] } };
  }

  // Semântica ÚNICA de escopo (change access-scope-semantics-hardening): TODO não-admin
  // é "restrito" — inclusive quando NÃO tem escopo daquele tipo. Ausência de escopo NÃO
  // significa acesso irrestrito; significa "não vê nada" (fail-closed), igual aos build*Where.
  // Antes, `&& length > 0` deixava o assert vira no-op para quem não tinha escopo do tipo,
  // liberando IDOR (ex.: ver qualquer TOP por id sem ter escopo de TOP).
  isCityRestricted(scope: AccessScope): boolean {
    return !scope.isAdmin;
  }

  isTeamRestricted(scope: AccessScope): boolean {
    return !scope.isAdmin;
  }

  isChurchRestricted(scope: AccessScope): boolean {
    return !scope.isAdmin;
  }

  isTopRestricted(scope: AccessScope): boolean {
    return !scope.isAdmin;
  }

  // Barreira de IDOR (tri-estado): admin ou dimensão ALL → libera; SELECTED → só ids do escopo;
  // MISSING (lista vazia, sem ALL) → nega tudo (fail-closed).
  assertCityAllowed(scope: AccessScope, city: string): void {
    if (scope.isAdmin || scope.allCities) return;
    if (!scope.cityKeys.includes(normalizeCityKey(city))) {
      throw new ForbiddenException('City out of scope.');
    }
  }

  assertTeamAllowed(scope: AccessScope, teamId: string): void {
    if (scope.isAdmin || scope.allTeams) return;
    if (!scope.teamIds.includes(teamId)) {
      throw new ForbiddenException('Team out of scope.');
    }
  }

  assertChurchAllowed(scope: AccessScope, churchId: string): void {
    if (scope.isAdmin || scope.allChurches) return;
    if (!scope.churchIds.includes(churchId)) {
      throw new ForbiddenException('Church out of scope.');
    }
  }

  assertTopAllowed(scope: AccessScope, topId: string): void {
    if (scope.isAdmin || scope.allTops) return;
    if (!scope.topIds.includes(topId)) {
      throw new ForbiddenException('TOP out of scope.');
    }
  }

  private isAdmin(user: AuthenticatedUser) {
    // Só o Administrador é atalho total (escopo irrestrito). As demais funções —
    // inclusive Coordenação (usuário) — são escopadas normalmente.
    return hasAdminRole(user.roles);
  }

  private unrestrictedScope(): AccessScope {
    return {
      isAdmin: true,
      churchIds: [],
      teamIds: [],
      legendaryIds: [],
      cityKeys: [],
      legendaryCities: [],
      topIds: [],
    };
  }

  private async resolveSpiritualLeaderChurchIds(user: AuthenticatedUser) {
    if (!user.roles.includes('SPIRITUAL_LEADER')) return [];

    const churches = await this.prisma.church.findMany({
      where: { deletedAt: null, spiritualLeaderUserId: user.sub },
      select: { id: true },
    });

    return churches.map((church) => church.id);
  }

  private async resolveTeamLeaderTeamIds(user: AuthenticatedUser) {
    if (!user.roles.includes('TEAM_COORDINATOR') || !user.legendaryId) return [];

    const teams = await this.prisma.team.findMany({
      where: {
        deletedAt: null,
        OR: [
          { coordinatorLegendaryId: user.legendaryId },
          { deputyCoordinatorLegendaryId: user.legendaryId },
        ],
      },
      select: { id: true },
    });

    return teams.map((team) => team.id);
  }

  // Escopos individuais do usuário (1-N): cidade / equipe / igreja.
  private async resolveUserScopes(user: AuthenticatedUser) {
    const scopes = await this.prisma.userScope.findMany({
      where: { userId: user.sub },
      select: { type: true, value: true },
    });

    return {
      cityKeys: scopes
        .filter((scope) => scope.type === UserScopeType.CITY)
        .map((scope) => scope.value),
      teamIds: scopes
        .filter((scope) => scope.type === UserScopeType.TEAM)
        .map((scope) => scope.value),
      churchIds: scopes
        .filter((scope) => scope.type === UserScopeType.CHURCH)
        .map((scope) => scope.value),
      topIds: scopes
        .filter((scope) => scope.type === UserScopeType.TOP)
        .map((scope) => scope.value),
    };
  }

  // Modo de política por tipo (change access-scope-bulk-selection). Há linha só quando
  // SELECTED (com valores) ou ALL; ausência = MISSING (estado calculado).
  private async resolveUserScopePolicies(userId: string): Promise<Map<UserScopeType, 'SELECTED' | 'ALL'>> {
    const policies = await this.prisma.userScopePolicy.findMany({
      where: { userId },
      select: { type: true, mode: true },
    });
    return new Map(policies.map((policy) => [policy.type as UserScopeType, policy.mode as 'SELECTED' | 'ALL']));
  }

  // Resolve o escopo a partir do userId (carrega papéis do banco). Útil onde só
  // o id do usuário está disponível (ex.: guard/serviço sem o AuthenticatedUser).
  async resolveScopeByUserId(userId: string): Promise<AccessScope> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { roles: { include: { role: true } } },
    });
    if (!user) {
      return { ...this.unrestrictedScope(), isAdmin: false };
    }
    return this.resolveScope({
      sub: user.id,
      email: user.email,
      legendaryId: user.legendaryId,
      roles: user.roles.map((userRole) => userRole.role.name),
      permissions: [],
    });
  }

  // Resolve as keys normalizadas para os valores reais de `Legendary.city`,
  // reusando a normalização do org-chart (acento/caixa-insensível).
  private async resolveLegendaryCities(cityKeys: string[]) {
    const wanted = new Set(cityKeys);
    const rows = await this.prisma.legendary.findMany({
      where: { deletedAt: null, city: { not: null } },
      select: { city: true },
      distinct: ['city'],
    });

    return rows
      .map((row) => row.city as string)
      .filter((city) => city.trim() && wanted.has(normalizeCityKey(city)));
  }

  private union(a: string[], b: string[]) {
    return Array.from(new Set([...a, ...b]));
  }
}
