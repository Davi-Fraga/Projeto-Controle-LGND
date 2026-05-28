import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateProfessionDto } from './dto/create-profession.dto';
import { UpdateProfessionDto } from './dto/update-profession.dto';
import { ProfessionsService } from './professions.service';

@Controller('professions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProfessionsController {
  constructor(private readonly professionsService: ProfessionsService) {}

  @Get()
  @Permissions('professions.read')
  async findAll() {
    return { data: await this.professionsService.findAll() };
  }

  @Post()
  @Permissions('professions.create')
  async create(@Body() dto: CreateProfessionDto, @CurrentUser() user: { sub: string }) {
    return { data: await this.professionsService.create(dto, user.sub) };
  }

  @Patch(':id')
  @Permissions('professions.update')
  async update(@Param('id') id: string, @Body() dto: UpdateProfessionDto, @CurrentUser() user: { sub: string }) {
    return { data: await this.professionsService.update(id, dto, user.sub) };
  }
}
