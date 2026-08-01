import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// Estes campos viram query string numa chamada ao Nominatim — limite de tamanho
// evita URL absurda (e o 414 correspondente) a partir de entrada do usuário.
export class GeocodeQueryDto {
  // Cidade é a âncora do fallback do geocoding — obrigatória.
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  city: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  name?: string;

  // Endereço opcional: quando informado, o preview geocodifica por ele primeiro
  // (mais preciso que o centro da cidade), igual ao save.
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;
}
