import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { InternalMessageStatus, InternalMessageTargetType } from '@central-da-manada/shared';
import { PaginationDto } from '../../../common/pagination/pagination.dto';

export class CommunicationsQueryDto extends PaginationDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(InternalMessageStatus) status?: InternalMessageStatus;
}

export class CreateCommunicationDto {
  @IsString() title: string;
  @IsString() body: string;
  @IsEnum(InternalMessageTargetType) targetType: InternalMessageTargetType;
  @IsOptional() @IsUUID() targetId?: string;
  @IsOptional() @IsUUID() topEventId?: string;
  @IsOptional() @IsBoolean() requiresConfirmation?: boolean;
}

export class UpdateCommunicationDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsEnum(InternalMessageTargetType) targetType?: InternalMessageTargetType;
  @IsOptional() @IsUUID() targetId?: string;
  @IsOptional() @IsUUID() topEventId?: string;
  @IsOptional() @IsBoolean() requiresConfirmation?: boolean;
}
