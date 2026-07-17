import { IsUUID, ValidateIf } from 'class-validator';

/**
 * Atribui (ou remove, com `leaderId: null`) o Líder de cidade de um legendário.
 * Ver change `hierarquia-limites-organograma`.
 */
export class AssignCityLeaderDto {
  @IsUUID()
  legendaryId: string;

  // null = remover o vínculo (volta para "sem gestor").
  @ValidateIf((o) => o.leaderId !== null)
  @IsUUID()
  leaderId: string | null;
}
