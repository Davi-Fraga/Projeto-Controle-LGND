import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { OptionsQueryDto } from '../../common/options/options-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TopScopeGuard } from './guards/top-scope.guard';
import { TopsService } from './tops.service';
import { CreateTopDto, TopQueryDto } from './dto/top-query.dto';
import { UpdateTopDto } from './dto/update-top.dto';
import { CreateTopTeamDto, UpdateTopTeamDto } from './dto/top-team.dto';
import { CreateTopParticipantDto, TopParticipantsQueryDto, UpdateTopParticipantDto } from './dto/top-participant.dto';
import { ParticipantOptionsQueryDto } from './dto/participant-options-query.dto';
import { CreateTopServantDto, TopServantsQueryDto, UpdateTopServantDto } from './dto/top-servant.dto';
import { CreateTopFamilyDto, CreateTopFamilyMemberDto, TransferTopFamilyMemberDto, UpdateTopFamilyDto, UpdateTopFamilyMemberDto } from './dto/top-family.dto';
import { OrgChartQueryDto } from './dto/org-chart.dto';

@Controller('tops')
@UseGuards(JwtAuthGuard, PermissionsGuard, TopScopeGuard)
export class TopsController {
  constructor(private readonly tops: TopsService) {}
  @Get() @Permissions('tops.read') findAll(@Query() q: TopQueryDto, @CurrentUser() user: AuthenticatedUser) { return this.tops.findAll(q, user); }
  @Get('options') @Permissions('tops.read') async options(@Query() q: OptionsQueryDto, @CurrentUser() user: AuthenticatedUser) { return { data: await this.tops.options(q, user) }; }
  @Get(':id') @Permissions('tops.read') async findOne(@Param('id') id: string) { return { data: await this.tops.findOne(id) }; }
  @Get(':id/org-chart') @Permissions('tops.read') async orgChart(@Param('id') id: string, @Query() q: OrgChartQueryDto) { return { data: await this.tops.getOrgChart(id, q.view) }; }
  @Post() @Permissions('tops.create') async create(@Body() dto: CreateTopDto, @CurrentUser() u: { sub: string }) { return { data: await this.tops.create(dto, u.sub) }; }
  @Patch(':id') @Permissions('tops.update') async update(@Param('id') id: string, @Body() dto: UpdateTopDto, @CurrentUser() u: { sub: string }) { return { data: await this.tops.update(id, dto, u.sub) }; }
  @Patch(':id/deactivate') @Permissions('tops.delete') async deactivate(@Param('id') id: string, @CurrentUser() u: { sub: string }) { return { data: await this.tops.deactivate(id, u.sub) }; }
  @Patch(':id/restore') @Permissions('tops.restore') async restore(@Param('id') id: string, @CurrentUser() u: { sub: string }) { return { data: await this.tops.restore(id, u.sub) }; }
  @Delete(':id') @Permissions('tops.delete') async delete(@Param('id') id: string, @CurrentUser() u: { sub: string }) { return { data: await this.tops.deactivate(id, u.sub) }; }
  @Get(':id/families') @Permissions('tops.families.read') async families(@Param('id') id: string) { return { data: await this.tops.findFamilies(id) }; }
  @Get(':id/families/options') @Permissions('tops.families.read') async familyOptions(@Param('id') id: string, @Query() q: OptionsQueryDto) { return { data: await this.tops.familyOptions(id, q) }; }
  @Get(':id/families/:familyId') @Permissions('tops.families.read') async family(@Param('id') id: string, @Param('familyId') familyId: string) { return { data: await this.tops.findFamily(id, familyId) }; }
  @Post(':id/families') @Permissions('tops.families.create') async createFamily(@Param('id') id: string, @Body() dto: CreateTopFamilyDto, @CurrentUser() u: { sub: string }) { return { data: await this.tops.createFamily(id, dto, u.sub) }; }
  @Patch(':id/families/:familyId') @Permissions('tops.families.update') async updateFamily(@Param('id') id: string, @Param('familyId') familyId: string, @Body() dto: UpdateTopFamilyDto, @CurrentUser() u: { sub: string }) { return { data: await this.tops.updateFamily(id, familyId, dto, u.sub) }; }
  @Patch(':id/families/:familyId/deactivate') @Permissions('tops.families.delete') async deactivateFamily(@Param('id') id: string, @Param('familyId') familyId: string, @CurrentUser() u: { sub: string }) { return { data: await this.tops.deactivateFamily(id, familyId, u.sub) }; }
  @Patch(':id/families/:familyId/restore') @Permissions('tops.families.restore') async restoreFamily(@Param('id') id: string, @Param('familyId') familyId: string, @CurrentUser() u: { sub: string }) { return { data: await this.tops.restoreFamily(id, familyId, u.sub) }; }
  @Delete(':id/families/:familyId') @Permissions('tops.families.delete') async deleteFamily(@Param('id') id: string, @Param('familyId') familyId: string, @CurrentUser() u: { sub: string }) { return { data: await this.tops.deactivateFamily(id, familyId, u.sub) }; }
  @Get(':id/families/:familyId/members') @Permissions('tops.families.members.read') async familyMembers(@Param('id') id: string, @Param('familyId') familyId: string) { return { data: await this.tops.findFamilyMembers(id, familyId) }; }
  @Post(':id/families/:familyId/members') @Permissions('tops.families.members.add') async addFamilyMember(@Param('id') id: string, @Param('familyId') familyId: string, @Body() dto: CreateTopFamilyMemberDto, @CurrentUser() u: { sub: string }) { return { data: await this.tops.addFamilyMember(id, familyId, dto, u.sub) }; }
  @Patch(':id/families/:familyId/members/:memberId') @Permissions('tops.families.members.update') async updateFamilyMember(@Param('id') id: string, @Param('familyId') familyId: string, @Param('memberId') memberId: string, @Body() dto: UpdateTopFamilyMemberDto, @CurrentUser() u: { sub: string }) { return { data: await this.tops.updateFamilyMember(id, familyId, memberId, dto, u.sub) }; }
  @Patch(':id/families/:familyId/members/:memberId/deactivate') @Permissions('tops.families.members.remove') async deactivateFamilyMember(@Param('id') id: string, @Param('familyId') familyId: string, @Param('memberId') memberId: string, @CurrentUser() u: { sub: string }) { return { data: await this.tops.deactivateFamilyMember(id, familyId, memberId, u.sub) }; }
  @Delete(':id/families/:familyId/members/:memberId') @Permissions('tops.families.members.remove') async deleteFamilyMember(@Param('id') id: string, @Param('familyId') familyId: string, @Param('memberId') memberId: string, @CurrentUser() u: { sub: string }) { return { data: await this.tops.deactivateFamilyMember(id, familyId, memberId, u.sub) }; }
  @Post(':id/families/:familyId/members/:memberId/transfer') @Permissions('tops.families.members.transfer') async transferFamilyMember(@Param('id') id: string, @Param('familyId') familyId: string, @Param('memberId') memberId: string, @Body() dto: TransferTopFamilyMemberDto, @CurrentUser() u: { sub: string }) { return { data: await this.tops.transferFamilyMember(id, familyId, memberId, dto, u.sub) }; }
  @Get(':id/teams') @Permissions('tops.teams.read') async teams(@Param('id') id: string) { return { data: await this.tops.findTeams(id) }; }
  @Post(':id/teams') @Permissions('tops.teams.add') async addTeam(@Param('id') id: string, @Body() dto: CreateTopTeamDto, @CurrentUser() u: { sub: string }) { return { data: await this.tops.addTeam(id, dto, u.sub) }; }
  @Patch(':id/teams/:topTeamId') @Permissions('tops.teams.update') async updateTeam(@Param('id') id: string, @Param('topTeamId') topTeamId: string, @Body() dto: UpdateTopTeamDto, @CurrentUser() u: { sub: string }) { return { data: await this.tops.updateTeam(id, topTeamId, dto, u.sub) }; }
  @Delete(':id/teams/:topTeamId') @Permissions('tops.teams.remove') async removeTeam(@Param('id') id: string, @Param('topTeamId') topTeamId: string, @CurrentUser() u: { sub: string }) { return { data: await this.tops.removeTeam(id, topTeamId, u.sub) }; }
  @Get(':id/participants') @Permissions('tops.participants.read') findParticipants(@Param('id') id: string, @Query() q: TopParticipantsQueryDto) { return this.tops.findParticipants(id, q); }
  @Get(':id/participants/options') @Permissions('tops.participants.read') async participantOptions(@Param('id') id: string, @Query() q: ParticipantOptionsQueryDto) { return { data: await this.tops.participantOptions(id, q) }; }
  @Post(':id/participants') @Permissions('tops.participants.add') async addParticipant(@Param('id') id: string, @Body() dto: CreateTopParticipantDto, @CurrentUser() u: { sub: string }) { return { data: await this.tops.addParticipant(id, dto, u.sub) }; }
  @Patch(':id/participants/:participantId') @Permissions('tops.participants.update') async updateParticipant(@Param('id') id: string, @Param('participantId') participantId: string, @Body() dto: UpdateTopParticipantDto, @CurrentUser() u: { sub: string }) { return { data: await this.tops.updateParticipant(id, participantId, dto, u.sub) }; }
  @Patch(':id/participants/:participantId/cancel') @Permissions('tops.participants.remove') async cancelParticipant(@Param('id') id: string, @Param('participantId') participantId: string, @CurrentUser() u: { sub: string }) { return { data: await this.tops.cancelParticipant(id, participantId, u.sub) }; }
  @Delete(':id/participants/:participantId') @Permissions('tops.participants.remove') async deleteParticipant(@Param('id') id: string, @Param('participantId') participantId: string, @CurrentUser() u: { sub: string }) { return { data: await this.tops.cancelParticipant(id, participantId, u.sub) }; }
  @Get(':id/servants') @Permissions('tops.servants.read') findServants(@Param('id') id: string, @Query() q: TopServantsQueryDto) { return this.tops.findServants(id, q); }
  @Post(':id/servants') @Permissions('tops.servants.add') async addServant(@Param('id') id: string, @Body() dto: CreateTopServantDto, @CurrentUser() u: { sub: string }) { return { data: await this.tops.addServant(id, dto, u.sub) }; }
  @Patch(':id/servants/:servantId') @Permissions('tops.servants.update') async updateServant(@Param('id') id: string, @Param('servantId') servantId: string, @Body() dto: UpdateTopServantDto, @CurrentUser() u: { sub: string }) { return { data: await this.tops.updateServant(id, servantId, dto, u.sub) }; }
  @Patch(':id/servants/:servantId/cancel') @Permissions('tops.servants.remove') async cancelServant(@Param('id') id: string, @Param('servantId') servantId: string, @CurrentUser() u: { sub: string }) { return { data: await this.tops.cancelServant(id, servantId, u.sub) }; }
  @Delete(':id/servants/:servantId') @Permissions('tops.servants.remove') async deleteServant(@Param('id') id: string, @Param('servantId') servantId: string, @CurrentUser() u: { sub: string }) { return { data: await this.tops.cancelServant(id, servantId, u.sub) }; }
}
