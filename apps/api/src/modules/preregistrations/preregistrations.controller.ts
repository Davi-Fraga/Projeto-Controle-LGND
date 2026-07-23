import { Controller, Delete, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PreRegistrationQueryDto } from './dto/preregistration-query.dto';
import { PreRegistrationsService } from './preregistrations.service';

@Controller('preregistrations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PreRegistrationsController {
  constructor(private readonly preRegistrations: PreRegistrationsService) {}

  @Get() @Permissions('tops.preregistrations.read') findAll(@Query() query: PreRegistrationQueryDto, @CurrentUser() user: AuthenticatedUser) { return this.preRegistrations.findAll(query, user); }
  @Get('pending/count') @Permissions('tops.preregistrations.read') async pendingCount(@CurrentUser() user: AuthenticatedUser) { return { data: await this.preRegistrations.pendingCountByTopEvent(user) }; }
  @Get(':id') @Permissions('tops.preregistrations.read') async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return { data: await this.preRegistrations.findOne(id, user) }; }
  @Delete(':id') @Permissions('tops.preregistrations.delete') async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return { data: await this.preRegistrations.remove(id, user) }; }
}
