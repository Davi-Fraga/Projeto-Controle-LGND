import { IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

// Limites de tamanho na mesma escala do `FormsSyncWebhookDto` (referência do projeto):
// sem eles, um usuário autenticado pode gravar centenas de KB por campo de texto.
export class CreateChurchDto {
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  city?: string;

  // Endereço opcional: quando preenchido, melhora a precisão do geocoding
  // (busca por endereço + cidade antes de nome + cidade).
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  spiritualLeaderName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
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
  @MaxLength(2000)
  notes?: string;
}
