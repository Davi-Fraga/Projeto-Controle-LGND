export enum LegendaryStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  AWAY = 'AWAY',
  VISITOR = 'VISITOR',
  UNKNOWN = 'UNKNOWN',
}

export enum SystemRole {
  COORDINATION_ADMIN = 'COORDINATION_ADMIN',
  COORDINATION_USER = 'COORDINATION_USER',
  TOP_REPRESENTATIVE = 'TOP_REPRESENTATIVE',
  TOP_DEPUTY_REPRESENTATIVE = 'TOP_DEPUTY_REPRESENTATIVE',
  FAMILY_REPRESENTATIVE = 'FAMILY_REPRESENTATIVE',
  FAMILY_DEPUTY_REPRESENTATIVE = 'FAMILY_DEPUTY_REPRESENTATIVE',
  TEAM_COORDINATOR = 'TEAM_COORDINATOR',
  SPIRITUAL_LEADER = 'SPIRITUAL_LEADER',
  MEMBER = 'MEMBER',
}

export enum TeamStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum TeamMembershipStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PAUSED = 'PAUSED',
}

export enum TopEventStatus {
  PLANNED = 'PLANNED',
  REGISTRATION_OPEN = 'REGISTRATION_OPEN',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TopParticipantType {
  NEW_PARTICIPANT = 'NEW_PARTICIPANT',
  LEGENDARY = 'LEGENDARY',
}

export enum TopParticipantStatus {
  REGISTERED = 'REGISTERED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum TopServantStatus {
  REGISTERED = 'REGISTERED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum TopFamilyMemberStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TRANSFERRED = 'TRANSFERRED',
}

export enum LegendaryHistoryType {
  LEGENDARY_CREATED = 'LEGENDARY_CREATED',
  LEGENDARY_UPDATED = 'LEGENDARY_UPDATED',
  TEAM_JOINED = 'TEAM_JOINED',
  TEAM_LEFT = 'TEAM_LEFT',
  TEAM_ROLE_CHANGED = 'TEAM_ROLE_CHANGED',
  TOP_PARTICIPATED = 'TOP_PARTICIPATED',
  TOP_PARTICIPATION_CANCELLED = 'TOP_PARTICIPATION_CANCELLED',
  TOP_SERVED = 'TOP_SERVED',
  TOP_SERVICE_CANCELLED = 'TOP_SERVICE_CANCELLED',
  TOP_REPRESENTATIVE_ASSIGNED = 'TOP_REPRESENTATIVE_ASSIGNED',
  TOP_DEPUTY_ASSIGNED = 'TOP_DEPUTY_ASSIGNED',
  TOP_FAMILY_COORDINATOR_ASSIGNED = 'TOP_FAMILY_COORDINATOR_ASSIGNED',
  TOP_FAMILY_DEPUTY_COORDINATOR_ASSIGNED = 'TOP_FAMILY_DEPUTY_COORDINATOR_ASSIGNED',
  TOP_FAMILY_GENERAL_COORDINATOR_ASSIGNED = 'TOP_FAMILY_GENERAL_COORDINATOR_ASSIGNED',
  FAMILY_JOINED = 'FAMILY_JOINED',
  FAMILY_LEFT = 'FAMILY_LEFT',
  FAMILY_TRANSFERRED = 'FAMILY_TRANSFERRED',
  FAMILY_REPRESENTATIVE_ASSIGNED = 'FAMILY_REPRESENTATIVE_ASSIGNED',
  FAMILY_DEPUTY_ASSIGNED = 'FAMILY_DEPUTY_ASSIGNED',
  SOCIAL_ACTION_JOINED = 'SOCIAL_ACTION_JOINED',
  SOCIAL_ACTION_LEFT = 'SOCIAL_ACTION_LEFT',
  SOCIAL_ACTION_COMPLETED = 'SOCIAL_ACTION_COMPLETED',
  MANUAL_NOTE = 'MANUAL_NOTE',
}

export enum InternalMessageStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  CANCELLED = 'CANCELLED',
}

