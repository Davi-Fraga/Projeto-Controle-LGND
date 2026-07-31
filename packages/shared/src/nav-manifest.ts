// Manifesto declarativo das abas primárias do dashboard (change alinhar-abas-controle-acessos).
// FONTE ÚNICA da navegação lateral: sem dependência de React/Next. A autorização real continua
// no backend (guards/permissions) e o escopo no AccessPolicyService — o menu é usabilidade.
//
// Invariante (verificada por teste de paridade contra o SCREEN_CATALOG do backend):
//   toda aba concedível referencia uma tela do catálogo e suas permissions de entrada pertencem
//   ao conjunto VIEW dessa tela; exceções administrativas (Usuários) ficam FORA do catálogo e
//   declaram o papel exigido.

/**
 * Regra de permission efetiva — forma CANÔNICA, compartilhada entre a navegação e a
 * autorização visual de ações (change acoes-web-e-seletores-contextuais).
 *
 * `allOf` espelha `@Permissions` (AND) e `anyOf` espelha `@AnyPermissions` (OR) do backend.
 * Toda regra visual deve declarar o modo explicitamente: usar AND onde a API exige OR
 * esconde ação que o usuário pode executar; o contrário mostra ação que vai falhar com 403.
 */
export type PermissionRule = { mode: 'allOf' | 'anyOf'; keys: string[] };

/**
 * Avaliador único da regra de permission. NÃO é barreira de segurança — o backend continua
 * decidindo; isto governa apenas o que a interface oferece.
 *
 * Regra vazia (`keys: []`) é **fail-closed** nos dois modos. Sem isso, `allOf: []` passaria
 * por vacuidade (`[].every() === true`) e liberaria um controle por engano de digitação.
 */
export function satisfiesPermissionRule(
  permissions: string[] | null | undefined,
  rule: PermissionRule,
): boolean {
  if (rule.keys.length === 0) return false;
  const perms = permissions ?? [];
  return rule.mode === 'allOf'
    ? rule.keys.every((key) => perms.includes(key))
    : rule.keys.some((key) => perms.includes(key));
}

// Regra de entrada de uma aba: por permissions efetivas (allOf/anyOf) ou exceção por papel admin.
export type NavEntryRule =
  | ({ kind: 'permissions' } & PermissionRule)
  | { kind: 'admin-role'; role: string };

export type PrimaryNavItem = {
  // Igual ao id da tela no SCREEN_CATALOG (exceto exceções administrativas, ex.: 'users').
  screenId: string;
  href: string;
  label: string;
  rule: NavEntryRule;
  // true = exceção administrativa (fora do catálogo concedível).
  adminOnly?: boolean;
};

// Ordem determinística (também define a preferência de "primeira rota permitida").
export const PRIMARY_NAV: PrimaryNavItem[] = [
  { screenId: 'dashboard', href: '/dashboard', label: 'Painel', rule: { kind: 'permissions', mode: 'allOf', keys: ['dashboard.read'] } },
  { screenId: 'legendarios', href: '/dashboard/legendarios', label: 'Legendários', rule: { kind: 'permissions', mode: 'allOf', keys: ['legendarios.read'] } },
  { screenId: 'teams', href: '/dashboard/equipes', label: 'Equipes', rule: { kind: 'permissions', mode: 'allOf', keys: ['teams.read'] } },
  { screenId: 'spiritual-leaders', href: '/dashboard/lideres-espirituais', label: 'Líderes Espirituais', rule: { kind: 'permissions', mode: 'allOf', keys: ['spiritual-leaders.read'] } },
  { screenId: 'map', href: '/dashboard/mapa', label: 'Mapa', rule: { kind: 'permissions', mode: 'allOf', keys: ['map.read'] } },
  { screenId: 'tops', href: '/dashboard/tops', label: 'TOPs', rule: { kind: 'permissions', mode: 'allOf', keys: ['tops.read'] } },
  // org-chart: conjunto VIEW LEGADO (anyOf) até a Fase 4 do change do organograma migrar p/ organogram.read.
  { screenId: 'org-chart', href: '/dashboard/organograma', label: 'Organograma', rule: { kind: 'permissions', mode: 'anyOf', keys: ['teams.read', 'legendarios.read', 'tops.read'] } },
  { screenId: 'social-actions', href: '/dashboard/acoes-sociais', label: 'Ações Sociais', rule: { kind: 'permissions', mode: 'allOf', keys: ['social-actions.read'] } },
  { screenId: 'communications', href: '/dashboard/comunicacao', label: 'Comunicação', rule: { kind: 'permissions', mode: 'allOf', keys: ['communications.read'] } },
  { screenId: 'reports', href: '/dashboard/relatorios', label: 'Relatórios', rule: { kind: 'permissions', mode: 'allOf', keys: ['reports.read'] } },
  { screenId: 'churches', href: '/dashboard/igrejas', label: 'Igrejas', rule: { kind: 'permissions', mode: 'allOf', keys: ['churches.read'] } },
  // Exceção administrativa: fora do catálogo concedível; `users.*` residual NÃO destrava.
  { screenId: 'users', href: '/dashboard/usuarios', label: 'Usuários', rule: { kind: 'admin-role', role: 'COORDINATION_ADMIN' }, adminOnly: true },
];

export type NavUser = { permissions?: string[] | null; roles?: string[] | null } | null | undefined;

// Uma aba é visível quando o usuário satisfaz sua regra de entrada. Sem usuário → nada protegido.
export function isPrimaryNavVisible(user: NavUser, item: PrimaryNavItem): boolean {
  if (!user) return false;
  const rule = item.rule;
  if (rule.kind === 'admin-role') {
    return (user.roles ?? []).includes(rule.role);
  }
  if (!satisfiesPermissionRule(user.permissions, rule)) return false;
  const access = (user as NavUser & { screenAccess?: Array<{ screenId: string; usable: boolean }> }).screenAccess;
  // Ausência do contrato novo é fail-closed para telas protegidas; a exceção admin acima
  // continua explícita e não depende do catálogo concedível.
  return !!access?.find((entry) => entry.screenId === item.screenId)?.usable;
}

export function visiblePrimaryNav(user: NavUser): PrimaryNavItem[] {
  return PRIMARY_NAV.filter((item) => isPrimaryNavVisible(user, item));
}

// Destino inicial: Painel se permitido; senão a primeira OUTRA aba permitida na ordem do
// manifesto; `null` quando nenhuma aba primária é permitida (estado "acesso não configurado").
export function firstAllowedRoute(user: NavUser): string | null {
  const dashboard = PRIMARY_NAV.find((item) => item.screenId === 'dashboard');
  if (dashboard && isPrimaryNavVisible(user, dashboard)) return dashboard.href;
  const first = PRIMARY_NAV.find((item) => item.screenId !== 'dashboard' && isPrimaryNavVisible(user, item));
  return first ? first.href : null;
}
