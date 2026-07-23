import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { OptionsQueryDto } from '../../common/options/options-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddTeamMemberDto } from './dto/add-team-member.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import { TeamMembersQueryDto } from './dto/team-members-query.dto';
import { TeamQueryDto } from './dto/team-query.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamsService } from './teams.service';

@Controller('teams')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @Permissions('teams.read')
  findAll(@Query() query: TeamQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.teamsService.findAll(query, user);
  }

  @Get('options')
  @Permissions('teams.read')
  async options(@Query() query: OptionsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.teamsService.options(query, user) };
  }

  @Get(':id')
  @Permissions('teams.read')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.teamsService.findOne(id, user) };
  }

  @Post()
  @Permissions('teams.create')
  async create(@Body() dto: CreateTeamDto, @CurrentUser() user: { sub: string }) {
    return { data: await this.teamsService.create(dto, user.sub) };
  }

  @Patch(':id')
  @Permissions('teams.update')
  async update(@Param('id') id: string, @Body() dto: UpdateTeamDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.teamsService.update(id, dto, user) };
  }

  @Patch(':id/deactivate')
  @Permissions('teams.delete')
  async deactivate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.teamsService.deactivate(id, user) };
  }

  @Patch(':id/restore')
  @Permissions('teams.restore')
  async restore(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.teamsService.restore(id, user) };
  }

  @Delete(':id')
  @Permissions('teams.delete')
  async delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.teamsService.deactivate(id, user) };
  }

  @Get(':id/members')
  @Permissions('teams.members.read')
  findMembers(@Param('id') id: string, @Query() query: TeamMembersQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.teamsService.findMembers(id, query, user);
  }

  @Post(':id/members')
  @Permissions('teams.members.add')
  async addMember(@Param('id') id: string, @Body() dto: AddTeamMemberDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.teamsService.addMember(id, dto, user) };
  }

  @Patch(':id/members/:membershipId')
  @Permissions('teams.members.update')
  async updateMember(
    @Param('id') id: string,
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdateTeamMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.teamsService.updateMember(id, membershipId, dto, user) };
  }

  @Patch(':id/members/:membershipId/deactivate')
  @Permissions('teams.members.remove')
  async deactivateMember(@Param('id') id: string, @Param('membershipId') membershipId: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.teamsService.deactivateMember(id, membershipId, user) };
  }

  @Delete(':id/members/:membershipId')
  @Permissions('teams.members.remove')
  async deleteMember(@Param('id') id: string, @Param('membershipId') membershipId: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.teamsService.deactivateMember(id, membershipId, user) };
  }
}
