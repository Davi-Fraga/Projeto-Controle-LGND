import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccessControlService } from './access-control.service';
import { AddUserScopeDto, SetScreenLevelDto } from './dto/access-control.dto';

@Controller('access-control')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AccessControlController {
  constructor(private readonly accessControl: AccessControlService) {}

  @Get('users/:userId')
  @Permissions('users.read')
  async getUser(@Param('userId') userId: string) {
    return { data: await this.accessControl.getUserScreenAccess(userId) };
  }

  @Put('users/:userId/screens/:screenId')
  @Permissions('users.update')
  async setScreenLevel(
    @Param('userId') userId: string,
    @Param('screenId') screenId: string,
    @Body() dto: SetScreenLevelDto,
    @CurrentUser() user: { sub: string },
  ) {
    return { data: await this.accessControl.setScreenLevel(userId, screenId, dto.level, user.sub) };
  }

  @Post('users/:userId/scopes')
  @Permissions('users.update')
  async addScope(@Param('userId') userId: string, @Body() dto: AddUserScopeDto, @CurrentUser() user: { sub: string }) {
    return { data: await this.accessControl.addScope(userId, dto, user.sub) };
  }

  @Delete('users/:userId/scopes/:scopeId')
  @Permissions('users.update')
  async removeScope(@Param('userId') userId: string, @Param('scopeId') scopeId: string, @CurrentUser() user: { sub: string }) {
    return { data: await this.accessControl.removeScope(userId, scopeId, user.sub) };
  }
}