export enum InternalMessageTargetType {
  ALL_ACTIVE_LEGENDARIES = 'ALL_ACTIVE_LEGENDARIES',
  TOP_ALL = 'TOP_ALL',
  TOP_REPRESENTATIVES = 'TOP_REPRESENTATIVES',
  TOP_FAMILY_REPRESENTATIVES = 'TOP_FAMILY_REPRESENTATIVES',
  TOP_FAMILY = 'TOP_FAMILY',
  TEAM = 'TEAM',
  TEAM_COORDINATORS = 'TEAM_COORDINATORS',
  LEGENDARY = 'LEGENDARY',
}

export enum MessageRecipientStatus {
  PENDING = 'PENDING',
  READ = 'READ',
  CONFIRMED = 'CONFIRMED',
}

export enum SocialActionStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum SocialActionParticipantStatus {
  REGISTERED = 'REGISTERED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum TopPreRegistrationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// Ajuste fino de permission por usuário sobre o papel base.
export enum PermissionEffect {
  GRANT = 'GRANT',
  REVOKE = 'REVOKE',
}

// Tipo de escopo interno de dados associado a um usuário (1-N).
export enum UserScopeType {
  CITY = 'CITY',
  TEAM = 'TEAM',
  CHURCH = 'CHURCH',
  TOP = 'TOP',
}

// Nível de acesso por TELA. VIEW = só leitura da tela; EDIT = leitura + mutação.
export enum ScreenAccessLevel {
  NONE = 'NONE',
  VIEW = 'VIEW',
  EDIT = 'EDIT',
}

// Estado de navegação calculado no backend. É somente UX: guards e policies da API
// continuam sendo a autoridade para cada requisição.
export enum EffectiveScreenAccessState {
  AVAILABLE = 'AVAILABLE',
  MISSING_PERMISSION = 'MISSING_PERMISSION',
  MISSING_SCOPE = 'MISSING_SCOPE',
}

export type EffectiveScreenAccess = {
  screenId: string;
  level: ScreenAccessLevel;
  state: EffectiveScreenAccessState;
  usable: boolean;
};

// Um escopo do usuário, agrupado sob a tela cujos scopeTypes o contêm.
export type ScreenScopeEntry = {
  id: string;
  type: UserScopeType;
  value: string;
  label?: string | null;
};

// Modo de seleção por dimensão (change access-scope-bulk-selection). MISSING é calculado.
export enum ScopeSelectionMode {
  MISSING = 'MISSING',
  SELECTED = 'SELECTED',
  ALL = 'ALL',
}

// Origem de um valor de escopo efetivo.
export enum ScopeValueSource {
  EXPLICIT = 'EXPLICIT',
  ROLE_DERIVED = 'ROLE_DERIVED',
}

// Um valor de escopo com seu RÓTULO humano (change painel-escopo-legivel-e-higiene).
// O backend SEMPRE preenche `label` — a tela administrativa nunca deve exibir o `value`
// (UUID/key normalizada) ao operador. `sublabel` desambigua (ex.: igreja → cidade).
export type ScopeValueEntry = {
  value: string;
  // null APENAS quando `missing` é true: a entidade não existe mais.
  label?: string | null;
  sublabel?: string | null;
  // true = o valor aponta para entidade inexistente/soft-deleted. A UI sinaliza a
  // condição em vez de degradar para o identificador cru.
  missing?: boolean;
  sources: ScopeValueSource[];
};

// Estado de UMA dimensão de escopo de uma tela (configurado explícito vs efetivo).
export type ScreenScopeState = {
  type: UserScopeType;
  // true = esta dimensão SATISFAZ o escopo principal da tela (vs suplementar).
  satisfying: boolean;
  configuredMode: ScopeSelectionMode; // configuração explícita: MISSING | SELECTED | ALL
  // Valores explícitos, JÁ ROTULADOS (vazio em MISSING/ALL): a edição parte daqui, então
  // precisa carregar rótulo — não basta o id (change painel-escopo-legivel-e-higiene).
  configuredValues: ScopeValueEntry[];
  effectiveMode: ScopeSelectionMode; // após compor com vínculos derivados do papel
  effectiveValues: ScopeValueEntry[]; // união dedup explícito+derivado (preenchida em SELECTED)
};

// Payload da substituição ATÔMICA do escopo de um tipo (PUT .../scopes/:type).
// [] em MISSING/ALL; 1..500 valores únicos em SELECTED.
export type SetScopeSelectionInput = {
  mode: ScopeSelectionMode;
  values: string[];
};

// Um toggle de ação de uma tela (concedido à parte de VIEW/EDIT), com seu estado.
export type ScreenActionToggle = {
  key: string;
  granted: boolean;
};

// Estado de acesso de UMA tela para um usuário (o admin opera por tela, não por permission).
export type ScreenAccessEntry = {
  id: string;
  label: string;
  level: ScreenAccessLevel;
  // false para telas só-leitura (sem conjunto de mutação) — não oferecem nível EDIT.
  supportsEdit: boolean;
  // tipos de escopo aplicáveis a esta tela (vazio = sem recorte)
  scopeTypes: UserScopeType[];
  // escopos atuais do usuário cujo tipo é aplicável a esta tela
  scopes: ScreenScopeEntry[];
  // toggles de ação concedíveis à parte do nível (ex.: organograma: reordenar/mover/estrutural)
  actionToggles: ScreenActionToggle[];
  // true quando a tela é escopável (scopeTypes não-vazio), está concedida (VIEW/EDIT) e NÃO
  // tem nenhum escopo: estado inválido — fail-closed faz o usuário "não ver nada". A UI deve
  // sinalizar e orientar a adicionar um escopo. Telas globais (scopeTypes vazio) nunca marcam.
  scopeMissing: boolean;
  // Estado por dimensão de escopo (change access-scope-bulk-selection): modo configurado x
  // efetivo, valores e origem — alimenta o multi-select (Todos/Selecionados) e os chips derivados.
  // Opcional na fase de migração; o backend passa a sempre preencher (ver access-control.service).
  scopeStates?: ScreenScopeState[];
};

export type UserScreenAccessControl = {
  userId: string;
  roles: string[];
  screens: ScreenAccessEntry[];
};

export type ApiResponse<T> = {
  data: T;
  message?: string;
};

export type PaginationParams = {
  page?: number;
  perPage?: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
};

export type Church = {
  id: string;
  name: string;
  city?: string | null;
  address?: string | null;
  spiritualLeaderName?: string | null;
  spiritualLeaderPhone?: string | null;
  spiritualLeaderUserId?: string | null;
  spiritualLeaderLegendaryId?: string | null;
  spiritualLeaderLegendary?: { id: string; fullName: string } | null;
  spiritualLeaderEffectiveName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
};

export type Profession = {
  id: string;
  name: string;
};

export type Expertise = {
  id: string;
  name: string;
  description?: string | null;
};

export type Legendary = {
  id: string;
  fullName: string;
  lgndNumber?: string | null;
  phone?: string | null;
  city?: string | null;
  isFromRotaDoCerrado: boolean;
  churchId?: string | null;
  church?: Church | null;
  servesInChurch: boolean;
  churchRole?: string | null;
  professionId?: string | null;
  profession?: Profession | null;
  status: LegendaryStatus;
  socialActionInterest: boolean;
  notes?: string | null;
  needsReview: boolean;
  expertises: Expertise[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  firstTopIsExternal: boolean;
  firstTopEventId?: string | null;
  firstTopEvent?: TopEvent | null;
  firstTopFamilyId?: string | null;
  firstTopFamily?: TopFamily | null;
  firstTopExternalText?: string | null;
  firstTopNotes?: string | null;
  topServants?: TopServant[] | null;
  // Campos do Google Forms da manada (sincronização contínua). `email`/`birthDate`
  // são dados pessoais sensíveis: só aparecem na visão administrativa restrita por
  // escopo, nunca em listagens gerais (change `sincronizar-legendarios-via-forms`).
  email?: string | null;
  birthDate?: string | null;
  district?: string | null;
  state?: string | null;
  spiritualLeaderName?: string | null;
  spiritualLeaderPhone?: string | null;
  skillsText?: string | null;
  relativeName?: string | null;
  relativePhone?: string | null;
  relativeEmail?: string | null;
  isSpiritualLeader?: boolean;
  leadershipRole?: string | null;
  lastFormsSyncAt?: string | null;
  formsResponseId?: string | null;
};

export type LegendaryFilters = PaginationParams & {
  search?: string;
  status?: LegendaryStatus;
  city?: string;
  churchId?: string;
  teamId?: string;
  professionId?: string;
  expertiseId?: string;
  socialActionInterest?: boolean;
  isFromRotaDoCerrado?: boolean;
  needsReview?: boolean;
  orderBy?: 'fullName' | 'createdAt';
  orderDirection?: 'asc' | 'desc';
};

export type TeamMembership = {
  id: string;
  teamId: string;
  legendaryId: string;
  legendary?: Legendary;
  role: string;
  status: TeamMembershipStatus;
  startedAt: string;
  endedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type Team = {
  id: string;
  name: string;
  description?: string | null;
  status: TeamStatus;
  coordinatorLegendaryId?: string | null;
  coordinator?: Legendary | null;
  deputyCoordinatorLegendaryId?: string | null;
  deputyCoordinator?: Legendary | null;
  activeMembersCount: number;
  memberships?: TeamMembership[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type TeamFilters = PaginationParams & {
  search?: string;
  status?: TeamStatus;
  coordinatorLegendaryId?: string;
  orderBy?: 'name' | 'createdAt';
  orderDirection?: 'asc' | 'desc';
};

export type TopTeam = {
  id: string;
  topEventId: string;
  teamId: string;
  team?: Team;
  coordinatorLegendaryId?: string | null;
  coordinator?: Legendary | null;
  deputyCoordinatorLegendaryId?: string | null;
  deputyCoordinator?: Legendary | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type TopParticipant = {
  id: string;
  topEventId: string;
  legendaryId: string;
  legendary?: Legendary;
  type: TopParticipantType;
  status: TopParticipantStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type TopServant = {
  id: string;
  topEventId: string;
  legendaryId: string;
  legendary?: Legendary;
  topEvent?: TopEvent | null;
  teamId?: string | null;
  team?: Team | null;
  role?: string | null;
  status: TopServantStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type TopFamily = {
  id: string;
  topEventId: string;
  name: string;
  representativeLegendaryId?: string | null;
  representative?: Legendary | null;
  representativeRole?: string | null;
  deputyRepresentativeLegendaryId?: string | null;
  deputyRepresentative?: Legendary | null;
  deputyRepresentativeRole?: string | null;
  notes?: string | null;
  needsReview: boolean;
  membersCount?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type TopFamilyMember = {
  id: string;
  topEventId: string;
  topFamilyId: string;
  topParticipantId: string;
  topParticipant?: TopParticipant;
  status: TopFamilyMemberStatus;
  notes?: string | null;
  sourceNotes?: string | null;
  needsReview: boolean;
  startedAt: string;
  endedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type LegendaryHistory = {
  id: string;
  legendaryId: string;
  type: LegendaryHistoryType;
  title: string;
  description?: string | null;
  topEventId?: string | null;
  topEvent?: TopEvent | null;
  teamId?: string | null;
  team?: Team | null;
  topFamilyId?: string | null;
  topFamily?: TopFamily | null;
  socialActionId?: string | null;
  socialAction?: SocialAction | null;
  actorUserId?: string | null;
  actor?: { id: string; name: string; email: string } | null;
  metadata?: Record<string, unknown> | null;
  occurredAt: string;
  createdAt: string;
};

export type InternalMessage = {
  id: string;
  title: string;
  body: string;
  status: InternalMessageStatus;
  targetType: InternalMessageTargetType;
  targetId?: string | null;
  topEventId?: string | null;
  topEvent?: TopEvent | null;
  requiresConfirmation: boolean;
  createdByUserId: string;
  sentAt?: string | null;
  recipientsCount?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type MessageRecipient = {
  id: string;
  messageId: string;
  legendaryId: string;
  legendary?: Legendary;
  userId?: string | null;
  status: MessageRecipientStatus;
  readAt?: string | null;
  confirmedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SocialAction = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  city?: string | null;
  startDate: string;
  endDate: string;
  status: SocialActionStatus;
  responsibleLegendaryId: string;
  responsible?: Legendary;
  notes?: string | null;
  resultSummary?: string | null;
  participantsCount?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type SocialActionParticipant = {
  id: string;
  socialActionId: string;
  legendaryId: string;
  legendary?: Legendary;
  role?: string | null;
  status: SocialActionParticipantStatus;
  attended: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type TopEvent = {
  id: string;
  name: string;
  number: number;
  city: string;
  location?: string | null;
  startDate: string;
  endDate: string;
  status: TopEventStatus;
  representativeLegendaryId?: string | null;
  representative?: Legendary | null;
  deputyRepresentativeLegendaryId?: string | null;
  deputyRepresentative?: Legendary | null;
  generalCoordinatorLegendaryId?: string | null;
  generalCoordinator?: Legendary | null;
  familyCoordinatorLegendaryId?: string | null;
  familyCoordinator?: Legendary | null;
  familyDeputyCoordinatorLegendaryId?: string | null;
  familyDeputyCoordinator?: Legendary | null;
  familyGeneralCoordinatorLegendaryId?: string | null;
  familyGeneralCoordinator?: Legendary | null;
  notes?: string | null;
  needsReview: boolean;
  participantsCount: number;
  servantsCount: number;
  teamsCount: number;
  familiesCount?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type TopFilters = PaginationParams & {
  search?: string;
  status?: TopEventStatus;
  city?: string;
  startDateFrom?: string;
  startDateTo?: string;
  needsReview?: boolean;
  missingFamilyCoordinator?: boolean;
  orderBy?: 'startDate' | 'name' | 'createdAt';
  orderDirection?: 'asc' | 'desc';
};

// Strips a "TOP #<n> | " prefix from a team name for display (e.g.
// "TOP #1910 | Coordenação" -> "Coordenação"). Returns the original when there is no prefix.
export function teamDisplayName(name: string): string {
  return name.replace(/^\s*TOP\b[^|]*\|\s*/i, '').trim() || name;
}

export type OrgChartView = 'teams' | 'families' | 'cities';

export type OrgChartNodeKind = 'root' | 'group' | 'leader' | 'person' | 'city';

export type OrgChartNode = {
  id: string;
  kind: OrgChartNodeKind;
  label: string;
  subtitle?: string;
  leaderId?: string;
  count: number;
  children: OrgChartNode[];
  // Referência do Legendário que o nó representa (person/leader), para o painel de
  // detalhe (Fase 2). Ausente em nós estruturais (root/group/city).
  refId?: string;
  // Overview+detail (change organograma-navegacao-escalavel): quando a árvore é
  // projetada por profundidade, um nó na fronteira tem os filhos podados
  // (children = []) mas hasChildren = true, para a UI oferecer expandir sob demanda.
  hasChildren?: boolean;
};

export type TopPreRegistration = {
  id: string;
  topEventId: string;
  topEvent?: TopEvent | null;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  churchName?: string | null;
  rawPayload: unknown;
  status: TopPreRegistrationStatus;
  legendaryId?: string | null;
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export * from './normalization';
export * from './nav-manifest';
