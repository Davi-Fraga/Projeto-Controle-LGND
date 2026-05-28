import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateExpertiseDto } from './dto/create-expertise.dto';
import { UpdateExpertiseDto } from './dto/update-expertise.dto';
import { ExpertisesService } from './expertises.service';

@Controller('expertises')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExpertisesController {
  constructor(private readonly expertisesService: ExpertisesService) {}

  @Get()
  @Permissions('expertises.read')
  async findAll() {
    return { data: await this.expertisesService.findAll() };
  }

  @Post()
  @Permissions('expertises.create')
  async create(@Body() dto: CreateExpertiseDto, @CurrentUser() user: { sub: string }) {
    return { data: await this.expertisesService.create(dto, user.sub) };
  }

  @Patch(':id')
  @Permissions('expertises.update')
  async update(@Param('id') id: string, @Body() dto: UpdateExpertiseDto, @CurrentUser() user: { sub: string }) {
    return { data: await this.expertisesService.update(id, dto, user.sub) };
  }
}
