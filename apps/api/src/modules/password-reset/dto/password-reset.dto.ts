import { IsString, IsUUID, MinLength } from 'class-validator';

export class CreatePasswordResetDto {
  @IsUUID()
  userId!: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(8)
  password!: string;
}
