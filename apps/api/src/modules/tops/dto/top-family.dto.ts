import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { TopFamilyMemberStatus } from '@central-da-manada/shared';

export class CreateTopFamilyDto {
  @IsString() name: string;
  @IsOptional() @IsUUID() representativeLegendaryId?: string;
  @IsOptional() @IsString() representativeRole?: string;
  @IsOptional() @IsUUID() deputyRepresentativeLegendaryId?: string;
  @IsOptional() @IsString() deputyRepresentativeRole?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() needsReview?: boolean;
}

export class UpdateTopFamilyDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsUUID() representativeLegendaryId?: string;
  @IsOptional() @IsString() representativeRole?: string;
  @IsOptional() @IsUUID() deputyRepresentativeLegendaryId?: string;
  @IsOptional() @IsString() deputyRepresentativeRole?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() needsReview?: boolean;
}

export class CreateTopFamilyMemberDto {
  @IsUUID() topParticipantId: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() sourceNotes?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() needsReview?: boolean;
}

export class UpdateTopFamilyMemberDto {
  @IsOptional() @IsEnum(TopFamilyMemberStatus) status?: TopFamilyMemberStatus;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() sourceNotes?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() needsReview?: boolean;
}

export class TransferTopFamilyMemberDto {
  @IsUUID() targetFamilyId: string;
  @IsOptional() @IsString() notes?: string;
}
