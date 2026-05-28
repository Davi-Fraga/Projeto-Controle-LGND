import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LegendaryHistoryType } from '@central-da-manada/shared';

export class LegendaryHistoryQueryDto {
  @IsOptional() @IsEnum(LegendaryHistoryType) type?: LegendaryHistoryType;
}

export class CreateLegendaryHistoryNoteDto {
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
}
