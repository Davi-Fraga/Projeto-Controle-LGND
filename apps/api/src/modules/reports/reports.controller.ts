import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('legendarios') @Permissions('reports.read') legendarios(@Query() query: PaginationDto) { return this.reports.legendarios(query); }
  @Get('legendarios/by-city') @Permissions('reports.read') async byCity() { return { data: await this.reports.byCity() }; }
  @Get('legendarios/by-church') @Permissions('reports.read') async byChurch() { return { data: await this.reports.byChurch() }; }
  @Get('legendarios/by-team') @Permissions('reports.read') async byTeam() { return { data: await this.reports.byTeam() }; }
  @Get('legendarios/by-profession') @Permissions('reports.read') async byProfession() { return { data: await this.reports.byProfession() }; }
  @Get('legendarios/by-expertise') @Permissions('reports.read') async byExpertise() { return { data: await this.reports.byExpertise() }; }
  @Get('legendarios/social-interested') @Permissions('reports.read') async socialInterested() { return { data: await this.reports.socialInterested() }; }
  @Get('tops/:topId/participants') @Permissions('reports.read') async topParticipants(@Param('topId') topId: string) { return { data: await this.reports.topParticipants(topId) }; }
  @Get('tops/:topId/servants') @Permissions('reports.read') async topServants(@Param('topId') topId: string) { return { data: await this.reports.topServants(topId) }; }
  @Get('tops/:topId/families') @Permissions('reports.read') async topFamilies(@Param('topId') topId: string) { return { data: await this.reports.topFamilies(topId) }; }
  @Get('social-actions/:id/participants') @Permissions('reports.read') async socialActionParticipants(@Param('id') id: string) { return { data: await this.reports.socialActionParticipants(id) }; }

  @Get('legendarios/export') @Permissions('reports.export') async exportLegendarios(@Query('format') format: string, @CurrentUser() user: { sub: string }, @Res() res: Response) { this.reports.ensureCsv(format); this.sendCsv(res, 'legendarios.csv', await this.reports.exportLegendarios(user.sub)); }
  @Get('tops/:topId/participants/export') @Permissions('reports.export') async exportTopParticipants(@Param('topId') topId: string, @Query('format') format: string, @CurrentUser() user: { sub: string }, @Res() res: Response) { this.reports.ensureCsv(format); this.sendCsv(res, 'top-participantes.csv', await this.reports.exportTopParticipants(topId, user.sub)); }
  @Get('tops/:topId/servants/export') @Permissions('reports.export') async exportTopServants(@Param('topId') topId: string, @Query('format') format: string, @CurrentUser() user: { sub: string }, @Res() res: Response) { this.reports.ensureCsv(format); this.sendCsv(res, 'top-servos.csv', await this.reports.exportTopServants(topId, user.sub)); }
  @Get('tops/:topId/families/export') @Permissions('reports.export') async exportTopFamilies(@Param('topId') topId: string, @Query('format') format: string, @CurrentUser() user: { sub: string }, @Res() res: Response) { this.reports.ensureCsv(format); this.sendCsv(res, 'top-familias.csv', await this.reports.exportTopFamilies(topId, user.sub)); }
  @Get('social-actions/:id/participants/export') @Permissions('reports.export') async exportSocialActionParticipants(@Param('id') id: string, @Query('format') format: string, @CurrentUser() user: { sub: string }, @Res() res: Response) { this.reports.ensureCsv(format); this.sendCsv(res, 'acao-social-participantes.csv', await this.reports.exportSocialActionParticipants(id, user.sub)); }

  private sendCsv(res: Response, filename: string, csv: string) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
