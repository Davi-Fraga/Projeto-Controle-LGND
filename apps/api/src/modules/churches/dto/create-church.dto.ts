import { IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateChurchDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  city?: string;

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
