import { BadRequestException, Injectable } from '@nestjs/common';
import { AccessPolicyService } from '../../common/access/access-policy.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { getPagination, PaginationDto, toPaginatedResponse } from '../../common/pagination/pagination.dto';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly accessPolicy: AccessPolicyService,
  ) {}

  async legendarios(query: PaginationDto, user: AuthenticatedUser) {
    const { page, perPage, skip, take } = getPagination(query);
    const where: any = { deletedAt: null };
    const scope = await this.accessPolicy.resolveScope(user);
    if (!scope.isAdmin) {
      where.AND = [this.accessPolicy.buildLegendaryWhere(scope)];
    }
    const [items, total] = await Promise.all([
      this.prisma.legendary.findMany({ where, include: { church: true, profession: true, expertises: { include: { expertise: true } } }, orderBy: { fullName: 'asc' }, skip, take }),
      this.prisma.legendary.count({ where }),
    ]);
    return toPaginatedResponse(items.map((item: any) => this.legendaryRow(item)), total, page, perPage);
  }

  async byCity(user: AuthenticatedUser) {
    const scope = await this.accessPolicy.resolveScope(user);
    const scopeFilter = scope.isAdmin ? undefined : this.accessPolicy.buildLegendaryWhere(scope);
    return this.groupLegendarios('city', scopeFilter);
  }

  async byChurch(user: AuthenticatedUser) {
    const scope = await this.accessPolicy.resolveScope(user);
    const scopeFilter = this.accessPolicy.buildChurchWhere(scope);
    return this.prisma.church.findMany({
      where: { deletedAt: null, ...scopeFilter },
      select: { id: true, name: true, city: true, _count: { select: { legendarios: { where: { deletedAt: null } } } } },
      orderBy: { name: 'asc' },
    });
  }

  async byTeam(user: AuthenticatedUser) {
    const scope = await this.accessPolicy.resolveScope(user);
    const scopeFilter = this.accessPolicy.buildTeamWhere(scope);
    return this.prisma.team.findMany({
      where: { deletedAt: null, ...scopeFilter },
      select: { id: true, name: true, _count: { select: { memberships: { where: { deletedAt: null, status: 'ACTIVE' } } } } },
      orderBy: { name: 'asc' },
    });
  }

  byProfession() { return this.prisma.profession.findMany({ where: { deletedAt: null }, select: { id: true, name: true, _count: { select: { legendarios: { where: { deletedAt: null } } } } }, orderBy: { name: 'asc' } }); }
  byExpertise() { return this.prisma.expertise.findMany({ where: { deletedAt: null }, select: { id: true, name: true, _count: { select: { legendarios: true } } }, orderBy: { name: 'asc' } }); }

  async socialInterested(user: AuthenticatedUser) {
    const scope = await this.accessPolicy.resolveScope(user);
    const where: any = { deletedAt: null, socialActionInterest: true };
    if (!scope.isAdmin) {
      where.AND = [this.accessPolicy.buildLegendaryWhere(scope)];
    }
    return this.prisma.legendary.findMany({ where, select: { id: true, fullName: true, city: true, profession: true }, orderBy: { fullName: 'asc' } });
  }

  topParticipants(topId: string) { return this.prisma.topParticipant.findMany({ where: { topEventId: topId, deletedAt: null }, include: { legendary: true }, orderBy: { createdAt: 'asc' } }); }
  topServants(topId: string) { return this.prisma.topServant.findMany({ where: { topEventId: topId, deletedAt: null }, include: { legendary: true, team: true }, orderBy: { createdAt: 'asc' } }); }
  topFamilies(topId: string) { return this.prisma.topFamily.findMany({ where: { topEventId: topId, deletedAt: null }, include: { representative: true, deputyRepresentative: true, members: { where: { deletedAt: null }, include: { topParticipant: { include: { legendary: true } } } } }, orderBy: { name: 'asc' } }); }
  socialActionParticipants(id: string) { return this.prisma.socialActionParticipant.findMany({ where: { socialActionId: id, deletedAt: null }, include: { legendary: true }, orderBy: { createdAt: 'asc' } }); }

  async pendingReview() {
    const [legendarios, tops, families, members] = await Promise.all([
      this.prisma.legendary.findMany({ where: { deletedAt: null, needsReview: true }, select: { id: true, fullName: true, city: true, notes: true }, orderBy: { fullName: 'asc' }, take: 100 }),
      this.prisma.topEvent.findMany({ where: { deletedAt: null, OR: [{ needsReview: true }, { familyCoordinatorLegendaryId: null }] }, select: { id: true, name: true, number: true, city: true, needsReview: true, familyCoordinatorLegendaryId: true }, orderBy: { startDate: 'desc' }, take: 100 }),
      this.prisma.topFamily.findMany({ where: { deletedAt: null, OR: [{ needsReview: true }, { representativeLegendaryId: null }] }, include: { topEvent: true, representative: true }, orderBy: { name: 'asc' }, take: 100 }),
      this.prisma.topFamilyMember.findMany({ where: { deletedAt: null, needsReview: true }, include: { topFamily: true, topParticipant: { include: { legendary: true } } }, orderBy: { createdAt: 'desc' }, take: 100 }),
    ]);
    return [
      ...legendarios.map((item: any) => ({ tipo: 'Legendario', id: item.id, nome: item.fullName, contexto: item.city ?? '', motivo: 'Marcado para revisar', observacao: item.notes ?? '' })),
      ...tops.map((item: any) => ({ tipo: 'TOP', id: item.id, nome: `${item.name} #${item.number}`, contexto: item.city, motivo: item.familyCoordinatorLegendaryId ? 'Marcado para revisar' : 'Sem coordenador de familias', observacao: '' })),
      ...families.map((item: any) => ({ tipo: 'Familia', id: item.id, nome: item.name, contexto: item.topEvent?.name ?? '', motivo: item.representativeLegendaryId ? 'Marcada para revisar' : 'Sem representante', observacao: item.notes ?? '' })),
      ...members.map((item: any) => ({ tipo: 'Membro de familia', id: item.id, nome: item.topParticipant?.legendary?.fullName ?? '', contexto: item.topFamily?.name ?? '', motivo: 'Marcado para revisar', observacao: item.sourceNotes ?? item.notes ?? '' })),
    ];
  }

  async exportLegendarios(user: AuthenticatedUser, actorUserId?: string) {
    const scope = await this.accessPolicy.resolveScope(user);
    const where: any = { deletedAt: null };
    if (!scope.isAdmin) {
      where.AND = [this.accessPolicy.buildLegendaryWhere(scope)];
    }
    const rows = (await this.prisma.legendary.findMany({ where, include: { church: true, profession: true }, orderBy: { fullName: 'asc' } }))
      .map((item: any) => ({ nome: item.fullName, lgnd: item.lgndNumber ?? '', cidade: item.city ?? '', igreja: item.church?.name ?? '', profissao: item.profession?.name ?? '', status: item.status, interesseSocial: item.socialActionInterest ? 'sim' : 'nao' }));
    await this.audit.create({ actorUserId, entityType: 'Report', action: 'export_legendarios_csv' });
    return this.toCsv(rows);
  }

  async exportTopParticipants(topId: string, actorUserId?: string) { const rows = (await this.topParticipants(topId)).map((item: any) => ({ nome: item.legendary.fullName, lgnd: item.legendary.lgndNumber ?? '', tipo: item.type, status: item.status })); await this.audit.create({ actorUserId, entityType: 'Report', entityId: topId, action: 'export_top_participants_csv' }); return this.toCsv(rows); }
  async exportTopServants(topId: string, actorUserId?: string) { const rows = (await this.topServants(topId)).map((item: any) => ({ nome: item.legendary.fullName, lgnd: item.legendary.lgndNumber ?? '', equipe: item.team?.name ?? '', funcao: item.role ?? '', status: item.status })); await this.audit.create({ actorUserId, entityType: 'Report', entityId: topId, action: 'export_top_servants_csv' }); return this.toCsv(rows); }
  async exportTopFamilies(topId: string, actorUserId?: string) { const rows = (await this.topFamilies(topId)).flatMap((family: any) => family.members.length ? family.members.map((member: any) => ({ familia: family.name, representante: family.representative?.fullName ?? '', funcaoRepresentante: family.representativeRole ?? '', subRepresentante: family.deputyRepresentative?.fullName ?? '', funcaoSub: family.deputyRepresentativeRole ?? '', membro: member.topParticipant.legendary.fullName, status: member.status, revisar: member.needsReview ? 'sim' : 'nao' })) : [{ familia: family.name, representante: family.representative?.fullName ?? '', funcaoRepresentante: family.representativeRole ?? '', subRepresentante: family.deputyRepresentative?.fullName ?? '', funcaoSub: family.deputyRepresentativeRole ?? '', membro: '', status: '', revisar: family.needsReview ? 'sim' : 'nao' }]); await this.audit.create({ actorUserId, entityType: 'Report', entityId: topId, action: 'export_top_families_csv' }); return this.toCsv(rows); }
  async exportSocialActionParticipants(id: string, actorUserId?: string) { const rows = (await this.socialActionParticipants(id)).map((item: any) => ({ nome: item.legendary.fullName, lgnd: item.legendary.lgndNumber ?? '', funcao: item.role ?? '', status: item.status, presente: item.attended ? 'sim' : 'nao' })); await this.audit.create({ actorUserId, entityType: 'Report', entityId: id, action: 'export_social_action_participants_csv' }); return this.toCsv(rows); }

  private async groupLegendarios(field: 'city', scopeFilter?: any) {
    const where: any = { deletedAt: null };
    if (scopeFilter) where.AND = [scopeFilter];
    const items = await this.prisma.legendary.groupBy({ by: [field], where, _count: { _all: true } });
    return items.map((item: any) => ({ value: item[field] ?? 'Nao informado', count: item._count._all })).sort((a: any, b: any) => b.count - a.count);
  }

  private legendaryRow(item: any) { return { ...item, phone: undefined, expertises: item.expertises.map((entry: any) => entry.expertise) }; }

  private toCsv(rows: Record<string, any>[]) {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const escape = (value: any) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    return [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n');
  }

  ensureCsv(format?: string) { if (format && format !== 'csv') throw new BadRequestException('Only CSV export is available now.'); }
}
