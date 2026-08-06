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

/**
 * Grupo visual da navegação. É APENAS agrupamento de interface — nunca fronteira de
 * permission. A visibilidade continua item a item por `isPrimaryNavVisible`; o grupo só
 * decide onde o item aparece e sob qual rótulo.
 */
export type NavGroupId = 'manada' | 'estrutura' | 'atividades' | 'analise' | 'administracao';

// Ordem VISUAL dos grupos na barra lateral (independente da ordem do PRIMARY_NAV, que
// governa a preferência de "primeira rota permitida" e não deve mudar por motivo estético).
export const NAV_GROUPS: { id: NavGroupId; label: string }[] = [
  { id: 'manada', label: 'Manada' },
  { id: 'estrutura', label: 'Estrutura' },
  { id: 'atividades', label: 'Atividades' },
  { id: 'analise', label: 'Análise' },
  { id: 'administracao', label: 'Administração' },
];

export type PrimaryNavItem = {
  // Igual ao id da tela no SCREEN_CATALOG (exceto exceções administrativas, ex.: 'users').
  screenId: string;
  href: string;
  label: string;
  rule: NavEntryRule;
  // Grupo visual. Ausente = item solto no topo, fora de qualquer grupo (ex.: Painel).
  group?: NavGroupId;
  // true = exceção administrativa (fora do catálogo concedível).
  adminOnly?: boolean;
};

// Ordem determinística (também define a preferência de "primeira rota permitida").
// ⚠️ NÃO reordenar por motivo visual: a ordem daqui decide para onde cai quem não tem
// acesso ao Painel. A ordem que o usuário vê vem de NAV_GROUPS + `group`.
export const PRIMARY_NAV: PrimaryNavItem[] = [
  { screenId: 'dashboard', href: '/dashboard', label: 'Painel', rule: { kind: 'permissions', mode: 'allOf', keys: ['dashboard.read'] } },
  { screenId: 'legendarios', href: '/dashboard/legendarios', label: 'Legendários', group: 'manada', rule: { kind: 'permissions', mode: 'allOf', keys: ['legendarios.read'] } },
  { screenId: 'teams', href: '/dashboard/equipes', label: 'Equipes', group: 'estrutura', rule: { kind: 'permissions', mode: 'allOf', keys: ['teams.read'] } },
  { screenId: 'spiritual-leaders', href: '/dashboard/lideres-espirituais', label: 'Líderes Espirituais', group: 'manada', rule: { kind: 'permissions', mode: 'allOf', keys: ['spiritual-leaders.read'] } },
  { screenId: 'map', href: '/dashboard/mapa', label: 'Mapa', group: 'analise', rule: { kind: 'permissions', mode: 'allOf', keys: ['map.read'] } },
  { screenId: 'tops', href: '/dashboard/tops', label: 'TOPs', group: 'atividades', rule: { kind: 'permissions', mode: 'allOf', keys: ['tops.read'] } },
  // org-chart: conjunto VIEW LEGADO (anyOf) até a Fase 4 do change do organograma migrar p/ organogram.read.
  { screenId: 'org-chart', href: '/dashboard/organograma', label: 'Organograma', group: 'estrutura', rule: { kind: 'permissions', mode: 'anyOf', keys: ['teams.read', 'legendarios.read', 'tops.read'] } },
  { screenId: 'social-actions', href: '/dashboard/acoes-sociais', label: 'Ações Sociais', group: 'atividades', rule: { kind: 'permissions', mode: 'allOf', keys: ['social-actions.read'] } },
  { screenId: 'communications', href: '/dashboard/comunicacao', label: 'Comunicação', group: 'atividades', rule: { kind: 'permissions', mode: 'allOf', keys: ['communications.read'] } },
  { screenId: 'reports', href: '/dashboard/relatorios', label: 'Relatórios', group: 'analise', rule: { kind: 'permissions', mode: 'allOf', keys: ['reports.read'] } },
  { screenId: 'churches', href: '/dashboard/igrejas', label: 'Igrejas', group: 'manada', rule: { kind: 'permissions', mode: 'allOf', keys: ['churches.read'] } },
  // Exceção administrativa: fora do catálogo concedível; `users.*` residual NÃO destrava.
  { screenId: 'users', href: '/dashboard/usuarios', label: 'Usuários', group: 'administracao', rule: { kind: 'admin-role', role: 'COORDINATION_ADMIN' }, adminOnly: true },
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

/** Seção da navegação. `id`/`label` nulos = itens soltos, sem cabeçalho (ex.: Painel). */
export type NavSection = { id: NavGroupId | null; label: string | null; items: PrimaryNavItem[] };

/**
 * Mesma lista de `visiblePrimaryNav`, organizada em seções para exibição.
 *
 * Duas garantias que os testes travam:
 *   1. NADA some — o achatamento das seções é exatamente `visiblePrimaryNav`. Agrupar é
 *      apresentação, nunca filtro; um grupo não pode virar fronteira de permission.
 *   2. Grupo sem item visível NÃO produz seção — nada de cabeçalho órfão.
 *
 * Dentro de cada grupo a ordem segue a do PRIMARY_NAV, para não existir uma segunda
 * fonte de ordenação divergindo da primeira.
 */
export function groupedPrimaryNav(user: NavUser): NavSection[] {
  const visible = visiblePrimaryNav(user);
  const sections: NavSection[] = [];

  const ungrouped = visible.filter((item) => !item.group);
  if (ungrouped.length > 0) sections.push({ id: null, label: null, items: ungrouped });

  for (const group of NAV_GROUPS) {
    const items = visible.filter((item) => item.group === group.id);
    if (items.length > 0) sections.push({ id: group.id, label: group.label, items });
  }

  return sections;
}

/**
 * Item do manifesto que governa uma rota do dashboard — inclusive sub-rotas
 * (`/dashboard/legendarios/:id/editar` → aba Legendários).
 *
 * Casa pelo prefixo MAIS ESPECÍFICO: `/dashboard` é prefixo de todas as rotas, então a busca
 * ingênua devolveria sempre a aba Painel. Exige limite de segmento para `/dashboard/tops` não
 * casar uma hipotética `/dashboard/tops-arquivados`.
 */
export function navItemForHref(href: string): PrimaryNavItem | undefined {
  const path = href.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/dashboard';
  return PRIMARY_NAV
    .filter((item) => path === item.href || path.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

/**
 * O usuário pode ABRIR a tela de destino de um link cruzado?
 *
 * Mesma regra da aba correspondente — permissions de entrada **e** escopo utilizável
 * (`screenAccess`). Rota fora do manifesto é fail-closed: um link novo não se autoriza
 * sozinho por esquecimento de declarar a tela.
 */
export function canOpenRoute(user: NavUser, href: string): boolean {
  const item = navItemForHref(href);
  return item ? isPrimaryNavVisible(user, item) : false;
}

// Destino inicial: Painel se permitido; senão a primeira OUTRA aba permitida na ordem do
// manifesto; `null` quando nenhuma aba primária é permitida (estado "acesso não configurado").
export function firstAllowedRoute(user: NavUser): string | null {
  const dashboard = PRIMARY_NAV.find((item) => item.screenId === 'dashboard');
  if (dashboard && isPrimaryNavVisible(user, dashboard)) return dashboard.href;
  const first = PRIMARY_NAV.find((item) => item.screenId !== 'dashboard' && isPrimaryNavVisible(user, item));
  return first ? first.href : null;
}
