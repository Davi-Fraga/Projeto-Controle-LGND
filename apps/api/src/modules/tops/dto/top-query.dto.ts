import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { TopEventStatus } from '@central-da-manada/shared';
import { PaginationDto } from '../../../common/pagination/pagination.dto';

export class TopQueryDto extends PaginationDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(TopEventStatus) status?: TopEventStatus;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @Type(() => Date) @IsDate() startDateFrom?: Date;
  @IsOptional() @Type(() => Date) @IsDate() startDateTo?: Date;
  @IsOptional() @IsIn(['startDate', 'name', 'createdAt']) orderBy?: 'startDate' | 'name' | 'createdAt' = 'startDate';
  @IsOptional() @IsIn(['asc', 'desc']) orderDirection?: 'asc' | 'desc' = 'desc';
}

export class CreateTopDto {
  @IsString() name: string;
  @Type(() => Number) @IsInt() number: number;
  @IsString() city: string;
  @IsOptional() @IsString() location?: string;
  @Type(() => Date) @IsDate() startDate: Date;
  @Type(() => Date) @IsDate() endDate: Date;
  @IsEnum(TopEventStatus) status: TopEventStatus;
  @IsOptional() @IsString() representativeLegendaryId?: string;
  @IsOptional() @IsString() deputyRepresentativeLegendaryId?: string;
  @IsOptional() @IsString() generalCoordinatorLegendaryId?: string;
  @IsOptional() @IsString() notes?: string;
}
