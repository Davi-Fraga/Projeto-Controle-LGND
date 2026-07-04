import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InvitesService } from './invites.service';
import { AcceptInviteDto, CreateInviteDto } from './dto/invites.dto';

@Controller('auth/invites')
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  // Só admin (users.create) gera convites.
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.create')
  async create(@Body() dto: CreateInviteDto, @CurrentUser() user: { sub: string }) {
    return { data: await this.invites.create(dto, user.sub) };
  }

  // Públicos (sem JWT): validar e aceitar. RateLimitGuard global protege.
  @Get(':token')
  async validate(@Param('token') token: string) {
    return { data: await this.invites.validate(token) };
  }

  @Post(':token/accept')
  async accept(@Param('token') token: string, @Body() dto: AcceptInviteDto) {
    return { data: await this.invites.accept(token, dto) };
  }
}
