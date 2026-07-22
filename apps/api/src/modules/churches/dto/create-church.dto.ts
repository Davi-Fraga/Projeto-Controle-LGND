import { IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateChurchDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  city?: string;

  // Endereço opcional: quando preenchido, melhora a precisão do geocoding
  // (busca por endereço + cidade antes de nome + cidade).
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  spiritualLeaderName?: string;

  @IsOptional()
  @IsString()
  spiritualLeaderPhone?: string;

  @IsOptional()
  @IsUUID()
  spiritualLeaderUserId?: string;

  @IsOptional()
  @IsUUID()
  spiritualLeaderLegendaryId?: string | null;

  @IsOptional()
  @IsNumber()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
