import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('legendarios') @Permissions('reports.read') legendarios(@Query() query: PaginationDto, @CurrentUser() user: AuthenticatedUser) { return this.reports.legendarios(query, user); }
  @Get('legendarios/by-city') @Permissions('reports.read') async byCity(@CurrentUser() user: AuthenticatedUser) { return { data: await this.reports.byCity(user) }; }
  @Get('legendarios/by-church') @Permissions('reports.read') async byChurch(@CurrentUser() user: AuthenticatedUser) { return { data: await this.reports.byChurch(user) }; }
  @Get('legendarios/by-team') @Permissions('reports.read') async byTeam(@CurrentUser() user: AuthenticatedUser) { return { data: await this.reports.byTeam(user) }; }
  @Get('legendarios/by-profession') @Permissions('reports.read') async byProfession(@CurrentUser() user: AuthenticatedUser) { return { data: await this.reports.byProfession(user) }; }
  @Get('legendarios/by-expertise') @Permissions('reports.read') async byExpertise(@CurrentUser() user: AuthenticatedUser) { return { data: await this.reports.byExpertise(user) }; }
  @Get('legendarios/social-interested') @Permissions('reports.read') async socialInterested(@CurrentUser() user: AuthenticatedUser) { return { data: await this.reports.socialInterested(user) }; }
  @Get('pending-review') @Permissions('reports.read') async pendingReview(@CurrentUser() user: AuthenticatedUser) { return { data: await this.reports.pendingReview(user) }; }
  @Get('tops/:topId/participants') @Permissions('reports.read') async topParticipants(@Param('topId') topId: string, @CurrentUser() user: AuthenticatedUser) { return { data: await this.reports.topParticipants(topId, user) }; }
  @Get('tops/:topId/servants') @Permissions('reports.read') async topServants(@Param('topId') topId: string, @CurrentUser() user: AuthenticatedUser) { return { data: await this.reports.topServants(topId, user) }; }
  @Get('tops/:topId/families') @Permissions('reports.read') async topFamilies(@Param('topId') topId: string, @CurrentUser() user: AuthenticatedUser) { return { data: await this.reports.topFamilies(topId, user) }; }
  @Get('social-actions/:id/participants') @Permissions('reports.read') async socialActionParticipants(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return { data: await this.reports.socialActionParticipants(id, user) }; }

  @Get('legendarios/export') @Permissions('reports.export') async exportLegendarios(@Query('format') format: string, @CurrentUser() user: AuthenticatedUser, @Res() res: Response) { this.reports.ensureCsv(format); this.sendCsv(res, 'legendarios.csv', await this.reports.exportLegendarios(user, user.sub)); }
  @Get('tops/:topId/participants/export') @Permissions('reports.export') async exportTopParticipants(@Param('topId') topId: string, @Query('format') format: string, @CurrentUser() user: AuthenticatedUser, @Res() res: Response) { this.reports.ensureCsv(format); this.sendCsv(res, 'top-participantes.csv', await this.reports.exportTopParticipants(topId, user)); }
  @Get('tops/:topId/servants/export') @Permissions('reports.export') async exportTopServants(@Param('topId') topId: string, @Query('format') format: string, @CurrentUser() user: AuthenticatedUser, @Res() res: Response) { this.reports.ensureCsv(format); this.sendCsv(res, 'top-servos.csv', await this.reports.exportTopServants(topId, user)); }
  @Get('tops/:topId/families/export') @Permissions('reports.export') async exportTopFamilies(@Param('topId') topId: string, @Query('format') format: string, @CurrentUser() user: AuthenticatedUser, @Res() res: Response) { this.reports.ensureCsv(format); this.sendCsv(res, 'top-familias.csv', await this.reports.exportTopFamilies(topId, user)); }
  @Get('social-actions/:id/participants/export') @Permissions('reports.export') async exportSocialActionParticipants(@Param('id') id: string, @Query('format') format: string, @CurrentUser() user: AuthenticatedUser, @Res() res: Response) { this.reports.ensureCsv(format); this.sendCsv(res, 'acao-social-participantes.csv', await this.reports.exportSocialActionParticipants(id, user)); }

  private sendCsv(res: Response, filename: string, csv: string) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
