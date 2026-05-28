import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChurchesService } from './churches.service';
import { CreateChurchDto } from './dto/create-church.dto';
import { UpdateChurchDto } from './dto/update-church.dto';

@Controller('churches')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ChurchesController {
  constructor(private readonly churchesService: ChurchesService) {}

  @Get()
  @Permissions('churches.read')
  async findAll() {
    return { data: await this.churchesService.findAll() };
  }

  @Post()
  @Permissions('churches.create')
  async create(@Body() dto: CreateChurchDto, @CurrentUser() user: { sub: string }) {
    return { data: await this.churchesService.create(dto, user.sub) };
  }

  @Patch(':id')
  @Permissions('churches.update')
  async update(@Param('id') id: string, @Body() dto: UpdateChurchDto, @CurrentUser() user: { sub: string }) {
    return { data: await this.churchesService.update(id, dto, user.sub) };
  }
}
