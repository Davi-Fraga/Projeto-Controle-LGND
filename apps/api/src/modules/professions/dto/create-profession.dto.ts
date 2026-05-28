import { IsString, MinLength } from 'class-validator';

export class CreateProfessionDto {
  @IsString()
  @MinLength(2)
  name: string;
}
