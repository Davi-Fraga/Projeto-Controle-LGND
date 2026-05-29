import type {
  Church,
  Expertise,
  Legendary,
  LegendaryFilters,
  LegendaryHistory,
  LegendaryHistoryType,
  PaginatedResponse,
  Profession,
} from '@central-da-manada/shared';

export type { Church, Expertise, Legendary, LegendaryFilters, LegendaryHistory, LegendaryHistoryType, Profession };

export type LegendariosResponse = PaginatedResponse<Legendary>;

export type OptionResponse<T> = {
  data: T[];
};

export type LegendarioResponse = {
  data: Legendary;
};

export type LegendaryHistoryResponse = {
  data: LegendaryHistory[];
};

export type LegendarioPayload = {
  fullName: string;
  lgndNumber?: string;
  phone?: string;
  city?: string;
  isFromRotaDoCerrado: boolean;
  churchId?: string;
  servesInChurch: boolean;
  churchRole?: string;
  professionId?: string;
  status: string;
  socialActionInterest: boolean;
  notes?: string;
  needsReview?: boolean;
  expertiseIds: string[];
  firstTopIsExternal: boolean;
  firstTopEventId?: string;
  firstTopFamilyId?: string;
  firstTopExternalText?: string;
  firstTopNotes?: string;
  alreadyServedAsService: boolean;
  serviceTopEventId?: string;
  serviceTeamId?: string;
  serviceRole?: string;
  serviceNotes?: string;
};

export type ChurchPayload = {
  name: string;
  city?: string;
  notes?: string;
};
