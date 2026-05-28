import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { SocialActionParticipantStatus, SocialActionStatus } from '@central-da-manada/shared';
import { PaginationDto } from '../../../common/pagination/pagination.dto';

export class SocialActionsQueryDto extends PaginationDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(SocialActionStatus) status?: SocialActionStatus;
  @IsOptional() @IsString() city?: string;
}

export class CreateSocialActionDto {
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() city?: string;
  @Type(() => Date) @IsDate() startDate: Date;
  @Type(() => Date) @IsDate() endDate: Date;
  @IsEnum(SocialActionStatus) status: SocialActionStatus;
  @IsUUID() responsibleLegendaryId: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateSocialActionDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @Type(() => Date) @IsDate() startDate?: Date;
  @IsOptional() @Type(() => Date) @IsDate() endDate?: Date;
  @IsOptional() @IsEnum(SocialActionStatus) status?: SocialActionStatus;
  @IsOptional() @IsUUID() responsibleLegendaryId?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() resultSummary?: string;
}

export class CompleteSocialActionDto {
  @IsString() resultSummary: string;
}

export class AddSocialActionParticipantDto {
  @IsUUID() legendaryId: string;
  @IsOptional() @IsString() role?: string;
  @IsEnum(SocialActionParticipantStatus) status: SocialActionParticipantStatus;
  @IsOptional() @IsBoolean() attended?: boolean;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateSocialActionParticipantDto {
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsEnum(SocialActionParticipantStatus) status?: SocialActionParticipantStatus;
  @IsOptional() @IsBoolean() attended?: boolean;
  @IsOptional() @IsString() notes?: string;
}

export class VolunteerSuggestionsQueryDto extends PaginationDto {
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsUUID() professionId?: string;
  @IsOptional() @IsUUID() expertiseId?: string;
  @IsOptional() @IsIn(['true', 'false']) socialActionInterest?: string;
}
