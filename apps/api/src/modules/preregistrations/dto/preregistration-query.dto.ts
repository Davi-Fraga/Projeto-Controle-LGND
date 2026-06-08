import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { TopPreRegistrationStatus } from '@central-da-manada/shared';
import { PaginationDto } from '../../../common/pagination/pagination.dto';

export class PreRegistrationQueryDto extends PaginationDto {
  @IsOptional() @IsUUID() topEventId?: string;
  @IsOptional() @IsEnum(TopPreRegistrationStatus) status?: TopPreRegistrationStatus;
  @IsOptional() @IsString() search?: string;
}
