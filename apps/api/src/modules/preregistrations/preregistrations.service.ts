import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LegendaryStatus, TopEventStatus, TopParticipantStatus, TopParticipantType, TopPreRegistrationStatus } from '@central-da-manada/shared';
import { getPagination, toPaginatedResponse } from '../../common/pagination/pagination.dto';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateLegendarioDto } from '../legendarios/dto/create-legendario.dto';
import { LegendariosService } from '../legendarios/legendarios.service';
import { TopsService } from '../tops/tops.service';
import { WebhookPreRegistrationDto } from './dto/webhook-pre-registration.dto';
import { PreRegistrationQueryDto } from './dto/preregistration-query.dto';
import { ApprovePreRegistrationDto, RejectPreRegistrationDto } from './dto/review-preregistration.dto';

const includeTopEvent = { topEvent: true };

const ACCEPTED_TOP_STATUSES: TopEventStatus[] = [
  TopEventStatus.REGISTRATION_OPEN,
  TopEventStatus.PLANNED,
];

@Injectable()
export class PreRegistrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly legendarios: LegendariosService,
    private readonly tops: TopsService,
  ) {}

  async ingestFromWebhook(topEventId: string, payload: WebhookPreRegistrationDto) {
    const topEvent = await this.prisma.topEvent.findFirst({ where: { id: topEventId, deletedAt: null } });
    if (!topEvent) throw new NotFoundException('TOP event not found.');
    if (!ACCEPTED_TOP_STATUSES.includes(topEvent.status as TopEventStatus)) {
      throw new BadRequestException('TOP event is not open for registrations.');
    }

    const fullName = this.str(payload.fullName);
    if (!fullName) throw new BadRequestException('fullName is required.');
    const email = this.str(payload.email);

    if (email) {
      const existing = await this.prisma.topPreRegistration.findFirst({
        where: { topEventId, email, status: TopPreRegistrationStatus.PENDING, deletedAt: null },
      });
      if (existing) return existing; // dedup: não duplica PENDING com mesmo email no mesmo TOP
    }

    const created = await this.prisma.topPreRegistration.create({
      data: {
        topEventId,
        fullName,
        email,
        phone: this.str(payload.phone),
        city: this.str(payload.city),
        churchName: this.str(payload.churchName),
        rawPayload: payload as any,
        status: TopPreRegistrationStatus.PENDING,
      },
    });

    await this.audit.create({
      entityType: 'TopPreRegistration',
      entityId: created.id,
      action: 'webhook_ingest',
      after: created,
    });

    return created;
  }

  async pendingCountByTopEvent() {
    const grouped = await this.prisma.topPreRegistration.groupBy({
      by: ['topEventId'],
      where: { status: TopPreRegistrationStatus.PENDING, deletedAt: null },
      _count: { _all: true },
    });

    const topEvents = grouped.length
      ? await this.prisma.topEvent.findMany({
          where: { id: { in: grouped.map((g) => g.topEventId) } },
          select: { id: true, name: true, number: true },
        })
      : [];
    const byId = new Map(topEvents.map((t) => [t.id, t]));

    return grouped.map((g) => ({
      topEventId: g.topEventId,
      topEvent: byId.get(g.topEventId) ?? null,
      count: g._count._all,
    }));
  }

  async findAll(query: PreRegistrationQueryDto) {
    const { page, perPage, skip, take } = getPagination(query);
    const where: any = {
      deletedAt: null,
      topEventId: query.topEventId,
      status: query.status,
    };

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.topPreRegistration.findMany({ where, include: includeTopEvent, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.topPreRegistration.count({ where }),
    ]);

    return toPaginatedResponse(items, total, page, perPage);
  }

  async findOne(id: string) {
    const item = await this.prisma.topPreRegistration.findFirst({ where: { id, deletedAt: null }, include: includeTopEvent });
    if (!item) throw new NotFoundException('Pre-registration not found.');

    const legendary = item.legendaryId
      ? await this.prisma.legendary.findUnique({ where: { id: item.legendaryId } })
      : null;

    return { ...item, legendary };
  }

  async approve(topEventId: string, id: string, dto: ApprovePreRegistrationDto, actorUserId: string) {
    const preReg = await this.findExisting(id);
    this.assertBelongsToTop(preReg, topEventId);

    if (preReg.status === TopPreRegistrationStatus.APPROVED) {
      return this.findOne(id);
    }
    if (preReg.status !== TopPreRegistrationStatus.PENDING) {
      throw new BadRequestException('Pre-registration already reviewed.');
    }

    // a) Cria/vincula Legendary (reuso legendarios.service; resolve igreja por nome)
    let legendaryId: string;
    if (dto.legendaryId) {
      const legendary = await this.prisma.legendary.findFirst({ where: { id: dto.legendaryId, deletedAt: null } });
      if (!legendary) throw new BadRequestException('Legendary does not exist.');
      legendaryId = legendary.id;
    } else {
      const churchId = await this.resolveChurchByName(preReg.churchName);
      const created = await this.legendarios.create(this.toLegendarioDto(preReg, churchId), actorUserId);
      legendaryId = created.id;
    }

    // b) Inscreve como participante do TOP (reuso tops.service.addParticipant), idempotente
    await this.ensureParticipant(topEventId, legendaryId, actorUserId);

    // c) Atualiza a pré-inscrição
    const updated = await this.prisma.topPreRegistration.update({
      where: { id },
      data: {
        status: TopPreRegistrationStatus.APPROVED,
        legendaryId,
        reviewedByUserId: actorUserId,
        reviewedAt: new Date(),
        notes: dto.notes?.trim() || preReg.notes,
      },
      include: includeTopEvent,
    });

    await this.audit.create({ actorUserId, entityType: 'TopPreRegistration', entityId: id, action: 'approve', before: preReg, after: updated });
    return updated;
  }

  async reject(topEventId: string, id: string, dto: RejectPreRegistrationDto, actorUserId: string) {
    const preReg = await this.findExisting(id);
    this.assertBelongsToTop(preReg, topEventId);

    if (preReg.status === TopPreRegistrationStatus.REJECTED) {
      return preReg;
    }
    if (preReg.status !== TopPreRegistrationStatus.PENDING) {
      throw new BadRequestException('Pre-registration already reviewed.');
    }

    const updated = await this.prisma.topPreRegistration.update({
      where: { id },
      data: {
        status: TopPreRegistrationStatus.REJECTED,
        reviewedByUserId: actorUserId,
        reviewedAt: new Date(),
        notes: dto.notes?.trim() || preReg.notes,
      },
      include: includeTopEvent,
    });

    await this.audit.create({ actorUserId, entityType: 'TopPreRegistration', entityId: id, action: 'reject', before: preReg, after: updated });
    return updated;
  }

  async remove(id: string, actorUserId: string) {
    const preReg = await this.findExisting(id);

    const updated = await this.prisma.topPreRegistration.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: includeTopEvent,
    });

    await this.audit.create({ actorUserId, entityType: 'TopPreRegistration', entityId: id, action: 'delete', before: preReg, after: updated });
    return updated;
  }

  private async findExisting(id: string) {
    const preReg = await this.prisma.topPreRegistration.findFirst({ where: { id, deletedAt: null } });
    if (!preReg) throw new NotFoundException('Pre-registration not found.');
    return preReg;
  }

  private assertBelongsToTop(preReg: { topEventId: string }, topEventId: string) {
    if (preReg.topEventId !== topEventId) {
      throw new NotFoundException('Pre-registration not found for this TOP.');
    }
  }

  private async resolveChurchByName(name: string | null): Promise<string | undefined> {
    const normalize = (v: string) =>
      v.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
    if (!name?.trim()) return undefined;
    const target = normalize(name);
    const churches = await this.prisma.church.findMany({ where: { deletedAt: null }, select: { id: true, name: true } });
    return churches.find((c) => normalize(c.name) === target)?.id;
  }

  private async ensureParticipant(topEventId: string, legendaryId: string, actorUserId: string) {
    const existing = await this.prisma.topParticipant.findFirst({
      where: { topEventId, legendaryId, deletedAt: null, status: { not: TopParticipantStatus.CANCELLED } },
    });
    if (existing) return existing;
    return this.tops.addParticipant(
      topEventId,
      { legendaryId, type: TopParticipantType.NEW_PARTICIPANT, status: TopParticipantStatus.REGISTERED } as any,
      actorUserId,
    );
  }

  private str(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private toLegendarioDto(
    preReg: { fullName: string; phone: string | null; city: string | null; email: string | null; churchName: string | null },
    churchId?: string,
  ): CreateLegendarioDto {
    const extraNotes = [
      preReg.email ? `Email: ${preReg.email}` : null,
      // Igreja vai para notes só quando NÃO foi possível resolver/vincular pelo nome
      !churchId && preReg.churchName ? `Igreja (informada): ${preReg.churchName}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    return {
      fullName: preReg.fullName,
      phone: preReg.phone ?? undefined,
      city: preReg.city ?? undefined,
      isFromRotaDoCerrado: false,
      churchId,
      servesInChurch: false,
      status: LegendaryStatus.UNKNOWN,
      socialActionInterest: false,
      needsReview: true,
      notes: extraNotes || undefined,
    } as CreateLegendarioDto;
  }
}
