import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTopTeamDto {
  @IsUUID() teamId: string;
  @IsOptional() @IsUUID() coordinatorLegendaryId?: string;
  @IsOptional() @IsUUID() deputyCoordinatorLegendaryId?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateTopTeamDto {
  @IsOptional() @IsUUID() coordinatorLegendaryId?: string;
  @IsOptional() @IsUUID() deputyCoordinatorLegendaryId?: string;
  @IsOptional() @IsString() notes?: string;
}
