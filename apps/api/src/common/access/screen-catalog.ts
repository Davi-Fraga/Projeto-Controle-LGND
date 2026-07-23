import { UserScopeType } from '@central-da-manada/shared';

// Fonte da verdade: cada TELA/MÓDULO mapeia para seu conjunto de permissions,
// separando leitura (view) de mutação (edit) para suportar os níveis NONE/VIEW/EDIT.
// O administrador opera por TELA + nível; nunca vê/escolhe permissions cruas.
export type ScreenDef = {
  id: string;
  label: string;
  view: string[];
  edit: string[];
  // Tipos de escopo aplicáveis a esta tela (vazio = sem recorte de dados).
  scopeTypes: UserScopeType[];
  // Dimensões que SATISFAZEM o escopo principal da tela (change access-scope-bulk-selection).
  // Default (quando ausente) = todas de `scopeTypes`. Ex.: Legendários = [CITY, CHURCH].
  satisfyingScopeTypes?: UserScopeType[];
  // Dimensões SUPLEMENTARES: ampliam detalhe/recorte mas NÃO satisfazem sozinhas o acesso
  // principal (default = []). Ex.: Legendários = [TEAM] (equipe não satisfaz a geografia).
  supplementalScopeTypes?: UserScopeType[];
  // Toggles de AÇÃO concedidos separadamente de VIEW/EDIT (change organograma-
  // navegacao-escalavel, decisão Q1): permite conceder ações finas — ex.: editar
  // pessoa sem poder mover. NÃO entram em permissionsForLevel; são concedidos à parte.
  actionToggles?: string[];
};

