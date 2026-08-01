import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { LegendaryStatus } from '@central-da-manada/shared';

// Limites de tamanho na mesma escala do `FormsSyncWebhookDto` (referência do projeto):
// sem eles, um usuário autenticado pode gravar centenas de KB por campo de texto.
export class CreateLegendarioDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  fullName: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  lgndNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  city?: string;

  @Type(() => Boolean)
  @IsBoolean()
  isFromRotaDoCerrado: boolean;

  @IsOptional()
  @IsUUID()
  churchId?: string;

  @Type(() => Boolean)
  @IsBoolean()
  servesInChurch: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  churchRole?: string;

  /**
   * Entrada compatível para clientes antigos que enviam apenas o ID catalogado.
   * Não pode vir junto de `professionText` (payload ambíguo → 400).
   */
  @IsOptional()
  @IsUUID()
  professionId?: string;

  /**
   * Profissão em texto livre (change profissao-livre-vinculo-catalogo). A presença
   * desta propriedade é autoritativa, INCLUSIVE como string vazia (= limpar
   * profissão). O service resolve contra o catálogo ativo: match único vira
   * `professionId`; sem match ou ambíguo preserva o texto e força `needsReview`.
   */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  professionText?: string;

  @IsEnum(LegendaryStatus)
  status: LegendaryStatus;

  @Type(() => Boolean)
  @IsBoolean()
  socialActionInterest: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  needsReview?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  expertiseIds?: string[];

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  firstTopIsExternal?: boolean;

  @IsOptional()
  @IsUUID()
  firstTopEventId?: string;

  @IsOptional()
  @IsUUID()
  firstTopFamilyId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  firstTopExternalText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  firstTopNotes?: string;
}
