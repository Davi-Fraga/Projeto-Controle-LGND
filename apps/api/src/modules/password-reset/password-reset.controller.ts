import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PasswordResetService } from './password-reset.service';
import { CreatePasswordResetDto, ResetPasswordDto } from './dto/password-reset.dto';

@Controller('auth/password-reset')
export class PasswordResetController {
  constructor(private readonly passwordReset: PasswordResetService) {}

  // Só admin (users.update) gera links de redefinição.
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.update')
  async create(@Body() dto: CreatePasswordResetDto, @CurrentUser() user: { sub: string }) {
    return { data: await this.passwordReset.create(dto.userId, user.sub) };
  }

  // Públicos (sem JWT): validar e redefinir. RateLimitGuard global protege.
  @Get(':token')
  async validate(@Param('token') token: string) {
    return { data: await this.passwordReset.validate(token) };
  }

  @Post(':token/reset')
  async reset(@Param('token') token: string, @Body() dto: ResetPasswordDto) {
    return { data: await this.passwordReset.reset(token, dto) };
  }
}
