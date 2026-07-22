import type {
  PaginatedResponse,
  Team,
  TopEvent,
  TopFamily,
  TopFamilyMember,
  TopFilters,
  TopParticipant,
  TopParticipantStatus,
  TopParticipantType,
  TopServant,
  TopServantStatus,
  TopTeam,
} from '@central-da-manada/shared';

export type { TopEvent, TopFamily, TopFamilyMember, TopFilters, TopParticipant, TopServant, TopTeam };
export type TopsResponse = PaginatedResponse<TopEvent>;
export type TopResponse = { data: TopEvent };
export type TopTeamsResponse = { data: TopTeam[] };
export type TopParticipantsResponse = PaginatedResponse<TopParticipant>;
export type TopServantsResponse = PaginatedResponse<TopServant>;
export type TopFamiliesResponse = { data: TopFamily[] };
export type TopFamilyResponse = { data: TopFamily };
export type TopFamilyMembersResponse = { data: TopFamilyMember[] };
export type TeamsOptionsResponse = PaginatedResponse<Team>;
export type OptionItem = { id: string; label: string; value: string; metadata?: Record<string, unknown> };
export type OptionsResponse = { data: OptionItem[] };

export type TopPayload = {
  name: string;
  number: number;
  city: string;
  location?: string;
  startDate: string;
  endDate: string;
  status: string;
  representativeLegendaryId?: string;
  deputyRepresentativeLegendaryId?: string;
  generalCoordinatorLegendaryId?: string;
  familyCoordinatorLegendaryId?: string;
  familyDeputyCoordinatorLegendaryId?: string;
  familyGeneralCoordinatorLegendaryId?: string;
  notes?: string;
  needsReview?: boolean;
};

export type TopTeamPayload = {
  teamId?: string;
  coordinatorLegendaryId?: string;
  deputyCoordinatorLegendaryId?: string;
  notes?: string;
};

export type TopParticipantPayload = {
  legendaryId?: string;
  type?: TopParticipantType | string;
  status?: TopParticipantStatus | string;
  notes?: string;
};

export type TopServantPayload = {
  legendaryId?: string;
  teamId?: string;
  role?: string;
  status?: TopServantStatus | string;
  notes?: string;
};

export type TopFamilyPayload = {
  name?: string;
  representativeLegendaryId?: string | null;
  representativeRole?: string | null;
  deputyRepresentativeLegendaryId?: string | null;
  deputyRepresentativeRole?: string | null;
  notes?: string | null;
  needsReview?: boolean;
};

export type TopFamilyMemberPayload = {
  topParticipantId?: string;
  status?: string;
  notes?: string;
  needsReview?: boolean;
};
