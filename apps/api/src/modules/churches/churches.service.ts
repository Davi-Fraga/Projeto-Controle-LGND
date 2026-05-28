import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateChurchDto } from './dto/create-church.dto';
import { UpdateChurchDto } from './dto/update-church.dto';

@Injectable()
export class ChurchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  findAll() {
    return this.prisma.church.findMany({
      where: { deletedAt: null },
      orderBy: [{ name: 'asc' }, { city: 'asc' }],
    });
  }

  async create(dto: CreateChurchDto, actorUserId?: string) {
    const church = await this.prisma.church.create({
      data: {
        name: dto.name.trim(),
        city: dto.city?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
    });
    await this.audit.create({ actorUserId, entityType: 'Church', entityId: church.id, action: 'create', after: church });
    return church;
  }

  async update(id: string, dto: UpdateChurchDto, actorUserId?: string) {
    const before = await this.prisma.church.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw new NotFoundException('Church not found.');

    const after = await this.prisma.church.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        city: dto.city === null ? null : (dto.city !== undefined ? dto.city.trim() : undefined),
        notes: dto.notes === null ? null : (dto.notes !== undefined ? dto.notes.trim() : undefined),
      },
    });
    await this.audit.create({ actorUserId, entityType: 'Church', entityId: id, action: 'update', before, after });
    return after;
  }
}
