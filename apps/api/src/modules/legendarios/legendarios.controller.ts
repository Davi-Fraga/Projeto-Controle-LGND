import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { AnyPermissions, Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { OptionsQueryDto } from '../../common/options/options-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateLegendarioDto } from './dto/create-legendario.dto';
import { LegendarioQueryDto } from './dto/legendario-query.dto';
import { CreateLegendaryHistoryNoteDto, LegendaryHistoryQueryDto } from './dto/legendary-history.dto';
import { UpdateLegendarioDto } from './dto/update-legendario.dto';
import { LegendariosService } from './legendarios.service';

/**
 * Permissions que autorizam a BUSCA mínima de Legendários (`GET /legendarios/options`).
 *
 * O inventário da change classificou os formulários de dirigente como caso B ("`@AnyPermissions`
 * no endpoint existente"), cada um com seu próprio `anyOf`. Na implementação eles COLAPSAM numa
 * lista só: todos consomem o mesmo `LegendarioCombobox` → o mesmo endpoint. Um endpoint tem um
 * decorator; não há `anyOf` por consumidor. Portanto o efeito real é a UNIÃO abaixo — quem pode
 * criar/editar o recurso-pai pode pesquisar o diretório mínimo de Legendários dentro do seu
 * escopo (`AccessPolicyService`), com projeção sem PII.
 *
 * A varredura dos 13 consumidores do combobox achou 3 campos de dirigente que a tabela do
 * inventário não listava, todos com a mesma natureza: `social-action-form` (Responsável),
 * `church-form` (Legendário vinculado à igreja) e `communication-form` (destinatário quando o
 * alvo é uma pessoa). Sem eles, a permission da operação continuaria valendo nada no seletor.
 *
 * Isso NÃO amplia acesso a detalhe: `GET /legendarios/:id` continua exigindo
 * `legendarios.read` ou `teams.members.read`.
 *
 * Formulários de CANDIDATOS (adicionar membro/participante/servo) não entram aqui — eles têm
 * endpoint contextual próprio sob o recurso-pai.
 */
export const LEGENDARY_OPTIONS_PERMISSIONS = [
  'legendarios.read',
  'tops.create',
  'tops.update',
  'tops.teams.add',
  'tops.teams.update',
  'tops.families.create',
  'tops.families.update',
  'teams.create',
  'teams.update',
  'social-actions.create',
  'social-actions.update',
  'churches.create',
  'churches.update',
  'communications.create',
  'communications.update',
] as const;

@Controller('legendarios')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LegendariosController {
  constructor(private readonly legendariosService: LegendariosService) {}

  @Get()
  @Permissions('legendarios.read')
  findAll(@Query() query: LegendarioQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.legendariosService.findAll(query, user);
  }

  @Get('options')
  @AnyPermissions(...LEGENDARY_OPTIONS_PERMISSIONS)
  async options(@Query() query: OptionsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.legendariosService.options(query, user) };
  }

  @Get(':id')
  @AnyPermissions('legendarios.read', 'teams.members.read')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.legendariosService.findOne(id, user) };
  }

  @Get(':id/history')
  @Permissions('legendarios.history.read')
  async history(@Param('id') id: string, @Query() query: LegendaryHistoryQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.legendariosService.findHistory(id, query, user) };
  }

  @Post(':id/history')
  @Permissions('legendarios.history.create')
  async addHistoryNote(@Param('id') id: string, @Body() dto: CreateLegendaryHistoryNoteDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.legendariosService.addHistoryNote(id, dto, user) };
  }

  @Post()
  @Permissions('legendarios.create')
  async create(@Body() dto: CreateLegendarioDto, @CurrentUser() user: { sub: string }) {
    return { data: await this.legendariosService.create(dto, user.sub) };
  }

  @Patch(':id')
  @AnyPermissions('legendarios.update', 'organogram.person.edit')
  async update(@Param('id') id: string, @Body() dto: UpdateLegendarioDto, @CurrentUser() user: AuthenticatedUser) {
    await this.legendariosService.findOne(id, user);
    return { data: await this.legendariosService.update(id, dto, user.sub) };
  }

  @Patch(':id/deactivate')
  @Permissions('legendarios.delete')
  async deactivate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.legendariosService.deactivate(id, user) };
  }

  @Patch(':id/restore')
  @Permissions('legendarios.restore')
  async restore(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.legendariosService.restore(id, user) };
  }

  @Delete(':id')
  @Permissions('legendarios.delete')
  async delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.legendariosService.deactivate(id, user) };
  }
}
