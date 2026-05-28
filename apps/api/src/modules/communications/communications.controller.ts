import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommunicationsService } from './communications.service';
import { CommunicationsQueryDto, CreateCommunicationDto, UpdateCommunicationDto } from './dto/communications.dto';

@Controller('communications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CommunicationsController {
  constructor(private readonly communications: CommunicationsService) {}

  @Get() @Permissions('communications.read') findAll(@Query() query: CommunicationsQueryDto) { return this.communications.findAll(query); }
  @Get(':id') @Permissions('communications.read') async findOne(@Param('id') id: string) { return { data: await this.communications.findOne(id) }; }
  @Post() @Permissions('communications.create') async create(@Body() dto: CreateCommunicationDto, @CurrentUser() user: { sub: string }) { return { data: await this.communications.create(dto, user.sub) }; }
  @Patch(':id') @Permissions('communications.update') async update(@Param('id') id: string, @Body() dto: UpdateCommunicationDto, @CurrentUser() user: { sub: string }) { return { data: await this.communications.update(id, dto, user.sub) }; }
  @Post(':id/send') @Permissions('communications.send') async send(@Param('id') id: string, @CurrentUser() user: { sub: string }) { return { data: await this.communications.send(id, user.sub) }; }
  @Patch(':id/cancel') @Permissions('communications.update') async cancel(@Param('id') id: string, @CurrentUser() user: { sub: string }) { return { data: await this.communications.cancel(id, user.sub) }; }
  @Delete(':id') @Permissions('communications.delete') async delete(@Param('id') id: string, @CurrentUser() user: { sub: string }) { return { data: await this.communications.delete(id, user.sub) }; }
  @Get(':id/recipients') @Permissions('communications.recipients.read') async recipients(@Param('id') id: string) { return { data: await this.communications.recipients(id) }; }
  @Patch(':id/recipients/:recipientId/read') @Permissions('communications.recipients.update') async read(@Param('id') id: string, @Param('recipientId') recipientId: string, @CurrentUser() user: { sub: string }) { return { data: await this.communications.markRead(id, recipientId, user.sub) }; }
  @Patch(':id/recipients/:recipientId/confirm') @Permissions('communications.recipients.update') async confirm(@Param('id') id: string, @Param('recipientId') recipientId: string, @CurrentUser() user: { sub: string }) { return { data: await this.communications.confirm(id, recipientId, user.sub) }; }
}
