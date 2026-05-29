import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { LegendaryStatus } from '@central-da-manada/shared';
import { PaginationDto } from '../../../common/pagination/pagination.dto';

export class LegendarioQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(LegendaryStatus)
  status?: LegendaryStatus;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsUUID()
  churchId?: string;

  @IsOptional()
  @IsUUID()
  professionId?: string;

  @IsOptional()
  @IsUUID()
  expertiseId?: string;

  @IsOptional()
  @Transform(({ value }) => (value === 'true' || value === true ? true : value === 'false' || value === false ? false : value))
  @IsBoolean()
  socialActionInterest?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value === 'true' || value === true ? true : value === 'false' || value === false ? false : value))
  @IsBoolean()
  isFromRotaDoCerrado?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value === 'true' || value === true ? true : value === 'false' || value === false ? false : value))
  @IsBoolean()
  needsReview?: boolean;

  @IsOptional()
  @IsIn(['fullName', 'createdAt'])
  orderBy?: 'fullName' | 'createdAt' = 'fullName';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  orderDirection?: 'asc' | 'desc' = 'asc';
}
