import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDate, IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';
import { TopEventStatus } from '@central-da-manada/shared';
import { PaginationDto } from '../../../common/pagination/pagination.dto';

export class TopQueryDto extends PaginationDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(TopEventStatus) status?: TopEventStatus;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @Type(() => Date) @IsDate() startDateFrom?: Date;
  @IsOptional() @Type(() => Date) @IsDate() startDateTo?: Date;
  @IsOptional() @Transform(({ value }) => (value === 'true' || value === true ? true : value === 'false' || value === false ? false : value)) @IsBoolean() needsReview?: boolean;
  @IsOptional() @Transform(({ value }) => (value === 'true' || value === true ? true : value === 'false' || value === false ? false : value)) @IsBoolean() missingFamilyCoordinator?: boolean;
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
  @IsOptional() @IsUUID() representativeLegendaryId?: string;
  @IsOptional() @IsUUID() deputyRepresentativeLegendaryId?: string;
  @IsOptional() @IsUUID() generalCoordinatorLegendaryId?: string;
  @IsOptional() @IsUUID() familyCoordinatorLegendaryId?: string;
  @IsOptional() @IsUUID() familyDeputyCoordinatorLegendaryId?: string;
  @IsOptional() @IsUUID() familyGeneralCoordinatorLegendaryId?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() needsReview?: boolean;
}
