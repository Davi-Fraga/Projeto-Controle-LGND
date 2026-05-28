import type {
  PaginatedResponse,
  Team,
  TeamFilters,
  TeamMembership,
  TeamMembershipStatus,
  TeamStatus,
} from '@central-da-manada/shared';

export type { Team, TeamFilters, TeamMembership };

export type TeamsResponse = PaginatedResponse<Team>;

export type TeamResponse = {
  data: Team;
};

export type TeamPayload = {
  name: string;
  description?: string;
  status: TeamStatus | string;
  coordinatorLegendaryId?: string;
  deputyCoordinatorLegendaryId?: string;
};

export type TeamMembersResponse = PaginatedResponse<TeamMembership>;

export type TeamMemberPayload = {
  legendaryId?: string;
  role: string;
  status?: TeamMembershipStatus | string;
  startedAt?: string;
  endedAt?: string;
  notes?: string;
};
