import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddSocialActionParticipantDto, CompleteSocialActionDto, CreateSocialActionDto, SocialActionsQueryDto, UpdateSocialActionDto, UpdateSocialActionParticipantDto, VolunteerSuggestionsQueryDto } from './dto/social-actions.dto';
import { SocialActionsService } from './social-actions.service';

@Controller('social-actions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SocialActionsController {
  constructor(private readonly socialActions: SocialActionsService) {}

  @Get('volunteers/suggestions') @Permissions('social-actions.read') suggestions(@Query() query: VolunteerSuggestionsQueryDto) { return this.socialActions.suggestions(query); }
  @Get() @Permissions('social-actions.read') findAll(@Query() query: SocialActionsQueryDto) { return this.socialActions.findAll(query); }
  @Get(':id') @Permissions('social-actions.read') async findOne(@Param('id') id: string) { return { data: await this.socialActions.findOne(id) }; }
  @Post() @Permissions('social-actions.create') async create(@Body() dto: CreateSocialActionDto, @CurrentUser() user: { sub: string }) { return { data: await this.socialActions.create(dto, user.sub) }; }
  @Patch(':id') @Permissions('social-actions.update') async update(@Param('id') id: string, @Body() dto: UpdateSocialActionDto, @CurrentUser() user: { sub: string }) { return { data: await this.socialActions.update(id, dto, user.sub) }; }
  @Patch(':id/complete') @Permissions('social-actions.update') async complete(@Param('id') id: string, @Body() dto: CompleteSocialActionDto, @CurrentUser() user: { sub: string }) { return { data: await this.socialActions.complete(id, dto, user.sub) }; }
  @Patch(':id/cancel') @Permissions('social-actions.update') async cancel(@Param('id') id: string, @CurrentUser() user: { sub: string }) { return { data: await this.socialActions.cancel(id, user.sub) }; }
  @Delete(':id') @Permissions('social-actions.delete') async delete(@Param('id') id: string, @CurrentUser() user: { sub: string }) { return { data: await this.socialActions.delete(id, user.sub) }; }
  @Get(':id/participants') @Permissions('social-actions.participants.read') async participants(@Param('id') id: string) { return { data: await this.socialActions.participants(id) }; }
  @Post(':id/participants') @Permissions('social-actions.participants.add') async addParticipant(@Param('id') id: string, @Body() dto: AddSocialActionParticipantDto, @CurrentUser() user: { sub: string }) { return { data: await this.socialActions.addParticipant(id, dto, user.sub) }; }
  @Patch(':id/participants/:participantId') @Permissions('social-actions.participants.update') async updateParticipant(@Param('id') id: string, @Param('participantId') participantId: string, @Body() dto: UpdateSocialActionParticipantDto, @CurrentUser() user: { sub: string }) { return { data: await this.socialActions.updateParticipant(id, participantId, dto, user.sub) }; }
  @Delete(':id/participants/:participantId') @Permissions('social-actions.participants.remove') async removeParticipant(@Param('id') id: string, @Param('participantId') participantId: string, @CurrentUser() user: { sub: string }) { return { data: await this.socialActions.removeParticipant(id, participantId, user.sub) }; }
}