export const SCREEN_CATALOG: ScreenDef[] = [
  {
    id: 'dashboard',
    label: 'Painel',
    view: ['dashboard.read'],
    edit: [],
    scopeTypes: [],
  },
  {
    id: 'legendarios',
    label: 'Legendários',
    view: ['legendarios.read', 'legendarios.history.read', 'professions.read', 'expertises.read'],
    // create/delete/restore de topo são administrativos → fora do "Ver e editar".
    edit: ['legendarios.update', 'legendarios.history.create'],
    scopeTypes: [UserScopeType.CITY, UserScopeType.TEAM, UserScopeType.CHURCH],
    // A listagem é GEOGRÁFICA: só cidade/igreja satisfazem; equipe é suplementar (detalhe).
    satisfyingScopeTypes: [UserScopeType.CITY, UserScopeType.CHURCH],
    supplementalScopeTypes: [UserScopeType.TEAM],
  },
  {
    id: 'teams',
    label: 'Equipes',
    view: ['teams.read', 'teams.members.read'],
    // Criar/excluir equipe = admin. "Ver e editar" = editar a equipe do escopo + membros.
    edit: ['teams.update', 'teams.members.add', 'teams.members.update', 'teams.members.remove'],
    scopeTypes: [UserScopeType.TEAM],
  },
  {
    id: 'churches',
    label: 'Igrejas',
    view: ['churches.read'],
    edit: ['churches.update'],
    scopeTypes: [UserScopeType.CHURCH],
  },
  {
    id: 'spiritual-leaders',
    label: 'Líderes Espirituais',
    // Vista de Igrejas (líderes) com permission DEDICADA e independente de churches.*
    // (change alinhar-abas-controle-acessos). VIEW-only; escopo por Igreja. Conceder esta
    // tela NÃO concede Igrejas e vice-versa; o backfill preserva quem já via via churches.read.
    view: ['spiritual-leaders.read'],
    edit: [],
    scopeTypes: [UserScopeType.CHURCH],
  },
  {
    id: 'tops',
    label: 'TOPs',
    view: [
      'tops.read',
      'tops.participants.read',
      'tops.servants.read',
      'tops.teams.read',
      'tops.families.read',
      'tops.families.members.read',
      'tops.preregistrations.read',
    ],
    // Criar/excluir TOP = admin. "Ver e editar" = editar o TOP do escopo e seus sub-recursos.
    edit: [
      'tops.update',
      'tops.participants.add',
      'tops.participants.update',
      'tops.participants.remove',
      'tops.servants.add',
      'tops.servants.update',
      'tops.servants.remove',
      'tops.teams.add',
      'tops.teams.update',
      'tops.teams.remove',
      'tops.families.create',
      'tops.families.update',
      'tops.families.delete',
      'tops.families.restore',
      'tops.families.members.add',
      'tops.families.members.update',
      'tops.families.members.remove',
      'tops.families.members.transfer',
      'tops.preregistrations.approve',
      'tops.preregistrations.reject',
      'tops.preregistrations.delete',
    ],
    scopeTypes: [UserScopeType.TOP],
  },
  {
    id: 'org-chart',
    label: 'Organograma',
    // view segue em LEGADO durante o rollout (D7): migra para organogram.read só na
    // Fase 4 (senão quebra quem já tem a tela via permissões legado). O EDIT já usa
    // organogram.person.edit (Fase 2): conceder a tela em EDIT libera editar pessoa,
    // sem os toggles de mover/estrutural — "editar sem mover". Abas derivam do UserScope (Q2).
    view: ['teams.read', 'legendarios.read', 'tops.read'],
    edit: ['organogram.person.edit'],
    scopeTypes: [UserScopeType.CITY, UserScopeType.TEAM],
    // Toggles de ação (Q1): concedidos à parte do EDIT — reordenar < mover < estrutural.
    actionToggles: ['organogram.group.reorder', 'organogram.group.move', 'organogram.structure.change'],
  },
  // REMOVIDO (change access-scope-semantics-hardening): a tela "Famílias" (families.read/
  // families.update) era FANTASMA — nenhum controller a aplicava. O domínio real de famílias
  // é `tops.families.*`, sob a tela TOPs. Concedê-la não tinha efeito; não reintroduzir.
  {
    id: 'social-actions',
    label: 'Ações Sociais',
    view: ['social-actions.read', 'social-actions.participants.read'],
    // Criar/excluir ação social = admin. "Ver e editar" = editar a ação do escopo + participantes.
    edit: [
      'social-actions.update',
      'social-actions.participants.add',
      'social-actions.participants.update',
      'social-actions.participants.remove',
    ],
    scopeTypes: [UserScopeType.CITY],
  },
  {
    id: 'communications',
    label: 'Comunicação',
    view: ['communications.read', 'communications.recipients.read'],
    // Criar/excluir comunicado = admin. "Ver e editar" = editar/enviar e gerir destinatários.
    edit: [
      'communications.update',
      'communications.send',
      'communications.recipients.update',
    ],
    scopeTypes: [],
  },
  {
    id: 'reports',
    label: 'Relatórios',
    view: ['reports.read'],
    edit: ['reports.export', 'reports.contacts.export'],
    scopeTypes: [UserScopeType.CITY],
  },
  {
    id: 'map',
    label: 'Mapa',
    view: ['map.read'],
    edit: [],
    scopeTypes: [UserScopeType.CITY],
  },
  // REMOVIDO (change access-scope-semantics-hardening): a tela "Usuários" era INCOERENTE —
  // o catálogo anunciava users.*/audit.read, mas a gestão de usuários (/users) e a própria
  // administração de acessos (/access-control) são guardadas por PAPEL admin (RolesGuard),
  // ignorando essas permissions. Pior: seu EDIT concedia `users.update`, que gera links de
  // redefinição de senha (password-reset) — capacidade que DEVE ser só do admin. Tirar a tela
  // impede delegá-la e mantém users.* como capacidade exclusiva do admin (via base do papel).
];

export function getScreen(id: string): ScreenDef | undefined {
  return SCREEN_CATALOG.find((screen) => screen.id === id);
}

// Conjunto de permissions de uma tela para um nível: VIEW = view; EDIT = view ∪ edit.
export function permissionsForLevel(screen: ScreenDef, level: 'VIEW' | 'EDIT'): string[] {
  return level === 'EDIT' ? [...screen.view, ...screen.edit] : [...screen.view];
}

// Toggles de ação da tela (vazio quando não há). Concedidos à parte de VIEW/EDIT.
export function screenActionToggles(screen: ScreenDef): string[] {
  return screen.actionToggles ?? [];
}

// Dimensões que satisfazem o escopo principal da tela (default: todas de scopeTypes).
export function satisfyingScopeTypes(screen: ScreenDef): UserScopeType[] {
  return screen.satisfyingScopeTypes ?? screen.scopeTypes;
}

// Dimensões suplementares (default: nenhuma) — não satisfazem sozinhas o acesso principal.
export function supplementalScopeTypes(screen: ScreenDef): UserScopeType[] {
  return screen.supplementalScopeTypes ?? [];
}
