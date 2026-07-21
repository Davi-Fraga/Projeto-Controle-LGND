import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssignCityLeaderDto } from './dto/assign-city-leader.dto';
import { AssignTeamManagerDto } from './dto/assign-team-manager.dto';
import { ManagementService } from './management.service';

@Controller('management')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ManagementController {
  constructor(private readonly management: ManagementService) {}

  // Mover pessoa entre gestores dentro da subdivisão (change organograma-navegacao-
  // escalavel, Fase 3): guardado pela permissão estrutural `organogram.group.reorder`.
  // O service revalida teto de 10, ciclo, escopo e audita (não muda essas regras).
  @Post('city/assign-leader')
  @Permissions('organogram.group.reorder')
  async assignCityLeader(@Body() dto: AssignCityLeaderDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.management.assignCityLeader(dto, user) };
  }

  @Post('team/assign-manager')
  @Permissions('organogram.group.reorder')
  async assignTeamManager(@Body() dto: AssignTeamManagerDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.management.assignTeamManager(dto, user) };
  }
}
