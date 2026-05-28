import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { TeamMembershipStatus } from '@central-da-manada/shared';

export class UpdateTeamMemberDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  role?: string;

  @IsOptional()
  @IsEnum(TeamMembershipStatus)
  status?: TeamMembershipStatus;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startedAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endedAt?: Date;

  @IsOptional()
  @IsString()
  notes?: string;
}
