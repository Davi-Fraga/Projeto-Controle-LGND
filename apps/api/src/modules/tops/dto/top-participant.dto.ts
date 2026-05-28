import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { TopParticipantStatus, TopParticipantType } from '@central-da-manada/shared';
import { PaginationDto } from '../../../common/pagination/pagination.dto';

export class TopParticipantsQueryDto extends PaginationDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(TopParticipantStatus) status?: TopParticipantStatus;
  @IsOptional() @IsEnum(TopParticipantType) type?: TopParticipantType;
}

export class CreateTopParticipantDto {
  @IsUUID() legendaryId: string;
  @IsEnum(TopParticipantType) type: TopParticipantType;
  @IsEnum(TopParticipantStatus) status: TopParticipantStatus;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateTopParticipantDto {
  @IsOptional() @IsEnum(TopParticipantType) type?: TopParticipantType;
  @IsOptional() @IsEnum(TopParticipantStatus) status?: TopParticipantStatus;
  @IsOptional() @IsString() notes?: string;
}
