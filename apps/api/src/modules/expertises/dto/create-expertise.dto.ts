import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateExpertiseDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
