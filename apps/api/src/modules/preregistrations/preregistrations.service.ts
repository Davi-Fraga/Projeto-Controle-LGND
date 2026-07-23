import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LegendaryStatus, TopEventStatus, TopParticipantStatus, TopParticipantType, TopPreRegistrationStatus } from '@central-da-manada/shared';
import { getPagination, toPaginatedResponse } from '../../common/pagination/pagination.dto';
import { AccessPolicyService, AccessScope } from '../../common/access/access-policy.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
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
    private readonly accessPolicy: AccessPolicyService,
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

  async pendingCountByTopEvent(user: AuthenticatedUser) {
    const scope = await this.accessPolicy.resolveScope(user);
    const grouped = await this.prisma.topPreRegistration.groupBy({
      by: ['topEventId'],
      where: {
        status: TopPreRegistrationStatus.PENDING,
        deletedAt: null,
        topEvent: this.scopedTopRelation(scope),
      },
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

  async findAll(query: PreRegistrationQueryDto, user: AuthenticatedUser) {
    const { page, perPage, skip, take } = getPagination(query);
    const scope = await this.accessPolicy.resolveScope(user);
    if (query.topEventId) {
      this.assertTopVisible(scope, query.topEventId);
    }
    const where: any = {
      deletedAt: null,
      topEventId: query.topEventId,
      status: query.status,
      topEvent: this.scopedTopRelation(scope),
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

  async findOne(id: string, user: AuthenticatedUser) {
    const item = await this.findExistingForUser(id, user, true);

    const legendary = item.legendaryId
      ? await this.prisma.legendary.findUnique({ where: { id: item.legendaryId } })
      : null;

    return { ...item, legendary };
  }

  async approve(topEventId: string, id: string, dto: ApprovePreRegistrationDto, user: AuthenticatedUser) {
    const scope = await this.accessPolicy.resolveScope(user);
    this.assertTopVisible(scope, topEventId);
    const preReg = await this.findExisting(id);
    this.assertBelongsToTop(preReg, topEventId);

    if (preReg.status === TopPreRegistrationStatus.APPROVED) {
      return this.findOne(id, user);
    }
    if (preReg.status !== TopPreRegistrationStatus.PENDING) {
      throw new BadRequestException('Pre-registration already reviewed.');
    }

    // Validações/leituras fora da transação (não escrevem)
    let providedLegendaryId: string | undefined;
    let churchId: string | undefined;
    if (dto.legendaryId) {
      const legendary = await this.prisma.legendary.findFirst({ where: { id: dto.legendaryId, deletedAt: null } });
      if (!legendary) throw new BadRequestException('Legendary does not exist.');
      providedLegendaryId = legendary.id;
    } else {
      churchId = await this.resolveChurchByName(preReg.churchName);
    }

    // Tudo que escreve roda numa única transação: Legendary + participante + update.
    // Se qualquer passo falhar, nada é persistido (sem Legendário órfão).
    return this.prisma.$transaction(async (tx) => {
      // a) Cria/vincula Legendary (reuso legendarios.service com o cliente da transação)
      let legendaryId: string;
      if (providedLegendaryId) {
        legendaryId = providedLegendaryId;
      } else {
        const created = await this.legendarios.create(this.toLegendarioDto(preReg, churchId), user.sub, tx);
        legendaryId = created.id;
      }

      // b) Inscreve como participante do TOP (reuso tops.service.addParticipant), idempotente
      await this.ensureParticipant(topEventId, legendaryId, user.sub, tx);

      // c) Atualiza a pré-inscrição
      const updated = await tx.topPreRegistration.update({
        where: { id },
        data: {
          status: TopPreRegistrationStatus.APPROVED,
          legendaryId,
          reviewedByUserId: user.sub,
          reviewedAt: new Date(),
          notes: dto.notes?.trim() || preReg.notes,
        },
        include: includeTopEvent,
      });

      await this.audit.create({ actorUserId: user.sub, entityType: 'TopPreRegistration', entityId: id, action: 'approve', before: preReg, after: updated }, tx);
      return updated;
    });
  }

  async reject(topEventId: string, id: string, dto: RejectPreRegistrationDto, user: AuthenticatedUser) {
    const scope = await this.accessPolicy.resolveScope(user);
    this.assertTopVisible(scope, topEventId);
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
        reviewedByUserId: user.sub,
        reviewedAt: new Date(),
        notes: dto.notes?.trim() || preReg.notes,
      },
      include: includeTopEvent,
    });

    await this.audit.create({ actorUserId: user.sub, entityType: 'TopPreRegistration', entityId: id, action: 'reject', before: preReg, after: updated });
    return updated;
  }

  async remove(id: string, user: AuthenticatedUser) {
    const preReg = await this.findExistingForUser(id, user);

    const updated = await this.prisma.topPreRegistration.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: includeTopEvent,
    });

    await this.audit.create({ actorUserId: user.sub, entityType: 'TopPreRegistration', entityId: id, action: 'delete', before: preReg, after: updated });
    return updated;
  }

  private async findExistingForUser(id: string, user: AuthenticatedUser, withTopEvent = false) {
    const scope = await this.accessPolicy.resolveScope(user);
    const preReg = await this.prisma.topPreRegistration.findFirst({
      where: {
        id,
        deletedAt: null,
        topEvent: this.scopedTopRelation(scope),
      },
      ...(withTopEvent ? { include: includeTopEvent } : {}),
    });
    if (!preReg) throw new NotFoundException('Pre-registration not found.');
    return preReg;
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

  private scopedTopRelation(scope: AccessScope) {
    return {
      deletedAt: null,
      ...this.accessPolicy.buildTopWhere(scope),
    };
  }

  private assertTopVisible(scope: AccessScope, topEventId: string) {
    try {
      this.accessPolicy.assertTopAllowed(scope, topEventId);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw new NotFoundException('TOP event not found.');
      }
      throw error;
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

  private async ensureParticipant(topEventId: string, legendaryId: string, actorUserId: string, db: Prisma.TransactionClient = this.prisma) {
    const existing = await db.topParticipant.findFirst({
      where: { topEventId, legendaryId, deletedAt: null, status: { not: TopParticipantStatus.CANCELLED } },
    });
    if (existing) return existing;
    return this.tops.addParticipant(
      topEventId,
      { legendaryId, type: TopParticipantType.NEW_PARTICIPANT, status: TopParticipantStatus.REGISTERED } as any,
      actorUserId,
      db,
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
