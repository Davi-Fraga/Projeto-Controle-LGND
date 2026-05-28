import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateProfessionDto } from './dto/create-profession.dto';
import { UpdateProfessionDto } from './dto/update-profession.dto';

@Injectable()
export class ProfessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  findAll() {
    return this.prisma.profession.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } });
  }

  async create(dto: CreateProfessionDto, actorUserId?: string) {
    await this.ensureNameAvailable(dto.name);
    const profession = await this.prisma.profession.create({ data: { name: dto.name.trim() } });
    await this.audit.create({ actorUserId, entityType: 'Profession', entityId: profession.id, action: 'create', after: profession });
    return profession;
  }

  async update(id: string, dto: UpdateProfessionDto, actorUserId?: string) {
    const before = await this.prisma.profession.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw new NotFoundException('Profession not found.');
    if (dto.name) await this.ensureNameAvailable(dto.name, id);
    const after = await this.prisma.profession.update({ where: { id }, data: { name: dto.name?.trim() } });
    await this.audit.create({ actorUserId, entityType: 'Profession', entityId: id, action: 'update', before, after });
    return after;
  }

  private async ensureNameAvailable(name: string, currentId?: string) {
    const existing = await this.prisma.profession.findUnique({ where: { name: name.trim() } });
    if (existing && existing.id !== currentId) throw new BadRequestException('Profession already exists.');
  }
}
