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

  @Post('city/assign-leader')
  @Permissions('legendarios.update')
  async assignCityLeader(@Body() dto: AssignCityLeaderDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.management.assignCityLeader(dto, user) };
  }

  @Post('team/assign-manager')
  @Permissions('teams.update')
  async assignTeamManager(@Body() dto: AssignTeamManagerDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.management.assignTeamManager(dto, user) };
  }
}
