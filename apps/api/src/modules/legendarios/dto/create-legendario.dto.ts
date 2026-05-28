import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { LegendaryStatus } from '@central-da-manada/shared';

export class CreateLegendarioDto {
  @IsString()
  @MinLength(3)
  fullName: string;

  @IsOptional()
  @IsString()
  lgndNumber?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @Type(() => Boolean)
  @IsBoolean()
  isFromRotaDoCerrado: boolean;

  @IsOptional()
  @IsUUID()
  churchId?: string;

  @Type(() => Boolean)
  @IsBoolean()
  servesInChurch: boolean;

  @IsOptional()
  @IsString()
  churchRole?: string;

  @IsOptional()
  @IsUUID()
  professionId?: string;

  @IsEnum(LegendaryStatus)
  status: LegendaryStatus;

  @Type(() => Boolean)
  @IsBoolean()
  socialActionInterest: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  expertiseIds?: string[];
}
