import { IsIn, IsOptional, IsString } from 'class-validator';

export type CitiesMode = 'legendaries' | 'churches';

export const CITIES_MODES: CitiesMode[] = ['legendaries', 'churches'];

export class CitiesQueryDto {
  @IsIn(CITIES_MODES, { message: 'mode must be one of: legendaries, churches' })
  mode: CitiesMode;

  @IsOptional() @IsString() city?: string;
}
