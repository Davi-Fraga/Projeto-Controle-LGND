import { IsArray, IsBoolean, IsEnum, IsString, MinLength } from 'class-validator';
import { ScopeSelectionMode, ScreenAccessLevel, UserScopeType } from '@central-da-manada/shared';

// Define o nível de acesso de uma tela (NONE/VIEW/EDIT) — o admin nunca envia
// permissions cruas, apenas tela + nível.
export class SetScreenLevelDto {
  @IsEnum(ScreenAccessLevel)
  level!: ScreenAccessLevel;
}

// Liga/desliga um toggle de ação de uma tela (à parte do nível). O backend valida
// (fail-closed) que a key é um toggle declarado da tela.
export class SetScreenToggleDto {
  @IsString()
  @MinLength(1)
  toggleKey!: string;

  @IsBoolean()
  on!: boolean;
}

export class AddUserScopeDto {
  @IsEnum(UserScopeType)
  type!: UserScopeType;

  @IsString()
  @MinLength(1)
  value!: string;
}

// Substituição atômica do escopo de um tipo (change access-scope-bulk-selection).
// values: [] em MISSING/ALL; 1..500 ids únicos em SELECTED (validados no service).
export class SetScopeSelectionDto {
  @IsEnum(ScopeSelectionMode)
  mode!: ScopeSelectionMode;

  @IsArray()
  @IsString({ each: true })
  values!: string[];
}

export { ScreenAccessLevel, UserScopeType };
