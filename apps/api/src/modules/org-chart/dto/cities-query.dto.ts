import { IsIn, IsOptional, IsString } from 'class-validator';
import { DepthQueryDto } from './depth-query.dto';

export type CitiesMode = 'legendaries' | 'churches';

export const CITIES_MODES: CitiesMode[] = ['legendaries', 'churches'];

export class CitiesQueryDto extends DepthQueryDto {
  @IsIn(CITIES_MODES, { message: 'mode must be one of: legendaries, churches' })
  mode: CitiesMode;

  @IsOptional() @IsString() city?: string;
}
