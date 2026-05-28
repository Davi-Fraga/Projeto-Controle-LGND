import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { TopServantStatus } from '@central-da-manada/shared';
import { PaginationDto } from '../../../common/pagination/pagination.dto';

export class TopServantsQueryDto extends PaginationDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(TopServantStatus) status?: TopServantStatus;
  @IsOptional() @IsUUID() teamId?: string;
  @IsOptional() @IsString() role?: string;
}

export class CreateTopServantDto {
  @IsUUID() legendaryId: string;
  @IsOptional() @IsUUID() teamId?: string;
  @IsOptional() @IsString() role?: string;
  @IsEnum(TopServantStatus) status: TopServantStatus;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateTopServantDto {
  @IsOptional() @IsUUID() teamId?: string;
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsEnum(TopServantStatus) status?: TopServantStatus;
  @IsOptional() @IsString() notes?: string;
}
