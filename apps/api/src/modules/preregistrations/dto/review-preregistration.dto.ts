import { IsOptional, IsString, IsUUID } from 'class-validator';

export class ApprovePreRegistrationDto {
  @IsOptional() @IsUUID() legendaryId?: string;
  @IsOptional() @IsString() notes?: string;
}

export class RejectPreRegistrationDto {
  @IsOptional() @IsString() notes?: string;
}
