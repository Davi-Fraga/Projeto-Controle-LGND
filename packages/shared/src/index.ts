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
  spiritualLeaderName?: string | null;
  spiritualLeaderPhone?: string | null;
  spiritualLeaderUserId?: string | null;
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
};

export type LegendaryFilters = PaginationParams & {
  search?: string;
  status?: LegendaryStatus;
  city?: string;
  churchId?: string;
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
