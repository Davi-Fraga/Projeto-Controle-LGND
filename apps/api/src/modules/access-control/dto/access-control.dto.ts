import { IsEnum, IsString, MinLength } from 'class-validator';
import { ScreenAccessLevel, UserScopeType } from '@central-da-manada/shared';

// Define o nível de acesso de uma tela (NONE/VIEW/EDIT) — o admin nunca envia
// permissions cruas, apenas tela + nível.
export class SetScreenLevelDto {
  @IsEnum(ScreenAccessLevel)
  level!: ScreenAccessLevel;
}

export class AddUserScopeDto {
  @IsEnum(UserScopeType)
  type!: UserScopeType;

  @IsString()
  @MinLength(1)
  value!: string;
}

export { ScreenAccessLevel, UserScopeType };
