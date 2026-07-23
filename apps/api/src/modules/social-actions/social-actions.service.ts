import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LegendaryHistoryType, SocialActionParticipantStatus, SocialActionStatus } from '@central-da-manada/shared';
import { getPagination, toPaginatedResponse } from '../../common/pagination/pagination.dto';
import { PrismaService } from '../../database/prisma.service';
import { AccessPolicyService } from '../../common/access/access-policy.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { AddSocialActionParticipantDto, CompleteSocialActionDto, CreateSocialActionDto, SocialActionsQueryDto, UpdateSocialActionDto, UpdateSocialActionParticipantDto, VolunteerSuggestionsQueryDto } from './dto/social-actions.dto';

const includeAction = { responsible: true, _count: { select: { participants: { where: { deletedAt: null, status: { not: SocialActionParticipantStatus.CANCELLED } } } } } };
const includeParticipant = { legendary: true };

@Injectable()
export class SocialActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly accessPolicy: AccessPolicyService,
  ) {}

  async findAll(query: SocialActionsQueryDto, user: AuthenticatedUser) {
    const { page, perPage, skip, take } = getPagination(query);
    const scope = await this.accessPolicy.resolveScope(user);
    const where: any = { deletedAt: null, status: query.status, city: query.city ? { contains: query.city, mode: 'insensitive' } : undefined };
    if (query.search) where.OR = [{ title: { contains: query.search, mode: 'insensitive' } }, { description: { contains: query.search, mode: 'insensitive' } }];
    if (!scope.isAdmin) where.AND = [this.accessPolicy.buildCityWhere(scope)];
    const [items, total] = await Promise.all([
      this.prisma.socialAction.findMany({ where, include: includeAction, orderBy: { startDate: 'desc' }, skip, take }),
      this.prisma.socialAction.count({ where }),
    ]);
    return toPaginatedResponse(items.map((item: any) => this.toActionResponse(item)), total, page, perPage);
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const action = await this.findExisting(id, user);
    return this.toActionResponse(action);
  }

  async create(dto: CreateSocialActionDto, actorUserId?: string) {
    this.validateDates(dto.startDate, dto.endDate);
    await this.ensureLegendaryExists(dto.responsibleLegendaryId);
    const action = await this.prisma.socialAction.create({ data: this.toActionData(dto), include: includeAction });
    await this.audit.create({ actorUserId, entityType: 'SocialAction', entityId: action.id, action: 'create', after: this.toActionResponse(action) });
    return this.toActionResponse(action);
  }

  async update(id: string, dto: UpdateSocialActionDto, user: AuthenticatedUser) {
    const before = await this.findExisting(id, user);
    const start = dto.startDate ?? before.startDate;
    const end = dto.endDate ?? before.endDate;
    this.validateDates(start, end);
    if (dto.responsibleLegendaryId) await this.ensureLegendaryExists(dto.responsibleLegendaryId);
    const after = await this.prisma.socialAction.update({ where: { id }, data: this.toActionData(dto), include: includeAction });
    await this.audit.create({ actorUserId: user.sub, entityType: 'SocialAction', entityId: id, action: 'update', before: this.toActionResponse(before), after: this.toActionResponse(after) });
    return this.toActionResponse(after);
  }

  async complete(id: string, dto: CompleteSocialActionDto, user: AuthenticatedUser) {
    const before = await this.findExisting(id, user);
    const after = await this.prisma.socialAction.update({ where: { id }, data: { status: SocialActionStatus.COMPLETED, resultSummary: dto.resultSummary.trim() }, include: includeAction });
    await this.audit.create({ actorUserId: user.sub, entityType: 'SocialAction', entityId: id, action: 'complete', before: this.toActionResponse(before), after: this.toActionResponse(after) });
    const participants = await this.prisma.socialActionParticipant.findMany({ where: { socialActionId: id, deletedAt: null, status: { not: SocialActionParticipantStatus.CANCELLED } } });
    if (participants.length) {
      await this.prisma.legendaryHistory.createMany({
        data: participants.map((participant) => ({
          legendaryId: participant.legendaryId,
          type: LegendaryHistoryType.SOCIAL_ACTION_COMPLETED,
          title: 'Participou de ação social concluída',
          description: `Ação social concluída: ${after.title}.`,
          actorUserId: user.sub,
          socialActionId: id,
        })),
      });
    }
    return this.toActionResponse(after);
  }

  async cancel(id: string, user: AuthenticatedUser) {
    const before = await this.findExisting(id, user);
    const after = await this.prisma.socialAction.update({ where: { id }, data: { status: SocialActionStatus.CANCELLED }, include: includeAction });
    await this.audit.create({ actorUserId: user.sub, entityType: 'SocialAction', entityId: id, action: 'cancel', before: this.toActionResponse(before), after: this.toActionResponse(after) });
    return this.toActionResponse(after);
  }

  async delete(id: string, user: AuthenticatedUser) {
    const before = await this.findExisting(id, user);
    const after = await this.prisma.socialAction.update({ where: { id }, data: { deletedAt: new Date(), status: SocialActionStatus.CANCELLED }, include: includeAction });
    await this.audit.create({ actorUserId: user.sub, entityType: 'SocialAction', entityId: id, action: 'delete', before: this.toActionResponse(before), after: this.toActionResponse(after) });
    return this.toActionResponse(after);
  }

  async participants(id: string, user: AuthenticatedUser) {
    await this.findExisting(id, user);
    return this.prisma.socialActionParticipant.findMany({ where: { socialActionId: id, deletedAt: null }, include: includeParticipant, orderBy: { createdAt: 'asc' } });
  }

  async addParticipant(id: string, dto: AddSocialActionParticipantDto, user: AuthenticatedUser) {
    const scope = await this.accessPolicy.resolveScope(user);
    const action = await this.findExisting(id, user, scope);
    await this.ensureLegendaryExists(dto.legendaryId, scope);
    await this.ensureParticipantAvailable(id, dto.legendaryId);
    const participant = await this.prisma.socialActionParticipant.create({ data: { socialActionId: id, legendaryId: dto.legendaryId, role: dto.role?.trim() || null, status: dto.status, attended: dto.attended ?? false, notes: dto.notes?.trim() || null }, include: includeParticipant });
    await this.audit.create({ actorUserId: user.sub, entityType: 'SocialActionParticipant', entityId: participant.id, action: 'add_participant', after: participant });
    await this.createHistory(dto.legendaryId, LegendaryHistoryType.SOCIAL_ACTION_JOINED, 'Entrou em ação social', `Entrou na ação social ${action.title}.`, user.sub, id);
    return participant;
  }

  async updateParticipant(id: string, participantId: string, dto: UpdateSocialActionParticipantDto, user: AuthenticatedUser) {
    await this.findExisting(id, user);
    const before = await this.findParticipant(id, participantId);
    const after = await this.prisma.socialActionParticipant.update({
      where: { id: participantId },
      data: {
        role: dto.role === null ? null : (dto.role !== undefined ? dto.role.trim() : undefined),
        status: dto.status,
        attended: dto.attended,
        notes: dto.notes === null ? null : (dto.notes !== undefined ? dto.notes.trim() : undefined)
      },
      include: includeParticipant
    });
    await this.audit.create({ actorUserId: user.sub, entityType: 'SocialActionParticipant', entityId: participantId, action: 'update_participant', before, after });
    return after;
  }

  async removeParticipant(id: string, participantId: string, user: AuthenticatedUser) {
    await this.findExisting(id, user);
    const before = await this.findParticipant(id, participantId);
    const after = await this.prisma.socialActionParticipant.update({ where: { id: participantId }, data: { status: SocialActionParticipantStatus.CANCELLED, deletedAt: new Date() }, include: includeParticipant });
    await this.audit.create({ actorUserId: user.sub, entityType: 'SocialActionParticipant', entityId: participantId, action: 'remove_participant', before, after });
    await this.createHistory(before.legendaryId, LegendaryHistoryType.SOCIAL_ACTION_LEFT, 'Saiu de ação social', 'Participação em ação social cancelada.', user.sub, id);
    return after;
  }

  async suggestions(query: VolunteerSuggestionsQueryDto, user: AuthenticatedUser) {
    const { page, perPage, skip, take } = getPagination(query);
    const scope = await this.accessPolicy.resolveScope(user);
    const where: any = {
      deletedAt: null,
      socialActionInterest: query.socialActionInterest ? query.socialActionInterest === 'true' : true,
      city: query.city ? { contains: query.city, mode: 'insensitive' } : undefined,
      professionId: query.professionId,
      expertises: query.expertiseId ? { some: { expertiseId: query.expertiseId } } : undefined,
    };
    if (!scope.isAdmin) {
      where.AND = [this.accessPolicy.buildLegendaryWhere(scope)];
    }
    const [items, total] = await Promise.all([
      this.prisma.legendary.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          lgndNumber: true,
          city: true,
          profession: { select: { id: true, name: true } },
        },
        orderBy: { fullName: 'asc' },
        skip,
        take,
      }),
      this.prisma.legendary.count({ where }),
    ]);
    return toPaginatedResponse(items, total, page, perPage);
  }

  private async findExisting(id: string, user: AuthenticatedUser, resolvedScope?: Awaited<ReturnType<AccessPolicyService['resolveScope']>>) {
    const scope = resolvedScope ?? await this.accessPolicy.resolveScope(user);
    const where: any = { id, deletedAt: null };
    if (!scope.isAdmin) {
      where.AND = [this.accessPolicy.buildCityWhere(scope)];
    }
    const action = await this.prisma.socialAction.findFirst({ where, include: includeAction });
    if (!action) throw new NotFoundException('Social action not found.');
    return action;
  }
  private async findParticipant(socialActionId: string, id: string) { const item = await this.prisma.socialActionParticipant.findFirst({ where: { id, socialActionId, deletedAt: null }, include: includeParticipant }); if (!item) throw new NotFoundException('Participant not found.'); return item; }
  private async ensureLegendaryExists(id: string, scope?: Awaited<ReturnType<AccessPolicyService['resolveScope']>>) {
    const where: any = { id, deletedAt: null };
    if (scope && !scope.isAdmin) {
      where.AND = [this.accessPolicy.buildLegendaryWhere(scope)];
    }
    if (!(await this.prisma.legendary.findFirst({ where }))) throw new BadRequestException('Legendary does not exist.');
  }
  private async ensureParticipantAvailable(socialActionId: string, legendaryId: string) { if (await this.prisma.socialActionParticipant.findFirst({ where: { socialActionId, legendaryId, deletedAt: null, status: { not: SocialActionParticipantStatus.CANCELLED } } })) throw new BadRequestException('Legendary already participates in this social action.'); }
  private validateDates(start: Date, end: Date) { if (end < start) throw new BadRequestException('End date cannot be before start date.'); }
  private toActionData(dto: Partial<CreateSocialActionDto & UpdateSocialActionDto>) { const data: any = {}; for (const key of ['title','description','location','city','startDate','endDate','status','responsibleLegendaryId','notes','resultSummary']) if (key in dto) data[key] = typeof (dto as any)[key] === 'string' ? ((dto as any)[key].trim() || null) : (dto as any)[key]; return data; }
  private toActionResponse(action: any) { return { ...action, participantsCount: action._count?.participants ?? 0 }; }
  private async createHistory(legendaryId: string, type: LegendaryHistoryType, title: string, description: string, actorUserId: string | undefined, socialActionId: string) {
    await this.prisma.legendaryHistory.create({ data: { legendaryId, type, title, description, actorUserId, socialActionId } });
  }
}
