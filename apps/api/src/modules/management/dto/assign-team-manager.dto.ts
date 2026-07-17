import { IsUUID, ValidateIf } from 'class-validator';

/**
 * Atribui (ou remove, com `managerMembershipId: null`) o sub-coordenador que gerencia
 * uma membership (integrante) dentro da mesma equipe. `null` = gerido direto pelo
 * coordenador da equipe. Ver change `hierarquia-limites-organograma`.
 */
export class AssignTeamManagerDto {
  @IsUUID()
  membershipId: string;

  @ValidateIf((o) => o.managerMembershipId !== null)
  @IsUUID()
  managerMembershipId: string | null;
}
