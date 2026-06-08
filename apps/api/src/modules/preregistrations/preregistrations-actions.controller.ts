import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApprovePreRegistrationDto, RejectPreRegistrationDto } from './dto/review-preregistration.dto';
import { PreRegistrationsService } from './preregistrations.service';

@Controller('tops/:topEventId/pre-registrations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PreRegistrationsActionsController {
  constructor(private readonly preRegistrations: PreRegistrationsService) {}

  @Post(':id/approve')
  @Permissions('tops.preregistrations.approve')
  async approve(
    @Param('topEventId') topEventId: string,
    @Param('id') id: string,
    @Body() dto: ApprovePreRegistrationDto,
    @CurrentUser() user: { sub: string },
  ) {
    return { data: await this.preRegistrations.approve(topEventId, id, dto, user.sub) };
  }

  @Post(':id/reject')
  @Permissions('tops.preregistrations.reject')
  async reject(
    @Param('topEventId') topEventId: string,
    @Param('id') id: string,
    @Body() dto: RejectPreRegistrationDto,
    @CurrentUser() user: { sub: string },
  ) {
    return { data: await this.preRegistrations.reject(topEventId, id, dto, user.sub) };
  }
}
