import { IsBoolean, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Payload CANÔNICO enviado pelo Google Apps Script vinculado ao Forms "MANADA
 * ROTA DO CERRADO" (design D8). Diferente do webhook de pré-inscrição de TOP,
 * aqui controlamos a forma exata do payload, então validamos como classe.
 *
 * O ValidationPipe global (whitelist + forbidNonWhitelisted + transform) rejeita
 * campos fora desta lista. Só as âncoras de identidade são obrigatórias
 * (`responseId`, `responseTimestamp`, `fullName`, `lgndNumber`); os demais campos
 * ausentes/ inválidos viram `needsReview` no service, não rejeição (spec).
 */
export class FormsSyncWebhookDto {
  // ---- Controle / idempotência (obrigatórios) ----
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  responseId!: string;

  @IsISO8601()
  responseTimestamp!: string;

  // ---- Âncoras de identidade (obrigatórias) ----
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  fullName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lgndNumber!: string;

  // ---- Demais campos (opcionais; ausência vira needsReview no service) ----
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsString() @MaxLength(100) team?: string;
  @IsOptional() @IsString() @MaxLength(320) email?: string;
  @IsOptional() @IsString() @MaxLength(320) emailConfirmation?: string;
  @IsOptional() @IsString() @MaxLength(20) birthDate?: string; // YYYY-MM-DD
  @IsOptional() @IsString() @MaxLength(200) district?: string;
  @IsOptional() @IsString() @MaxLength(200) city?: string;
  @IsOptional() @IsString() @MaxLength(100) state?: string;
  @IsOptional() @IsString() @MaxLength(300) churchName?: string;
  @IsOptional() @IsString() @MaxLength(300) spiritualLeaderName?: string;
  @IsOptional() @IsString() @MaxLength(50) spiritualLeaderPhone?: string;
  @IsOptional() @IsString() @MaxLength(2000) skills?: string;
  @IsOptional() @IsString() @MaxLength(200) profession?: string;
  @IsOptional() @IsString() @MaxLength(300) relativeName?: string;
  @IsOptional() @IsString() @MaxLength(50) relativePhone?: string;
  @IsOptional() @IsString() @MaxLength(320) relativeEmail?: string;
  @IsOptional() @IsBoolean() isSpiritualLeader?: boolean;
  @IsOptional() @IsString() @MaxLength(300) leadershipRole?: string;
  @IsOptional() @IsString() @MaxLength(300) firstMountainTop?: string;
}
