import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { TopFamilyMemberStatus } from '@central-da-manada/shared';

export class CreateTopFamilyDto {
  @IsString() name: string;
  @IsUUID() representativeLegendaryId: string;
  @IsOptional() @IsUUID() deputyRepresentativeLegendaryId?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateTopFamilyDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsUUID() representativeLegendaryId?: string;
  @IsOptional() @IsUUID() deputyRepresentativeLegendaryId?: string;
  @IsOptional() @IsString() notes?: string;
}

export class CreateTopFamilyMemberDto {
  @IsUUID() topParticipantId: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateTopFamilyMemberDto {
  @IsOptional() @IsEnum(TopFamilyMemberStatus) status?: TopFamilyMemberStatus;
  @IsOptional() @IsString() notes?: string;
}

export class TransferTopFamilyMemberDto {
  @IsUUID() targetFamilyId: string;
  @IsOptional() @IsString() notes?: string;
}
