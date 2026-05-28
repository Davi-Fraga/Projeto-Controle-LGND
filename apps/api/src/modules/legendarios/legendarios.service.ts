import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LegendaryHistoryType, LegendaryStatus } from '@central-da-manada/shared';
import { getPagination, toPaginatedResponse } from '../../common/pagination/pagination.dto';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateLegendarioDto } from './dto/create-legendario.dto';
import { LegendarioQueryDto } from './dto/legendario-query.dto';
import { CreateLegendaryHistoryNoteDto, LegendaryHistoryQueryDto } from './dto/legendary-history.dto';
import { UpdateLegendarioDto } from './dto/update-legendario.dto';

const includeLegendario = {
  church: true,
  profession: true,
  expertises: {
    include: {
      expertise: true,
    },
  },
};

@Injectable()
export class LegendariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(query: LegendarioQueryDto) {
    const { page, perPage, skip, take } = getPagination(query);
    const where: any = {
      deletedAt: null,
      status: query.status,
      city: query.city ? { contains: query.city, mode: 'insensitive' } : undefined,
      churchId: query.churchId,
      professionId: query.professionId,
      socialActionInterest: query.socialActionInterest,
      isFromRotaDoCerrado: query.isFromRotaDoCerrado,
      expertises: query.expertiseId
        ? { some: { expertiseId: query.expertiseId } }
        : undefined,
    };

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { lgndNumber: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: this.normalizePhone(query.search), mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy = { [query.orderBy ?? 'fullName']: query.orderDirection ?? 'asc' };
    const [items, total] = await Promise.all([
      this.prisma.legendary.findMany({ where, include: includeLegendario, orderBy, skip, take }),
      this.prisma.legendary.count({ where }),
    ]);

    return toPaginatedResponse(items.map((item: any) => this.toResponse(item)), total, page, perPage);
  }

  async findOne(id: string) {
    const legendario = await this.prisma.legendary.findFirst({
      where: { id, deletedAt: null },
      include: includeLegendario,
    });

    if (!legendario) {
      throw new NotFoundException('Legendario not found.');
    }

    return this.toResponse(legendario);
  }

  async create(dto: CreateLegendarioDto, actorUserId?: string) {
    await this.validateRelations(dto);
    await this.ensureLgndIsAvailable(dto.lgndNumber);

    const legendario = await this.prisma.legendary.create({
      data: {
        ...this.toData(dto),
        expertises: {
          create: (dto.expertiseIds ?? []).map((expertiseId) => ({ expertiseId })),
        },
      },
      include: includeLegendario,
    });

    await this.audit.create({
      actorUserId,
      entityType: 'Legendary',
      entityId: legendario.id,
      action: 'create',
      after: this.toResponse(legendario),
    });
    await this.createHistory(legendario.id, LegendaryHistoryType.LEGENDARY_CREATED, 'Legendario criado', 'Cadastro do Legendario criado.', actorUserId);

    return this.toResponse(legendario);
  }

  async update(id: string, dto: UpdateLegendarioDto, actorUserId?: string) {
    const before = await this.prisma.legendary.findFirst({
      where: { id, deletedAt: null },
      include: includeLegendario,
    });

    if (!before) {
      throw new NotFoundException('Legendario not found.');
    }

    await this.validateRelations(dto);
    await this.ensureLgndIsAvailable(dto.lgndNumber, id);

    const after = await this.prisma.$transaction(async (tx: any) => {
      if (dto.expertiseIds) {
        await tx.legendaryExpertise.deleteMany({ where: { legendaryId: id } });
      }

      return tx.legendary.update({
        where: { id },
        data: {
          ...this.toData(dto),
          expertises: dto.expertiseIds
            ? {
                create: dto.expertiseIds.map((expertiseId) => ({ expertiseId })),
              }
            : undefined,
        },
        include: includeLegendario,
      });
    });

    await this.audit.create({
      actorUserId,
      entityType: 'Legendary',
      entityId: id,
      action: 'update',
      before: this.toResponse(before),
      after: this.toResponse(after),
    });
    await this.createHistory(id, LegendaryHistoryType.LEGENDARY_UPDATED, 'Legendario atualizado', 'Cadastro do Legendario atualizado.', actorUserId);

    if (dto.expertiseIds) {
      await this.audit.create({
        actorUserId,
        entityType: 'Legendary',
        entityId: id,
        action: 'update_expertises',
        before: this.toResponse(before).expertises,
        after: this.toResponse(after).expertises,
      });
    }

    return this.toResponse(after);
  }

