import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LegendaryHistoryType, TopEventStatus, TopFamilyMemberStatus, TopParticipantStatus, TopServantStatus } from '@central-da-manada/shared';
import { getPagination, toPaginatedResponse } from '../../common/pagination/pagination.dto';
import { OptionsQueryDto } from '../../common/options/options-query.dto';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateTopDto, TopQueryDto } from './dto/top-query.dto';
import { UpdateTopDto } from './dto/update-top.dto';
import { CreateTopTeamDto, UpdateTopTeamDto } from './dto/top-team.dto';
import { CreateTopParticipantDto, TopParticipantsQueryDto, UpdateTopParticipantDto } from './dto/top-participant.dto';
import { CreateTopServantDto, TopServantsQueryDto, UpdateTopServantDto } from './dto/top-servant.dto';
import { CreateTopFamilyDto, CreateTopFamilyMemberDto, TransferTopFamilyMemberDto, UpdateTopFamilyDto, UpdateTopFamilyMemberDto } from './dto/top-family.dto';

const includeTop = {
  representative: true,
  deputyRepresentative: true,
  generalCoordinator: true,
  familyCoordinator: true,
  familyDeputyCoordinator: true,
  familyGeneralCoordinator: true,
  _count: { select: { participants: true, servants: true, teams: true, families: true } },
};
const includeTopTeam = { team: true, coordinator: true, deputyCoordinator: true };
const includeParticipant = { legendary: true };
const includeServant = { legendary: true, team: true };
const includeFamily = { representative: true, deputyRepresentative: true, _count: { select: { members: { where: { status: TopFamilyMemberStatus.ACTIVE, deletedAt: null } } } } };
const includeFamilyMember = { topParticipant: { include: { legendary: true } }, topFamily: true };

