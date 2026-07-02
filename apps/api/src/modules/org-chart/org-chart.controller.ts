import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgChartService } from './org-chart.service';
import { CitiesQueryDto } from './dto/cities-query.dto';

@Controller('org-chart')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrgChartController {
  constructor(private readonly orgChart: OrgChartService) {}

  @Get('teams/:teamId') @Permissions('teams.read') async team(@Param('teamId') teamId: string, @CurrentUser() user: AuthenticatedUser) { return { data: await this.orgChart.getTeamChart(teamId, user) }; }
  @Get('coordinators') @Permissions('teams.read') async coordinators() { return { data: await this.orgChart.getCoordinatorsChart() }; }
  @Get('cities/options') @Permissions('legendarios.read') async cityOptions(@CurrentUser() user: AuthenticatedUser) { return { data: await this.orgChart.getCityOptions(user) }; }
  @Get('cities') @Permissions('legendarios.read') async cities(@Query() q: CitiesQueryDto, @CurrentUser() user: AuthenticatedUser) {
    if (!q.city) return { data: { id: 'cities:root', kind: 'root', label: 'Cidades', count: 0, children: [] } };
    return { data: await this.orgChart.getCitiesChart(q.mode, q.city, user) };
  }
}
