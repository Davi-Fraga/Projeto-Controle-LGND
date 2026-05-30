import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MapService } from './map.service';

@Controller('map')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MapController {
  constructor(private readonly mapService: MapService) {}

  @Get('rota-do-cerrado')
  @Permissions('map.read')
  async rotaDoCerrado(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.mapService.rotaDoCerrado(user) };
  }
}