  async findHistory(id: string, query: LegendaryHistoryQueryDto) {
    await this.findOne(id);
    return this.prisma.legendaryHistory.findMany({
      where: { legendaryId: id, type: query.type },
      include: {
        topEvent: true,
        team: true,
        topFamily: true,
        actor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { occurredAt: 'desc' },
    });
  }

  async addHistoryNote(id: string, dto: CreateLegendaryHistoryNoteDto, actorUserId?: string) {
    await this.findOne(id);
    return this.prisma.legendaryHistory.create({
      data: {
        legendaryId: id,
        type: LegendaryHistoryType.MANUAL_NOTE,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        actorUserId,
      },
      include: {
        topEvent: true,
        team: true,
        topFamily: true,
        actor: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async deactivate(id: string, actorUserId?: string) {
    const before = await this.findExistingWithDeleted(id);
    const after = await this.prisma.legendary.update({
      where: { id },
      data: { deletedAt: new Date(), status: LegendaryStatus.INACTIVE },
      include: includeLegendario,
    });

    await this.audit.create({
      actorUserId,
      entityType: 'Legendary',
      entityId: id,
      action: 'deactivate',
      before: this.toResponse(before),
      after: this.toResponse(after),
    });

    return this.toResponse(after);
  }

  async restore(id: string, actorUserId?: string) {
    const before = await this.findExistingWithDeleted(id);
    const after = await this.prisma.legendary.update({
      where: { id },
      data: { deletedAt: null },
      include: includeLegendario,
    });

    await this.audit.create({
      actorUserId,
      entityType: 'Legendary',
      entityId: id,
      action: 'restore',
      before: this.toResponse(before),
      after: this.toResponse(after),
    });

    return this.toResponse(after);
  }

  private async validateRelations(dto: Partial<CreateLegendarioDto>) {
    if (dto.churchId) {
      const church = await this.prisma.church.findFirst({ where: { id: dto.churchId, deletedAt: null } });
      if (!church) throw new BadRequestException('Church does not exist.');
    }

    if (dto.professionId) {
      const profession = await this.prisma.profession.findFirst({
        where: { id: dto.professionId, deletedAt: null },
      });
      if (!profession) throw new BadRequestException('Profession does not exist.');
    }

    if (dto.expertiseIds?.length) {
      const uniqueIds = Array.from(new Set(dto.expertiseIds));
      const count = await this.prisma.expertise.count({
        where: { id: { in: uniqueIds }, deletedAt: null },
      });
      if (count !== uniqueIds.length) throw new BadRequestException('One or more expertises do not exist.');
    }
  }

  private async ensureLgndIsAvailable(lgndNumber?: string, currentId?: string) {
    if (!lgndNumber) return;
    const existing = await this.prisma.legendary.findUnique({ where: { lgndNumber } });
    if (existing && existing.id !== currentId) {
      throw new BadRequestException('LGND number already in use.');
    }
  }

  private async findExistingWithDeleted(id: string) {
    const legendario = await this.prisma.legendary.findUnique({ where: { id }, include: includeLegendario });
    if (!legendario) throw new NotFoundException('Legendario not found.');
    return legendario;
  }

  private toData(dto: Partial<CreateLegendarioDto>) {
    const data: any = {};
    if ('fullName' in dto) data.fullName = dto.fullName?.trim();
    if ('lgndNumber' in dto) data.lgndNumber = dto.lgndNumber?.trim() || null;
    if ('phone' in dto) data.phone = dto.phone ? this.normalizePhone(dto.phone) : null;
    if ('city' in dto) data.city = dto.city?.trim() || null;
    if ('isFromRotaDoCerrado' in dto) data.isFromRotaDoCerrado = dto.isFromRotaDoCerrado;
    if ('churchId' in dto) data.churchId = dto.churchId || null;
    if ('servesInChurch' in dto) data.servesInChurch = dto.servesInChurch;
    if ('churchRole' in dto) data.churchRole = dto.churchRole?.trim() || null;
    if ('professionId' in dto) data.professionId = dto.professionId || null;
    if ('status' in dto) data.status = dto.status;
    if ('socialActionInterest' in dto) data.socialActionInterest = dto.socialActionInterest;
    if ('notes' in dto) data.notes = dto.notes?.trim() || null;
    return data;
  }

  private normalizePhone(phone: string) {
    return phone.replace(/\D/g, '');
  }

  private toResponse(legendario: any) {
    return {
      ...legendario,
      expertises: (legendario.expertises ?? []).map((item: any) => item.expertise),
    };
  }

  private async createHistory(legendaryId: string, type: LegendaryHistoryType, title: string, description: string, actorUserId?: string) {
    if (!this.prisma.legendaryHistory) return;
    await this.prisma.legendaryHistory.create({ data: { legendaryId, type, title, description, actorUserId } });
  }
}
