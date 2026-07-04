import { PartialType } from '@nestjs/mapped-types';
import { UserDataDto } from './create-user.dto';

// Edição administrativa: nome, email, função, Legendário — NUNCA senha.
export class UpdateUserDto extends PartialType(UserDataDto) {}
