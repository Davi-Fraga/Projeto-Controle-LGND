import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateExpertiseDto } from './dto/create-expertise.dto';
import { UpdateExpertiseDto } from './dto/update-expertise.dto';

@Injectable()
export class ExpertisesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  findAll() {
    return this.prisma.expertise.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } });
  }

  async create(dto: CreateExpertiseDto, actorUserId?: string) {
    await this.ensureNameAvailable(dto.name);
    const expertise = await this.prisma.expertise.create({
      data: { name: dto.name.trim(), description: dto.description?.trim() || null },
    });
    await this.audit.create({ actorUserId, entityType: 'Expertise', entityId: expertise.id, action: 'create', after: expertise });
    return expertise;
  }

  async update(id: string, dto: UpdateExpertiseDto, actorUserId?: string) {
    const before = await this.prisma.expertise.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw new NotFoundException('Expertise not found.');
    if (dto.name) await this.ensureNameAvailable(dto.name, id);
    const after = await this.prisma.expertise.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description: dto.description === null ? null : (dto.description !== undefined ? dto.description.trim() : undefined)
      },
    });
    await this.audit.create({ actorUserId, entityType: 'Expertise', entityId: id, action: 'update', before, after });
    return after;
  }

  private async ensureNameAvailable(name: string, currentId?: string) {
    const existing = await this.prisma.expertise.findUnique({ where: { name: name.trim() } });
    if (existing && existing.id !== currentId) throw new BadRequestException('Expertise already exists.');
  }
}
