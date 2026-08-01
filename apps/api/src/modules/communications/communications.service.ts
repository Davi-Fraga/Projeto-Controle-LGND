import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InternalMessageStatus, InternalMessageTargetType, LegendaryStatus, MessageRecipientStatus } from '@central-da-manada/shared';
import { LEGENDARY_RELATION } from '../../common/access/legendary-relation.select';
import { getPagination, toPaginatedResponse } from '../../common/pagination/pagination.dto';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CommunicationsQueryDto, CreateCommunicationDto, UpdateCommunicationDto } from './dto/communications.dto';

const includeMessage = {
  topEvent: true,
  createdBy: { select: { id: true, name: true, email: true } },
  _count: { select: { recipients: true } },
};
const includeRecipient = { legendary: LEGENDARY_RELATION, user: { select: { id: true, name: true, email: true } } };

@Injectable()
export class CommunicationsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async findAll(query: CommunicationsQueryDto) {
    const { page, perPage, skip, take } = getPagination(query);
    const where: any = { deletedAt: null, status: query.status };
    if (query.search) where.OR = [{ title: { contains: query.search, mode: 'insensitive' } }, { body: { contains: query.search, mode: 'insensitive' } }];
    const [items, total] = await Promise.all([
      this.prisma.internalMessage.findMany({ where, include: includeMessage, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.internalMessage.count({ where }),
    ]);
    return toPaginatedResponse(items.map((item: any) => this.toMessageResponse(item)), total, page, perPage);
  }

  async findOne(id: string) {
    const message = await this.prisma.internalMessage.findFirst({ where: { id, deletedAt: null }, include: includeMessage });
    if (!message) throw new NotFoundException('Communication not found.');
    return this.toMessageResponse(message);
  }

  async create(dto: CreateCommunicationDto, actorUserId: string) {
    await this.validateTarget(dto);
    const message = await this.prisma.internalMessage.create({ data: this.toMessageData(dto, actorUserId), include: includeMessage });
    await this.audit.create({ actorUserId, entityType: 'InternalMessage', entityId: message.id, action: 'create', after: this.toMessageResponse(message) });
    return this.toMessageResponse(message);
  }

  async update(id: string, dto: UpdateCommunicationDto, actorUserId: string) {
    const before = await this.findExistingDraftOrSent(id);
    if (before.status === InternalMessageStatus.SENT) throw new BadRequestException('Sent communications cannot be edited.');
    await this.validateTarget({ ...before, ...dto } as any);
    const after = await this.prisma.internalMessage.update({ where: { id }, data: this.toMessageData(dto), include: includeMessage });
    await this.audit.create({ actorUserId, entityType: 'InternalMessage', entityId: id, action: 'update', before: this.toMessageResponse(before), after: this.toMessageResponse(after) });
    return this.toMessageResponse(after);
  }

  async send(id: string, actorUserId: string) {
    const before = await this.findExistingDraftOrSent(id);
    if (before.status !== InternalMessageStatus.DRAFT) throw new BadRequestException('Only drafts can be sent.');
    const recipients = await this.resolveRecipients(before);
    if (!recipients.length) throw new BadRequestException('No recipients found for this target.');
    const after = await this.prisma.$transaction(async (tx: any) => {
      await tx.messageRecipient.createMany({
        data: recipients.map((recipient) => ({
          messageId: id,
          legendaryId: recipient.legendaryId,
          userId: recipient.userId ?? null,
        })),
        skipDuplicates: true,
      });
      return tx.internalMessage.update({ where: { id }, data: { status: InternalMessageStatus.SENT, sentAt: new Date() }, include: includeMessage });
    });
    await this.audit.create({ actorUserId, entityType: 'InternalMessage', entityId: id, action: 'send', before: this.toMessageResponse(before), after: this.toMessageResponse(after) });
    return this.toMessageResponse(after);
  }

  async cancel(id: string, actorUserId: string) {
    const before = await this.findExistingDraftOrSent(id);
    const after = await this.prisma.internalMessage.update({ where: { id }, data: { status: InternalMessageStatus.CANCELLED }, include: includeMessage });
    await this.audit.create({ actorUserId, entityType: 'InternalMessage', entityId: id, action: 'cancel', before: this.toMessageResponse(before), after: this.toMessageResponse(after) });
    return this.toMessageResponse(after);
  }

  async delete(id: string, actorUserId: string) {
    const before = await this.findExistingDraftOrSent(id);
    const after = await this.prisma.internalMessage.update({ where: { id }, data: { deletedAt: new Date(), status: InternalMessageStatus.CANCELLED }, include: includeMessage });
    await this.audit.create({ actorUserId, entityType: 'InternalMessage', entityId: id, action: 'delete', before: this.toMessageResponse(before), after: this.toMessageResponse(after) });
    return this.toMessageResponse(after);
  }

  async recipients(id: string) {
    await this.findOne(id);
    return this.prisma.messageRecipient.findMany({ where: { messageId: id }, include: includeRecipient, orderBy: { createdAt: 'asc' } });
  }

  async markRead(id: string, recipientId: string, actorUserId: string) {
    const before = await this.findRecipient(id, recipientId);
    const after = await this.prisma.messageRecipient.update({ where: { id: recipientId }, data: { status: before.status === MessageRecipientStatus.CONFIRMED ? MessageRecipientStatus.CONFIRMED : MessageRecipientStatus.READ, readAt: before.readAt ?? new Date() }, include: includeRecipient });
    await this.audit.create({ actorUserId, entityType: 'MessageRecipient', entityId: recipientId, action: 'read', before, after });
    return after;
  }

  async confirm(id: string, recipientId: string, actorUserId: string) {
    const before = await this.findRecipient(id, recipientId);
    const after = await this.prisma.messageRecipient.update({ where: { id: recipientId }, data: { status: MessageRecipientStatus.CONFIRMED, readAt: before.readAt ?? new Date(), confirmedAt: before.confirmedAt ?? new Date() }, include: includeRecipient });
    await this.audit.create({ actorUserId, entityType: 'MessageRecipient', entityId: recipientId, action: 'confirm', before, after });
    return after;
  }

  private async resolveRecipients(message: any) {
    const select = { id: true, status: true, deletedAt: true, user: { select: { id: true } } };
    let items: any[] = [];
    if (message.targetType === InternalMessageTargetType.ALL_ACTIVE_LEGENDARIES) {
      items = await this.prisma.legendary.findMany({ where: { deletedAt: null, status: LegendaryStatus.ACTIVE }, select });
    } else if (message.targetType === InternalMessageTargetType.LEGENDARY) {
      items = await this.prisma.legendary.findMany({ where: { id: message.targetId, deletedAt: null }, select });
    } else if (message.targetType === InternalMessageTargetType.TEAM) {
      const memberships = await this.prisma.teamMembership.findMany({ where: { teamId: message.targetId, deletedAt: null, status: 'ACTIVE', legendary: { deletedAt: null } }, include: { legendary: { select } } });
      items = memberships.map((item: any) => item.legendary);
    } else if (message.targetType === InternalMessageTargetType.TEAM_COORDINATORS) {
      const teams = await this.prisma.team.findMany({ where: { deletedAt: null, status: 'ACTIVE' }, select: { coordinator: { select }, deputyCoordinator: { select } } });
      items = teams.flatMap((team: any) => [team.coordinator, team.deputyCoordinator]).filter(Boolean);
    } else if ([InternalMessageTargetType.TOP_ALL, InternalMessageTargetType.TOP_REPRESENTATIVES, InternalMessageTargetType.TOP_FAMILY_REPRESENTATIVES, InternalMessageTargetType.TOP_FAMILY].includes(message.targetType)) {
      items = await this.resolveTopRecipients(message, select);
    }
    return Array.from(new Map(
      items
        .filter((item: any) => item && item.deletedAt === null && item.status !== LegendaryStatus.INACTIVE)
        .map((legendary: any) => [legendary.id, { legendaryId: legendary.id, userId: legendary.user?.id }])
    ).values());
  }

  private async resolveTopRecipients(message: any, select: any) {
    if (message.targetType === InternalMessageTargetType.TOP_ALL) {
      const [participants, servants] = await Promise.all([
        this.prisma.topParticipant.findMany({ where: { topEventId: message.topEventId, deletedAt: null, status: { not: 'CANCELLED' }, legendary: { deletedAt: null } }, include: { legendary: { select } } }),
        this.prisma.topServant.findMany({ where: { topEventId: message.topEventId, deletedAt: null, status: { not: 'CANCELLED' }, legendary: { deletedAt: null } }, include: { legendary: { select } } }),
      ]);
      return [...participants, ...servants].map((item: any) => item.legendary);
    }
    if (message.targetType === InternalMessageTargetType.TOP_REPRESENTATIVES) {
      const top = await this.prisma.topEvent.findFirst({ where: { id: message.topEventId, deletedAt: null }, select: { representative: { select }, deputyRepresentative: { select }, generalCoordinator: { select } } });
      return [top?.representative, top?.deputyRepresentative, top?.generalCoordinator].filter(Boolean);
    }
    if (message.targetType === InternalMessageTargetType.TOP_FAMILY_REPRESENTATIVES) {
      const families = await this.prisma.topFamily.findMany({ where: { topEventId: message.topEventId, deletedAt: null }, select: { representative: { select }, deputyRepresentative: { select } } });
      return families.flatMap((family: any) => [family.representative, family.deputyRepresentative]).filter(Boolean);
    }
    const members = await this.prisma.topFamilyMember.findMany({ where: { topFamilyId: message.targetId, deletedAt: null, status: 'ACTIVE', topParticipant: { deletedAt: null, status: { not: 'CANCELLED' } } }, include: { topParticipant: { include: { legendary: { select } } } } });
    return members.map((item: any) => item.topParticipant.legendary);
  }

  private async validateTarget(dto: Partial<CreateCommunicationDto>) {
    if ([InternalMessageTargetType.TOP_ALL, InternalMessageTargetType.TOP_REPRESENTATIVES, InternalMessageTargetType.TOP_FAMILY_REPRESENTATIVES].includes(dto.targetType as any) && !dto.topEventId) throw new BadRequestException('TOP target requires topEventId.');
    if ([InternalMessageTargetType.TOP_FAMILY, InternalMessageTargetType.TEAM, InternalMessageTargetType.LEGENDARY].includes(dto.targetType as any) && !dto.targetId) throw new BadRequestException('This target requires targetId.');
  }

  private async findExistingDraftOrSent(id: string) {
    const message = await this.prisma.internalMessage.findFirst({ where: { id, deletedAt: null }, include: includeMessage });
    if (!message) throw new NotFoundException('Communication not found.');
    return message;
  }

  private async findRecipient(messageId: string, id: string) {
    const recipient = await this.prisma.messageRecipient.findFirst({ where: { id, messageId }, include: includeRecipient });
    if (!recipient) throw new NotFoundException('Recipient not found.');
    return recipient;
  }

  private toMessageData(dto: Partial<CreateCommunicationDto>, createdByUserId?: string) {
    const data: any = {};
    if ('title' in dto) data.title = dto.title?.trim();
    if ('body' in dto) data.body = dto.body?.trim();
    if ('targetType' in dto) data.targetType = dto.targetType;
    if ('targetId' in dto) data.targetId = dto.targetId || null;
    if ('topEventId' in dto) data.topEventId = dto.topEventId || null;
    if ('requiresConfirmation' in dto) data.requiresConfirmation = dto.requiresConfirmation ?? false;
    if (createdByUserId) data.createdByUserId = createdByUserId;
    return data;
  }

  private toMessageResponse(message: any) {
    return { ...message, recipientsCount: message._count?.recipients ?? 0 };
  }
}
