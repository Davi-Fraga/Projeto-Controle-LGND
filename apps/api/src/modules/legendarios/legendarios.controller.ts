import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateLegendarioDto } from './dto/create-legendario.dto';
import { LegendarioQueryDto } from './dto/legendario-query.dto';
import { CreateLegendaryHistoryNoteDto, LegendaryHistoryQueryDto } from './dto/legendary-history.dto';
import { UpdateLegendarioDto } from './dto/update-legendario.dto';
import { LegendariosService } from './legendarios.service';

@Controller('legendarios')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LegendariosController {
  constructor(private readonly legendariosService: LegendariosService) {}

  @Get()
  @Permissions('legendarios.read')
  findAll(@Query() query: LegendarioQueryDto) {
    return this.legendariosService.findAll(query);
  }

  @Get(':id')
  @Permissions('legendarios.read')
  async findOne(@Param('id') id: string) {
    return { data: await this.legendariosService.findOne(id) };
  }

  @Get(':id/history')
  @Permissions('legendarios.history.read')
  async history(@Param('id') id: string, @Query() query: LegendaryHistoryQueryDto) {
    return { data: await this.legendariosService.findHistory(id, query) };
  }

  @Post(':id/history')
  @Permissions('legendarios.history.create')
  async addHistoryNote(@Param('id') id: string, @Body() dto: CreateLegendaryHistoryNoteDto, @CurrentUser() user: { sub: string }) {
    return { data: await this.legendariosService.addHistoryNote(id, dto, user.sub) };
  }

  @Post()
  @Permissions('legendarios.create')
  async create(@Body() dto: CreateLegendarioDto, @CurrentUser() user: { sub: string }) {
    return { data: await this.legendariosService.create(dto, user.sub) };
  }

  @Patch(':id')
  @Permissions('legendarios.update')
  async update(@Param('id') id: string, @Body() dto: UpdateLegendarioDto, @CurrentUser() user: { sub: string }) {
    return { data: await this.legendariosService.update(id, dto, user.sub) };
  }

  @Patch(':id/deactivate')
  @Permissions('legendarios.delete')
  async deactivate(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return { data: await this.legendariosService.deactivate(id, user.sub) };
  }

  @Patch(':id/restore')
  @Permissions('legendarios.restore')
  async restore(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return { data: await this.legendariosService.restore(id, user.sub) };
  }

  @Delete(':id')
  @Permissions('legendarios.delete')
  async delete(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return { data: await this.legendariosService.deactivate(id, user.sub) };
  }
}
