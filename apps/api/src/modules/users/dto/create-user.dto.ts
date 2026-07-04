import { IsArray, IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

// Base de dados do usuário (SEM senha): o admin nunca define senha de terceiros.
// Criação de conta é só por convite; a própria pessoa define a senha ao aceitar.
export class UserDataDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsUUID()
  legendaryId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];
}
