import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateChurchDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
