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
  /**
   * Profissão em texto livre (change profissao-livre-vinculo-catalogo). O backend resolve
   * contra o catálogo ativo. Enviado SOMENTE quando o campo é editado — a omissão preserva
   * o vínculo atual, inclusive um legado apontando para profissão já desativada.
   * A web não envia mais `professionId` (que segue aceito pela API por compatibilidade).
   */
  professionText?: string;
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
};

export type ChurchPayload = {
  name: string;
  city?: string;
  notes?: string;
};
