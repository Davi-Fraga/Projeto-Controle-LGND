import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChurchesService } from './churches.service';
import { CreateChurchDto } from './dto/create-church.dto';
import { GeocodeQueryDto } from './dto/geocode-query.dto';
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

  @Get('spiritual-leaders')
  @Permissions('churches.read')
  async spiritualLeaders(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.churchesService.spiritualLeadersView(user) };
  }

  // Rota estática declarada antes de qualquer rota parametrizada (`:id`).
  @Get('geocode')
  @Permissions('churches.read')
  async geocode(@Query() query: GeocodeQueryDto) {
    return { data: await this.churchesService.geocode(query.name, query.city, query.address) };
  }

  // Rota parametrizada declarada após as estáticas (spiritual-leaders, geocode).
  @Get(':id')
  @Permissions('churches.read')
  async findOne(@Param('id') id: string) {
    return { data: await this.churchesService.findOne(id) };
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

  @Delete(':id')
  @Permissions('churches.delete')
  async remove(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return { data: await this.churchesService.remove(id, user.sub) };
  }
}
