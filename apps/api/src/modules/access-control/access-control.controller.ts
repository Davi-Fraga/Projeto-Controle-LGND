import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { SystemRole, UserScopeType } from '@central-da-manada/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccessControlService } from './access-control.service';
import { AddUserScopeDto, SetScopeSelectionDto, SetScreenLevelDto, SetScreenToggleDto } from './dto/access-control.dto';

// Administrar acessos (conceder telas/escopos a QUALQUER usuário) é privilégio EXCLUSIVO
// do administrador — guardado pelo PAPEL admin, nunca pela permissão `users.update`. Gatear
// por `users.update` permitiria escalonamento: conceder "Usuários Ver e editar" a um não-admin
// o deixaria conceder acesso a si mesmo (change access-scope-semantics-hardening).
@Controller('access-control')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SystemRole.COORDINATION_ADMIN)
export class AccessControlController {
  constructor(private readonly accessControl: AccessControlService) {}

  @Get('users/:userId')
  async getUser(@Param('userId') userId: string) {
    return { data: await this.accessControl.getUserScreenAccess(userId) };
  }

  @Put('users/:userId/screens/:screenId')
  async setScreenLevel(
    @Param('userId') userId: string,
    @Param('screenId') screenId: string,
    @Body() dto: SetScreenLevelDto,
    @CurrentUser() user: { sub: string },
  ) {
    return { data: await this.accessControl.setScreenLevel(userId, screenId, dto.level, user.sub) };
  }

  @Put('users/:userId/screens/:screenId/toggles')
  async setScreenToggle(
    @Param('userId') userId: string,
    @Param('screenId') screenId: string,
    @Body() dto: SetScreenToggleDto,
    @CurrentUser() user: { sub: string },
  ) {
    return { data: await this.accessControl.setScreenToggle(userId, screenId, dto.toggleKey, dto.on, user.sub) };
  }

  @Post('users/:userId/scopes')
  async addScope(@Param('userId') userId: string, @Body() dto: AddUserScopeDto, @CurrentUser() user: { sub: string }) {
    return { data: await this.accessControl.addScope(userId, dto, user.sub) };
  }

  // Substituição atômica do escopo de um tipo (MISSING/SELECTED/ALL).
  @Put('users/:userId/scopes/:type')
  async setScopeSelection(
    @Param('userId') userId: string,
    @Param('type') type: UserScopeType,
    @Body() dto: SetScopeSelectionDto,
    @CurrentUser() user: { sub: string },
  ) {
    return { data: await this.accessControl.setScopeSelection(userId, type, dto, user.sub) };
  }

  @Delete('users/:userId/scopes/:scopeId')
  async removeScope(@Param('userId') userId: string, @Param('scopeId') scopeId: string, @CurrentUser() user: { sub: string }) {
    return { data: await this.accessControl.removeScope(userId, scopeId, user.sub) };
  }
}
