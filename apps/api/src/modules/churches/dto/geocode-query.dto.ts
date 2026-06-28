import { IsOptional, IsString, MinLength } from 'class-validator';

export class GeocodeQueryDto {
  // Cidade é a âncora do fallback do geocoding — obrigatória.
  @IsString()
  @MinLength(2)
  city: string;

  @IsOptional()
  @IsString()
  name?: string;
}
