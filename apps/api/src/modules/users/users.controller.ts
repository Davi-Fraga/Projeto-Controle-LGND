import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { SystemRole } from '@central-da-manada/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async me(@CurrentUser() user: { sub: string }) {
    return { data: await this.usersService.findMe(user.sub) };
  }

  @Get()
  @Roles(SystemRole.COORDINATION_ADMIN)
  async findAll(@Query() query: PaginationDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @Roles(SystemRole.COORDINATION_ADMIN)
  async findOne(@Param('id') id: string) {
    return { data: await this.usersService.findOne(id) };
  }

  @Post()
  @Roles(SystemRole.COORDINATION_ADMIN)
  async create(@Body() dto: CreateUserDto) {
    return { data: await this.usersService.create(dto) };
  }

  @Patch(':id')
  @Roles(SystemRole.COORDINATION_ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return { data: await this.usersService.update(id, dto) };
  }

  @Patch(':id/deactivate')
  @Roles(SystemRole.COORDINATION_ADMIN)
  async deactivate(@Param('id') id: string) {
    return { data: await this.usersService.deactivate(id) };
  }
}
