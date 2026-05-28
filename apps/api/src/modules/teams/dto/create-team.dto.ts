import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { TeamStatus } from '@central-da-manada/shared';

export class CreateTeamDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TeamStatus)
  status?: TeamStatus;

  @IsOptional()
  @IsUUID()
  coordinatorLegendaryId?: string;

  @IsOptional()
  @IsUUID()
  deputyCoordinatorLegendaryId?: string;
}
