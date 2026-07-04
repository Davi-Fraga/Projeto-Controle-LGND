import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength, ValidateNested } from 'class-validator';
import { SystemRole, UserScopeType } from '@central-da-manada/shared';

export class InviteScopeDto {
  @IsEnum(UserScopeType)
  type!: UserScopeType;

  @IsString()
  @MinLength(1)
  value!: string;
}

export class CreateInviteDto {
  @IsEmail()
  email!: string;

  // Funções (rótulo organizacional) iniciais da conta.
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(SystemRole, { each: true })
  roles!: SystemRole[];

  @IsOptional()
  @IsUUID()
  legendaryId?: string;

  // Escopos de dados iniciais (1-N). O acesso a telas é configurado depois em
  // Controle de Acessos.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InviteScopeDto)
  scopes?: InviteScopeDto[];
}

export class AcceptInviteDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
