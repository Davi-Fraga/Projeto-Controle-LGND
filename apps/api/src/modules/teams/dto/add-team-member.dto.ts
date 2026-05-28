import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class AddTeamMemberDto {
  @IsUUID()
  legendaryId: string;

  @IsString()
  @MinLength(2)
  role: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startedAt?: Date;

  @IsOptional()
  @IsString()
  notes?: string;
}