@Injectable()
export class TopsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async findAll(query: TopQueryDto) {
    const { page, perPage, skip, take } = getPagination(query);
    const where: any = {
      deletedAt: null,
      status: query.status,
      city: query.city ? { contains: query.city, mode: 'insensitive' } : undefined,
      startDate: query.startDateFrom || query.startDateTo ? { gte: query.startDateFrom, lte: query.startDateTo } : undefined,
      needsReview: query.needsReview,
      familyCoordinatorLegendaryId: query.missingFamilyCoordinator ? null : undefined,
    };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
        { number: Number.isNaN(Number(query.search)) ? undefined : Number(query.search) },
      ].filter(Boolean);
    }
    const orderBy = { [query.orderBy ?? 'startDate']: query.orderDirection ?? 'desc' };
    const [items, total] = await Promise.all([
      this.prisma.topEvent.findMany({ where, include: includeTop, orderBy, skip, take }),
      this.prisma.topEvent.count({ where }),
    ]);
    return toPaginatedResponse(items.map((item: any) => this.toTopResponse(item)), total, page, perPage);
  }

  async findOne(id: string) {
    const top = await this.prisma.topEvent.findFirst({ where: { id, deletedAt: null }, include: includeTop });
    if (!top) throw new NotFoundException('TOP not found.');
    return this.toTopResponse(top);
  }

  async options(query: OptionsQueryDto) {
    const where: any = { deletedAt: null };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
        { number: Number.isNaN(Number(query.search)) ? undefined : Number(query.search) },
      ].filter(Boolean);
    }

    const items = await this.prisma.topEvent.findMany({
      where,
      select: { id: true, name: true, number: true, city: true, status: true },
      orderBy: { startDate: 'desc' },
      take: query.limit ?? 20,
    });

    return items.map((item: any) => ({
      id: item.id,
      label: `TOP #${item.number} - ${item.name}`,
      value: item.id,
      metadata: { number: item.number, name: item.name, city: item.city, status: item.status },
    }));
  }

  async create(dto: CreateTopDto, actorUserId?: string) {
    this.validateDates(dto.startDate, dto.endDate);
    await this.ensureNumberAvailable(dto.number);
    await this.validateTopLeadership(dto);
    const top = await this.prisma.topEvent.create({ data: this.toTopData(dto), include: includeTop });
    await this.audit.create({ actorUserId, entityType: 'TopEvent', entityId: top.id, action: 'create', after: this.toTopResponse(top) });
    await this.createTopLeadershipHistory({}, top, dto, actorUserId);
    return this.toTopResponse(top);
  }

  async update(id: string, dto: UpdateTopDto, actorUserId?: string) {
    const before = await this.findExistingTop(id);
    const startDate = dto.startDate ?? before.startDate;
    const endDate = dto.endDate ?? before.endDate;
    this.validateDates(startDate, endDate);
    if (dto.number) await this.ensureNumberAvailable(dto.number, id);
    await this.validateTopLeadership(dto);
    const after = await this.prisma.topEvent.update({ where: { id }, data: this.toTopData(dto), include: includeTop });
    await this.audit.create({ actorUserId, entityType: 'TopEvent', entityId: id, action: 'update', before: this.toTopResponse(before), after: this.toTopResponse(after) });
    await this.auditTopFieldChanges(before, after, dto, actorUserId);
    return this.toTopResponse(after);
  }

  async deactivate(id: string, actorUserId?: string) {
    const before = await this.findExistingTop(id);
    const after = await this.prisma.topEvent.update({ where: { id }, data: { deletedAt: new Date(), status: TopEventStatus.CANCELLED }, include: includeTop });
    await this.audit.create({ actorUserId, entityType: 'TopEvent', entityId: id, action: 'deactivate', before: this.toTopResponse(before), after: this.toTopResponse(after) });
    return this.toTopResponse(after);
  }

  async restore(id: string, actorUserId?: string) {
    const before = await this.findExistingTopWithDeleted(id);
    await this.ensureNumberAvailable(before.number, id);
    const after = await this.prisma.topEvent.update({ where: { id }, data: { deletedAt: null }, include: includeTop });
    await this.audit.create({ actorUserId, entityType: 'TopEvent', entityId: id, action: 'restore', before: this.toTopResponse(before), after: this.toTopResponse(after) });
    return this.toTopResponse(after);
  }

  async findFamilies(topEventId: string) {
    await this.findExistingTop(topEventId);
    const families = await this.prisma.topFamily.findMany({ where: { topEventId, deletedAt: null }, include: includeFamily, orderBy: { name: 'asc' } });
    return families.map((family: any) => this.toFamilyResponse(family));
  }

  async findFamily(topEventId: string, familyId: string) {
    await this.findExistingTop(topEventId);
    return this.toFamilyResponse(await this.findExistingFamily(topEventId, familyId));
  }

  async createFamily(topEventId: string, dto: CreateTopFamilyDto, actorUserId?: string) {
    await this.findExistingTop(topEventId);
    await this.ensureFamilyNameAvailable(topEventId, dto.name);
    await this.validateFamilyRepresentatives(dto);
    const family = await this.prisma.topFamily.create({ data: this.toFamilyData(topEventId, dto), include: includeFamily });
    await this.audit.create({ actorUserId, entityType: 'TopFamily', entityId: family.id, action: 'create_family', after: this.toFamilyResponse(family) });
    if (dto.representativeLegendaryId) await this.createHistory(dto.representativeLegendaryId, LegendaryHistoryType.FAMILY_REPRESENTATIVE_ASSIGNED, 'Representante de familia definido', `Definido como representante da familia ${family.name}.`, actorUserId, { topEventId, topFamilyId: family.id, metadata: { representativeRole: dto.representativeRole } });
    if (dto.deputyRepresentativeLegendaryId) await this.createHistory(dto.deputyRepresentativeLegendaryId, LegendaryHistoryType.FAMILY_DEPUTY_ASSIGNED, 'Sub-representante de familia definido', `Definido como sub-representante da familia ${family.name}.`, actorUserId, { topEventId, topFamilyId: family.id });
    return this.toFamilyResponse(family);
  }

  async updateFamily(topEventId: string, familyId: string, dto: UpdateTopFamilyDto, actorUserId?: string) {
    await this.findExistingTop(topEventId);
    const before = await this.findExistingFamily(topEventId, familyId);
    if (dto.name) await this.ensureFamilyNameAvailable(topEventId, dto.name, familyId);
    await this.validateFamilyRepresentatives({ representativeLegendaryId: dto.representativeLegendaryId ?? before.representativeLegendaryId ?? undefined, deputyRepresentativeLegendaryId: dto.deputyRepresentativeLegendaryId ?? before.deputyRepresentativeLegendaryId ?? undefined });
    const after = await this.prisma.topFamily.update({ where: { id: familyId }, data: this.toFamilyData(topEventId, dto), include: includeFamily });
    await this.audit.create({ actorUserId, entityType: 'TopFamily', entityId: familyId, action: 'update_family', before: this.toFamilyResponse(before), after: this.toFamilyResponse(after) });
    await this.auditFamilyFieldChanges(before, after, dto, actorUserId);
    if ('representativeLegendaryId' in dto && after.representativeLegendaryId && before.representativeLegendaryId !== after.representativeLegendaryId) await this.createHistory(after.representativeLegendaryId, LegendaryHistoryType.FAMILY_REPRESENTATIVE_ASSIGNED, 'Representante de familia definido', `Definido como representante da familia ${after.name}.`, actorUserId, { topEventId, topFamilyId: familyId, metadata: { representativeRole: after.representativeRole } });
    if ('deputyRepresentativeLegendaryId' in dto && after.deputyRepresentativeLegendaryId && before.deputyRepresentativeLegendaryId !== after.deputyRepresentativeLegendaryId) await this.createHistory(after.deputyRepresentativeLegendaryId, LegendaryHistoryType.FAMILY_DEPUTY_ASSIGNED, 'Sub-representante de familia definido', `Definido como sub-representante da familia ${after.name}.`, actorUserId, { topEventId, topFamilyId: familyId });
    return this.toFamilyResponse(after);
  }

  async deactivateFamily(topEventId: string, familyId: string, actorUserId?: string) {
    const before = await this.findExistingFamily(topEventId, familyId);
    const now = new Date();
    const after = await this.prisma.$transaction(async (tx: any) => {
      await tx.topFamilyMember.updateMany({ where: { topFamilyId: familyId, deletedAt: null, status: TopFamilyMemberStatus.ACTIVE }, data: { status: TopFamilyMemberStatus.INACTIVE, endedAt: now, deletedAt: now } });
      return tx.topFamily.update({ where: { id: familyId }, data: { deletedAt: now }, include: includeFamily });
    });
    await this.audit.create({ actorUserId, entityType: 'TopFamily', entityId: familyId, action: 'deactivate_family', before: this.toFamilyResponse(before), after: this.toFamilyResponse(after) });
    return this.toFamilyResponse(after);
  }

  async restoreFamily(topEventId: string, familyId: string, actorUserId?: string) {
    const before = await this.prisma.topFamily.findFirst({ where: { id: familyId, topEventId }, include: includeFamily });
    if (!before) throw new NotFoundException('Family not found.');
    await this.ensureFamilyNameAvailable(topEventId, before.name, familyId);
    const after = await this.prisma.topFamily.update({ where: { id: familyId }, data: { deletedAt: null }, include: includeFamily });
    await this.audit.create({ actorUserId, entityType: 'TopFamily', entityId: familyId, action: 'restore_family', before: this.toFamilyResponse(before), after: this.toFamilyResponse(after) });
    return this.toFamilyResponse(after);
  }

  async findFamilyMembers(topEventId: string, familyId: string) {
    await this.findExistingFamily(topEventId, familyId);
    return this.prisma.topFamilyMember.findMany({ where: { topEventId, topFamilyId: familyId, deletedAt: null }, include: includeFamilyMember, orderBy: { createdAt: 'asc' } });
  }

  async familyOptions(topEventId: string, query: OptionsQueryDto) {
    await this.findExistingTop(topEventId);
    const where: any = { topEventId, deletedAt: null };
    if (query.search) where.name = { contains: query.search, mode: 'insensitive' };
    const items = await this.prisma.topFamily.findMany({
      where,
      select: { id: true, name: true, needsReview: true, representative: { select: { fullName: true } } },
      orderBy: { name: 'asc' },
      take: query.limit ?? 50,
    });
    return items.map((item: any) => ({
      id: item.id,
      label: item.name,
      value: item.id,
      metadata: { representative: item.representative?.fullName, needsReview: item.needsReview },
    }));
  }

  async participantOptions(topEventId: string, query: OptionsQueryDto) {
    await this.findExistingTop(topEventId);
    const where: any = {
      topEventId,
      deletedAt: null,
      status: { not: TopParticipantStatus.CANCELLED },
    };
    if (query.search) where.legendary = { fullName: { contains: query.search, mode: 'insensitive' } };
    const items = await this.prisma.topParticipant.findMany({
      where,
      include: { legendary: { select: { id: true, fullName: true, lgndNumber: true, city: true } } },
      orderBy: { legendary: { fullName: 'asc' } },
      take: query.limit ?? 50,
    });
    return items.map((item: any) => ({
      id: item.id,
      label: item.legendary?.lgndNumber ? `${item.legendary.fullName} - LGND ${item.legendary.lgndNumber}` : item.legendary?.fullName ?? item.id,
      value: item.id,
      metadata: { legendaryId: item.legendaryId, fullName: item.legendary?.fullName, lgndNumber: item.legendary?.lgndNumber, city: item.legendary?.city },
    }));
  }

  async addFamilyMember(topEventId: string, familyId: string, dto: CreateTopFamilyMemberDto, actorUserId?: string) {
    const family = await this.findExistingFamily(topEventId, familyId);
    const participant = await this.findEligibleFamilyParticipant(topEventId, dto.topParticipantId);
    await this.ensureParticipantNotInActiveFamily(topEventId, dto.topParticipantId);
    const member = await this.prisma.topFamilyMember.create({ data: { topEventId, topFamilyId: familyId, topParticipantId: dto.topParticipantId, notes: dto.notes?.trim() || null, sourceNotes: dto.sourceNotes?.trim() || null, needsReview: dto.needsReview ?? false }, include: includeFamilyMember });
    await this.audit.create({ actorUserId, entityType: 'TopFamilyMember', entityId: member.id, action: 'add_family_member', after: member });
    await this.createHistory(participant.legendaryId, LegendaryHistoryType.FAMILY_JOINED, 'Entrou em familia', `Entrou na familia ${family.name}.`, actorUserId, { topEventId, topFamilyId: familyId });
    return member;
  }

  async updateFamilyMember(topEventId: string, familyId: string, memberId: string, dto: UpdateTopFamilyMemberDto, actorUserId?: string) {
    await this.findExistingFamily(topEventId, familyId);
    const before = await this.findExistingFamilyMember(topEventId, familyId, memberId);
    const after = await this.prisma.topFamilyMember.update({ where: { id: memberId }, data: { status: dto.status, notes: dto.notes === null ? null : (dto.notes !== undefined ? dto.notes.trim() : undefined), sourceNotes: dto.sourceNotes === null ? null : (dto.sourceNotes !== undefined ? dto.sourceNotes.trim() : undefined), needsReview: dto.needsReview }, include: includeFamilyMember });
    await this.audit.create({ actorUserId, entityType: 'TopFamilyMember', entityId: memberId, action: 'update_family_member', before, after });
    return after;
  }

  async deactivateFamilyMember(topEventId: string, familyId: string, memberId: string, actorUserId?: string) {
    const before = await this.findExistingFamilyMember(topEventId, familyId, memberId);
    const after = await this.prisma.topFamilyMember.update({ where: { id: memberId }, data: { status: TopFamilyMemberStatus.INACTIVE, endedAt: new Date(), deletedAt: new Date() }, include: includeFamilyMember });
    await this.audit.create({ actorUserId, entityType: 'TopFamilyMember', entityId: memberId, action: 'deactivate_family_member', before, after });
    await this.createHistory(before.topParticipant.legendaryId, LegendaryHistoryType.FAMILY_LEFT, 'Saiu de familia', `Saiu da familia ${before.topFamily.name}.`, actorUserId, { topEventId, topFamilyId: familyId });
    return after;
  }

  async transferFamilyMember(topEventId: string, familyId: string, memberId: string, dto: TransferTopFamilyMemberDto, actorUserId?: string) {
    const before = await this.findExistingFamilyMember(topEventId, familyId, memberId);
    if (dto.targetFamilyId === familyId) throw new BadRequestException('Target family must be different.');
    const target = await this.findExistingFamily(topEventId, dto.targetFamilyId);
    const now = new Date();
    const created = await this.prisma.$transaction(async (tx: any) => {
      await tx.topFamilyMember.update({ where: { id: memberId }, data: { status: TopFamilyMemberStatus.TRANSFERRED, endedAt: now, deletedAt: now, notes: dto.notes?.trim() || before.notes } });
      return tx.topFamilyMember.create({ data: { topEventId, topFamilyId: dto.targetFamilyId, topParticipantId: before.topParticipantId, notes: dto.notes?.trim() || null }, include: includeFamilyMember });
    });
    await this.audit.create({ actorUserId, entityType: 'TopFamilyMember', entityId: memberId, action: 'transfer_family_member', before, after: created });
    await this.createHistory(before.topParticipant.legendaryId, LegendaryHistoryType.FAMILY_TRANSFERRED, 'Transferido de familia', `Transferido de ${before.topFamily.name} para ${target.name}.`, actorUserId, { topEventId, topFamilyId: target.id, metadata: { fromFamilyId: familyId } });
    return created;
  }

  async findTeams(topEventId: string) {
    await this.findExistingTop(topEventId);
    return this.prisma.topTeam.findMany({ where: { topEventId, deletedAt: null }, include: includeTopTeam, orderBy: { createdAt: 'asc' } });
  }

  async addTeam(topEventId: string, dto: CreateTopTeamDto, actorUserId?: string) {
    await this.findExistingTop(topEventId);
    await this.ensureTeamExists(dto.teamId);
    await this.ensureTopTeamAvailable(topEventId, dto.teamId);
    await this.validateTopTeamCoordinators(dto);
    const item = await this.prisma.topTeam.create({ data: this.toTopTeamData(topEventId, dto), include: includeTopTeam });
    await this.audit.create({ actorUserId, entityType: 'TopTeam', entityId: item.id, action: 'add_team', after: item });
    return item;
  }

  async updateTeam(topEventId: string, topTeamId: string, dto: UpdateTopTeamDto, actorUserId?: string) {
    await this.findExistingTop(topEventId);
    await this.validateTopTeamCoordinators(dto);
    const before = await this.findExistingTopTeam(topEventId, topTeamId);
    const after = await this.prisma.topTeam.update({ where: { id: topTeamId }, data: this.toTopTeamData(topEventId, dto), include: includeTopTeam });
    await this.audit.create({ actorUserId, entityType: 'TopTeam', entityId: topTeamId, action: 'update_team', before, after });
    return after;
  }

  async removeTeam(topEventId: string, topTeamId: string, actorUserId?: string) {
    await this.findExistingTop(topEventId);
    const before = await this.findExistingTopTeam(topEventId, topTeamId);
    const after = await this.prisma.topTeam.update({ where: { id: topTeamId }, data: { deletedAt: new Date() }, include: includeTopTeam });
    await this.audit.create({ actorUserId, entityType: 'TopTeam', entityId: topTeamId, action: 'remove_team', before, after });
    return after;
  }

  async findParticipants(topEventId: string, query: TopParticipantsQueryDto) {
    await this.findExistingTop(topEventId);
    const { page, perPage, skip, take } = getPagination(query);
    const where: any = { topEventId, deletedAt: null, status: query.status, type: query.type };
    if (query.search) where.legendary = { fullName: { contains: query.search, mode: 'insensitive' } };
    const [items, total] = await Promise.all([
      this.prisma.topParticipant.findMany({ where, include: includeParticipant, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.topParticipant.count({ where }),
    ]);
    return toPaginatedResponse(items, total, page, perPage);
  }

  async addParticipant(topEventId: string, dto: CreateTopParticipantDto, actorUserId?: string, db: Prisma.TransactionClient = this.prisma) {
    await this.findExistingTop(topEventId, db);
    await this.ensureLegendaryExists(dto.legendaryId, db);
    await this.ensureParticipantAvailable(topEventId, dto.legendaryId, db);
    await this.ensureNotActiveServant(topEventId, dto.legendaryId, db);
    const item = await db.topParticipant.create({ data: { topEventId, ...dto, notes: dto.notes?.trim() || null }, include: includeParticipant });
    await this.audit.create({ actorUserId, entityType: 'TopParticipant', entityId: item.id, action: 'add_participant', after: item }, db);
    await this.createHistory(item.legendaryId, LegendaryHistoryType.TOP_PARTICIPATED, 'Participou de TOP', `Adicionado como participante do TOP.`, actorUserId, { topEventId }, db);
    return item;
  }

  async updateParticipant(topEventId: string, participantId: string, dto: UpdateTopParticipantDto, actorUserId?: string) {
    await this.findExistingTop(topEventId);
    const before = await this.findExistingParticipant(topEventId, participantId);
    const after = await this.prisma.topParticipant.update({ where: { id: participantId }, data: { ...dto, notes: dto.notes === null ? null : (dto.notes !== undefined ? dto.notes.trim() : undefined) }, include: includeParticipant });
    await this.audit.create({ actorUserId, entityType: 'TopParticipant', entityId: participantId, action: 'update_participant', before, after });
    return after;
  }

  async cancelParticipant(topEventId: string, participantId: string, actorUserId?: string) {
    const before = await this.findExistingParticipant(topEventId, participantId);
    const after = await this.prisma.topParticipant.update({ where: { id: participantId }, data: { status: TopParticipantStatus.CANCELLED, deletedAt: new Date() }, include: includeParticipant });
    await this.audit.create({ actorUserId, entityType: 'TopParticipant', entityId: participantId, action: 'cancel_participant', before, after });
    await this.createHistory(after.legendaryId, LegendaryHistoryType.TOP_PARTICIPATION_CANCELLED, 'Participacao em TOP cancelada', 'Participacao no TOP foi cancelada.', actorUserId, { topEventId });
    return after;
  }

  async findServants(topEventId: string, query: TopServantsQueryDto) {
    await this.findExistingTop(topEventId);
    const { page, perPage, skip, take } = getPagination(query);
    const where: any = { topEventId, deletedAt: null, status: query.status, teamId: query.teamId, role: query.role ? { contains: query.role, mode: 'insensitive' } : undefined };
    if (query.search) where.legendary = { fullName: { contains: query.search, mode: 'insensitive' } };
    const [items, total] = await Promise.all([
      this.prisma.topServant.findMany({ where, include: includeServant, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.topServant.count({ where }),
    ]);
    return toPaginatedResponse(items, total, page, perPage);
  }

  async addServant(topEventId: string, dto: CreateTopServantDto, actorUserId?: string) {
    await this.findExistingTop(topEventId);
    await this.ensureLegendaryExists(dto.legendaryId);
    await this.ensureServantAvailable(topEventId, dto.legendaryId);
    await this.ensureNotActiveParticipant(topEventId, dto.legendaryId);
    if (dto.teamId) await this.ensureTeamLinkedToTop(topEventId, dto.teamId);
    const item = await this.prisma.topServant.create({ data: { topEventId, ...dto, role: dto.role?.trim() || null, notes: dto.notes?.trim() || null }, include: includeServant });
    await this.audit.create({ actorUserId, entityType: 'TopServant', entityId: item.id, action: 'add_servant', after: item });
    await this.createHistory(item.legendaryId, LegendaryHistoryType.TOP_SERVED, 'Serviu em TOP', `Adicionado como servo do TOP${item.team?.name ? ` na equipe ${item.team.name}` : ''}.`, actorUserId, { topEventId, teamId: item.teamId });
    return item;
  }

  async updateServant(topEventId: string, servantId: string, dto: UpdateTopServantDto, actorUserId?: string) {
    const before = await this.findExistingServant(topEventId, servantId);
    if (dto.teamId) await this.ensureTeamLinkedToTop(topEventId, dto.teamId);
    const after = await this.prisma.topServant.update({ where: { id: servantId }, data: { ...dto, role: dto.role === null ? null : (dto.role !== undefined ? dto.role.trim() : undefined), notes: dto.notes === null ? null : (dto.notes !== undefined ? dto.notes.trim() : undefined) }, include: includeServant });
    await this.audit.create({ actorUserId, entityType: 'TopServant', entityId: servantId, action: 'update_servant', before, after });
    return after;
  }

  async cancelServant(topEventId: string, servantId: string, actorUserId?: string) {
    const before = await this.findExistingServant(topEventId, servantId);
    const after = await this.prisma.topServant.update({ where: { id: servantId }, data: { status: TopServantStatus.CANCELLED, deletedAt: new Date() }, include: includeServant });
    await this.audit.create({ actorUserId, entityType: 'TopServant', entityId: servantId, action: 'cancel_servant', before, after });
    await this.createHistory(after.legendaryId, LegendaryHistoryType.TOP_SERVICE_CANCELLED, 'Servico em TOP cancelado', 'Servico no TOP foi cancelado.', actorUserId, { topEventId, teamId: after.teamId });
    return after;
  }

  private validateDates(start: Date, end: Date) { if (end < start) throw new BadRequestException('End date cannot be before start date.'); }
  private async validateTopLeadership(dto: Partial<CreateTopDto>) {
    const ids = [dto.representativeLegendaryId, dto.deputyRepresentativeLegendaryId, dto.generalCoordinatorLegendaryId].filter(Boolean) as string[];
    if (new Set(ids).size !== ids.length) throw new BadRequestException('TOP leadership people must be different.');
    for (const id of ids) await this.ensureLegendaryExists(id);
    const familyIds = [dto.familyCoordinatorLegendaryId, dto.familyDeputyCoordinatorLegendaryId, dto.familyGeneralCoordinatorLegendaryId].filter(Boolean) as string[];
    if (new Set(familyIds).size !== familyIds.length) throw new BadRequestException('Family coordination people must be different.');
    for (const id of familyIds) await this.ensureLegendaryExists(id);
  }
  private async validateTopTeamCoordinators(dto: Partial<CreateTopTeamDto>) {
    if (dto.coordinatorLegendaryId && dto.deputyCoordinatorLegendaryId && dto.coordinatorLegendaryId === dto.deputyCoordinatorLegendaryId) throw new BadRequestException('Coordinator and deputy must be different.');
    if (dto.coordinatorLegendaryId) await this.ensureLegendaryExists(dto.coordinatorLegendaryId);
    if (dto.deputyCoordinatorLegendaryId) await this.ensureLegendaryExists(dto.deputyCoordinatorLegendaryId);
  }
  private async ensureLegendaryExists(id: string, db: Prisma.TransactionClient = this.prisma) { if (!(await db.legendary.findFirst({ where: { id, deletedAt: null } }))) throw new BadRequestException('Legendary does not exist.'); }
  private async ensureTeamExists(id: string) { if (!(await this.prisma.team.findFirst({ where: { id, deletedAt: null } }))) throw new BadRequestException('Team does not exist.'); }
  private async ensureNumberAvailable(number: number, currentId?: string) { const e = await this.prisma.topEvent.findFirst({ where: { number, deletedAt: null } }); if (e && e.id !== currentId) throw new BadRequestException('TOP number already exists.'); }
  private async ensureTopTeamAvailable(topEventId: string, teamId: string) { if (await this.prisma.topTeam.findFirst({ where: { topEventId, teamId, deletedAt: null } })) throw new BadRequestException('Team already linked to TOP.'); }
  private async ensureParticipantAvailable(topEventId: string, legendaryId: string, db: Prisma.TransactionClient = this.prisma) { if (await db.topParticipant.findFirst({ where: { topEventId, legendaryId, deletedAt: null, status: { not: TopParticipantStatus.CANCELLED } } })) throw new BadRequestException('Legendary already is participant in this TOP.'); }
  private async ensureServantAvailable(topEventId: string, legendaryId: string) { if (await this.prisma.topServant.findFirst({ where: { topEventId, legendaryId, deletedAt: null, status: { not: TopServantStatus.CANCELLED } } })) throw new BadRequestException('Legendary already is servant in this TOP.'); }
  private async ensureNotActiveParticipant(topEventId: string, legendaryId: string) { if (await this.prisma.topParticipant.findFirst({ where: { topEventId, legendaryId, deletedAt: null, status: { not: TopParticipantStatus.CANCELLED } } })) throw new BadRequestException('Legendary cannot be participant and servant in same TOP.'); }
  private async ensureNotActiveServant(topEventId: string, legendaryId: string, db: Prisma.TransactionClient = this.prisma) { if (await db.topServant.findFirst({ where: { topEventId, legendaryId, deletedAt: null, status: { not: TopServantStatus.CANCELLED } } })) throw new BadRequestException('Legendary cannot be participant and servant in same TOP.'); }
  private async ensureTeamLinkedToTop(topEventId: string, teamId: string) { if (!(await this.prisma.topTeam.findFirst({ where: { topEventId, teamId, deletedAt: null } }))) throw new BadRequestException('Team must be linked to TOP before assigning servants.'); }
  private async findExistingTop(id: string, db: Prisma.TransactionClient = this.prisma) { const top = await db.topEvent.findFirst({ where: { id, deletedAt: null }, include: includeTop }); if (!top) throw new NotFoundException('TOP not found.'); return top; }
  private async findExistingTopWithDeleted(id: string) { const top = await this.prisma.topEvent.findUnique({ where: { id }, include: includeTop }); if (!top) throw new NotFoundException('TOP not found.'); return top; }
  private async findExistingTopTeam(topEventId: string, id: string) { const item = await this.prisma.topTeam.findFirst({ where: { id, topEventId, deletedAt: null }, include: includeTopTeam }); if (!item) throw new NotFoundException('TOP team not found.'); return item; }
  private async findExistingParticipant(topEventId: string, id: string) { const item = await this.prisma.topParticipant.findFirst({ where: { id, topEventId, deletedAt: null }, include: includeParticipant }); if (!item) throw new NotFoundException('TOP participant not found.'); return item; }
  private async findExistingServant(topEventId: string, id: string) { const item = await this.prisma.topServant.findFirst({ where: { id, topEventId, deletedAt: null }, include: includeServant }); if (!item) throw new NotFoundException('TOP servant not found.'); return item; }
  private toTopData(dto: Partial<CreateTopDto>) { const data: any = {}; for (const k of ['name','number','city','location','startDate','endDate','status','representativeLegendaryId','deputyRepresentativeLegendaryId','generalCoordinatorLegendaryId','familyCoordinatorLegendaryId','familyDeputyCoordinatorLegendaryId','familyGeneralCoordinatorLegendaryId','notes','needsReview']) if (k in dto) data[k] = typeof (dto as any)[k] === 'string' ? ((dto as any)[k].trim() || null) : (dto as any)[k]; return data; }
  private toTopTeamData(topEventId: string, dto: Partial<CreateTopTeamDto>) { const data: any = { topEventId }; if ('teamId' in dto) data.teamId = dto.teamId; if ('coordinatorLegendaryId' in dto) data.coordinatorLegendaryId = dto.coordinatorLegendaryId || null; if ('deputyCoordinatorLegendaryId' in dto) data.deputyCoordinatorLegendaryId = dto.deputyCoordinatorLegendaryId || null; if ('notes' in dto) data.notes = dto.notes?.trim() || null; return data; }
  private toTopResponse(top: any) { return { ...top, participantsCount: top._count?.participants ?? 0, servantsCount: top._count?.servants ?? 0, teamsCount: top._count?.teams ?? 0, familiesCount: top._count?.families ?? 0 }; }
  private toFamilyData(topEventId: string, dto: Partial<CreateTopFamilyDto>) { const data: any = { topEventId }; if ('name' in dto) data.name = dto.name?.trim(); if ('representativeLegendaryId' in dto) data.representativeLegendaryId = dto.representativeLegendaryId || null; if ('representativeRole' in dto) data.representativeRole = dto.representativeRole?.trim() || null; if ('deputyRepresentativeLegendaryId' in dto) data.deputyRepresentativeLegendaryId = dto.deputyRepresentativeLegendaryId || null; if ('deputyRepresentativeRole' in dto) data.deputyRepresentativeRole = dto.deputyRepresentativeRole?.trim() || null; if ('notes' in dto) data.notes = dto.notes?.trim() || null; if ('needsReview' in dto) data.needsReview = dto.needsReview; return data; }
  private toFamilyResponse(family: any) { return { ...family, membersCount: family._count?.members ?? family.members?.filter((item: any) => item.status === TopFamilyMemberStatus.ACTIVE && !item.deletedAt).length ?? 0 }; }
  private async auditTopFieldChanges(before: any, after: any, dto: UpdateTopDto, actorUserId?: string) {
    const fields = [['status','update_status'], ['representativeLegendaryId','update_representative'], ['deputyRepresentativeLegendaryId','update_deputy_representative'], ['generalCoordinatorLegendaryId','update_general_coordinator'], ['familyCoordinatorLegendaryId','update_family_coordinator'], ['familyDeputyCoordinatorLegendaryId','update_family_deputy_coordinator'], ['familyGeneralCoordinatorLegendaryId','update_family_general_coordinator'], ['needsReview','update_needs_review']];
    for (const [field, action] of fields) if (field in dto && before[field] !== after[field]) await this.audit.create({ actorUserId, entityType: 'TopEvent', entityId: after.id, action, before: { [field]: before[field] }, after: { [field]: after[field] } });
    await this.createTopLeadershipHistory(before, after, dto, actorUserId);
  }
  private async validateFamilyRepresentatives(dto: Partial<CreateTopFamilyDto>) {
    if (dto.deputyRepresentativeLegendaryId && dto.representativeLegendaryId === dto.deputyRepresentativeLegendaryId) throw new BadRequestException('Representative and deputy must be different.');
    if (dto.representativeLegendaryId) await this.ensureLegendaryExists(dto.representativeLegendaryId);
    if (dto.deputyRepresentativeLegendaryId) await this.ensureLegendaryExists(dto.deputyRepresentativeLegendaryId);
  }
  private async createTopLeadershipHistory(before: any, after: any, dto: Partial<CreateTopDto>, actorUserId?: string) {
    const entries: Array<[keyof CreateTopDto, LegendaryHistoryType, string, string]> = [
      ['representativeLegendaryId', LegendaryHistoryType.TOP_REPRESENTATIVE_ASSIGNED, 'Representante de TOP definido', `Definido como representante do ${after.name}.`],
      ['deputyRepresentativeLegendaryId', LegendaryHistoryType.TOP_DEPUTY_ASSIGNED, 'Sub-representante de TOP definido', `Definido como sub-representante do ${after.name}.`],
      ['familyCoordinatorLegendaryId', LegendaryHistoryType.TOP_FAMILY_COORDINATOR_ASSIGNED, 'Coordenador de familias definido', `Definido como coordenador das familias do ${after.name}.`],
      ['familyDeputyCoordinatorLegendaryId', LegendaryHistoryType.TOP_FAMILY_DEPUTY_COORDINATOR_ASSIGNED, 'Subcoordenador de familias definido', `Definido como subcoordenador das familias do ${after.name}.`],
      ['familyGeneralCoordinatorLegendaryId', LegendaryHistoryType.TOP_FAMILY_GENERAL_COORDINATOR_ASSIGNED, 'Coordenador geral de familias definido', `Definido como coordenador geral das familias do ${after.name}.`],
    ];
    for (const [field, type, title, description] of entries) {
      const legendaryId = after[field];
      if (field in dto && legendaryId && before[field] !== legendaryId) await this.createHistory(legendaryId, type, title, description, actorUserId, { topEventId: after.id });
    }
  }
  private async auditFamilyFieldChanges(before: any, after: any, dto: UpdateTopFamilyDto, actorUserId?: string) {
    const fields = ['representativeLegendaryId', 'representativeRole', 'deputyRepresentativeLegendaryId', 'deputyRepresentativeRole', 'needsReview'];
    for (const field of fields) {
      if (field in dto && before[field] !== after[field]) await this.audit.create({ actorUserId, entityType: 'TopFamily', entityId: after.id, action: `update_${field}`, before: { [field]: before[field] }, after: { [field]: after[field] } });
    }
  }
  private async ensureFamilyNameAvailable(topEventId: string, name: string, currentId?: string) {
    const existing = await this.prisma.topFamily.findFirst({ where: { topEventId, deletedAt: null, name: { equals: name.trim(), mode: 'insensitive' } } });
    if (existing && existing.id !== currentId) throw new BadRequestException('Family name already exists in this TOP.');
  }
  private async findExistingFamily(topEventId: string, id: string) { const family = await this.prisma.topFamily.findFirst({ where: { id, topEventId, deletedAt: null }, include: includeFamily }); if (!family) throw new NotFoundException('Family not found.'); return family; }
  private async findExistingFamilyMember(topEventId: string, topFamilyId: string, id: string) { const member = await this.prisma.topFamilyMember.findFirst({ where: { id, topEventId, topFamilyId, deletedAt: null }, include: includeFamilyMember }); if (!member) throw new NotFoundException('Family member not found.'); return member; }
  private async findEligibleFamilyParticipant(topEventId: string, topParticipantId: string) {
    const participant = await this.prisma.topParticipant.findFirst({ where: { id: topParticipantId, topEventId, deletedAt: null, status: { not: TopParticipantStatus.CANCELLED } }, include: includeParticipant });
    if (!participant) throw new BadRequestException('Participant must be active in this TOP.');
    return participant;
  }
  private async ensureParticipantNotInActiveFamily(topEventId: string, topParticipantId: string) {
    if (await this.prisma.topFamilyMember.findFirst({ where: { topEventId, topParticipantId, status: TopFamilyMemberStatus.ACTIVE, deletedAt: null } })) throw new BadRequestException('Participant already belongs to an active family in this TOP.');
  }
  private async createHistory(legendaryId: string, type: LegendaryHistoryType, title: string, description: string, actorUserId: string | undefined, context: { topEventId?: string | null; teamId?: string | null; topFamilyId?: string | null; metadata?: any }, db: Prisma.TransactionClient = this.prisma) {
    if (!db.legendaryHistory) return;
    await db.legendaryHistory.create({ data: { legendaryId, type, title, description, actorUserId, topEventId: context.topEventId, teamId: context.teamId, topFamilyId: context.topFamilyId, metadata: context.metadata } });
  }
}
