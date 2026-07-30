import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { TeamMembershipStatus } from '@central-da-manada/shared';
import { AccessPolicyService, AccessScope } from '../../common/access/access-policy.service';
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
    const scope = await this.accessPolicy.resolveScope(user);
    const where = this.legendaryWhereForScope(scope);
    const [items, total] = await Promise.all([
      this.prisma.legendary.findMany({ where, include: { church: true, profession: true, expertises: { include: { expertise: true } } }, orderBy: { fullName: 'asc' }, skip, take }),
      this.prisma.legendary.count({ where }),
    ]);
    return toPaginatedResponse(items.map((item: any) => this.legendaryRow(item)), total, page, perPage);
  }

  async byCity(user: AuthenticatedUser) {
    const scope = await this.accessPolicy.resolveScope(user);
    const scopeFilter = scope.isAdmin ? undefined : this.accessPolicy.buildCityWhere(scope);
    return this.groupLegendarios('city', scopeFilter);
  }

  async byChurch(user: AuthenticatedUser) {
    const legWhere = await this.scopedLegendaryWhere(user);
    return this.prisma.church.findMany({
      where: { deletedAt: null, legendarios: { some: legWhere } },
      select: { id: true, name: true, city: true, _count: { select: { legendarios: { where: legWhere } } } },
      orderBy: { name: 'asc' },
    });
  }

  async byTeam(user: AuthenticatedUser) {
    const legWhere = await this.scopedLegendaryWhere(user);
    const membershipWhere = {
      deletedAt: null,
      status: TeamMembershipStatus.ACTIVE,
      legendary: legWhere,
    };
    return this.prisma.team.findMany({
      where: { deletedAt: null, memberships: { some: membershipWhere } },
      select: { id: true, name: true, _count: { select: { memberships: { where: membershipWhere } } } },
      orderBy: { name: 'asc' },
    });
  }

  async byProfession(user: AuthenticatedUser) {
    const legWhere = await this.scopedLegendaryWhere(user);
    return this.prisma.profession.findMany({ where: { deletedAt: null, legendarios: { some: legWhere } }, select: { id: true, name: true, _count: { select: { legendarios: { where: legWhere } } } }, orderBy: { name: 'asc' } });
  }

  async byExpertise(user: AuthenticatedUser) {
    const legWhere = await this.scopedLegendaryWhere(user);
    const linkWhere = { legendary: legWhere };
    return this.prisma.expertise.findMany({ where: { deletedAt: null, legendarios: { some: linkWhere } }, select: { id: true, name: true, _count: { select: { legendarios: { where: linkWhere } } } }, orderBy: { name: 'asc' } });
  }

  // Where geográfico de legendário (deletedAt + escopo do usuário) para contagens.
  private async scopedLegendaryWhere(user: AuthenticatedUser): Promise<any> {
    const scope = await this.accessPolicy.resolveScope(user);
    return this.legendaryWhereForScope(scope);
  }

  async socialInterested(user: AuthenticatedUser) {
    const scope = await this.accessPolicy.resolveScope(user);
    const where: any = { deletedAt: null, socialActionInterest: true };
    if (!scope.isAdmin) {
      where.AND = [this.accessPolicy.buildCityWhere(scope)];
    }
    // `professionText` acompanha `profession` para a apresentação usar o fallback.
    return this.prisma.legendary.findMany({ where, select: { id: true, fullName: true, city: true, profession: true, professionText: true }, orderBy: { fullName: 'asc' } });
  }

  async topParticipants(topId: string, user: AuthenticatedUser) {
    await this.assertTopCityVisible(topId, user);
    return this.prisma.topParticipant.findMany({
      where: { topEventId: topId, deletedAt: null },
      include: { legendary: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async topServants(topId: string, user: AuthenticatedUser) {
    await this.assertTopCityVisible(topId, user);
    return this.prisma.topServant.findMany({
      where: { topEventId: topId, deletedAt: null },
      include: { legendary: true, team: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async topFamilies(topId: string, user: AuthenticatedUser) {
    await this.assertTopCityVisible(topId, user);
    return this.prisma.topFamily.findMany({
      where: { topEventId: topId, deletedAt: null },
      include: {
        representative: true,
        deputyRepresentative: true,
        members: {
          where: { deletedAt: null },
          include: { topParticipant: { include: { legendary: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async socialActionParticipants(id: string, user: AuthenticatedUser) {
    await this.assertSocialActionCityVisible(id, user);
    return this.prisma.socialActionParticipant.findMany({
      where: { socialActionId: id, deletedAt: null },
      include: { legendary: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async pendingReview(user: AuthenticatedUser) {
    const scope = await this.accessPolicy.resolveScope(user);
    const legendaryWhere = this.legendaryWhereForScope(scope, { needsReview: true });
    const topWhere = this.cityWhereForScope(scope, {
      deletedAt: null,
      OR: [{ needsReview: true }, { familyCoordinatorLegendaryId: null }],
    });
    const scopedTopRelation = this.cityWhereForScope(scope, { deletedAt: null });
    const [legendarios, tops, families, members] = await Promise.all([
      this.prisma.legendary.findMany({ where: legendaryWhere, select: { id: true, fullName: true, city: true, notes: true }, orderBy: { fullName: 'asc' }, take: 100 }),
      this.prisma.topEvent.findMany({ where: topWhere, select: { id: true, name: true, number: true, city: true, needsReview: true, familyCoordinatorLegendaryId: true }, orderBy: { startDate: 'desc' }, take: 100 }),
      this.prisma.topFamily.findMany({ where: { deletedAt: null, OR: [{ needsReview: true }, { representativeLegendaryId: null }], topEvent: scopedTopRelation }, include: { topEvent: true, representative: true }, orderBy: { name: 'asc' }, take: 100 }),
      this.prisma.topFamilyMember.findMany({ where: { deletedAt: null, needsReview: true, topEvent: scopedTopRelation }, include: { topFamily: true, topParticipant: { include: { legendary: true } } }, orderBy: { createdAt: 'desc' }, take: 100 }),
    ]);
    return [
      ...legendarios.map((item: any) => ({ tipo: 'Legendário', id: item.id, nome: item.fullName, contexto: item.city ?? '', motivo: 'Marcado para revisar', observacao: item.notes ?? '' })),
      ...tops.map((item: any) => ({ tipo: 'TOP', id: item.id, nome: `${item.name} #${item.number}`, contexto: item.city, motivo: item.familyCoordinatorLegendaryId ? 'Marcado para revisar' : 'Sem coordenador de famílias', observacao: '' })),
      ...families.map((item: any) => ({ tipo: 'Família', id: item.id, nome: item.name, contexto: item.topEvent?.name ?? '', motivo: item.representativeLegendaryId ? 'Marcada para revisar' : 'Sem representante', observacao: item.notes ?? '' })),
      ...members.map((item: any) => ({ tipo: 'Membro de família', id: item.id, nome: item.topParticipant?.legendary?.fullName ?? '', contexto: item.topFamily?.name ?? '', motivo: 'Marcado para revisar', observacao: item.notes ?? '' })),
    ];
  }

  async exportLegendarios(user: AuthenticatedUser, actorUserId?: string) {
    const scope = await this.accessPolicy.resolveScope(user);
    const where = this.legendaryWhereForScope(scope);
    const rows = (await this.prisma.legendary.findMany({ where, include: { church: true, profession: true }, orderBy: { fullName: 'asc' } }))
      // `profissao`: nome catalogado quando vinculado; texto livre preservado como fallback.
      .map((item: any) => ({ nome: item.fullName, lgnd: item.lgndNumber ?? '', cidade: item.city ?? '', igreja: item.church?.name ?? '', profissao: item.profession?.name ?? item.professionText ?? '', status: item.status, interesseSocial: item.socialActionInterest ? 'sim' : 'nao' }));
    await this.audit.create({ actorUserId, entityType: 'Report', action: 'export_legendarios_csv' });
    return this.toCsv(rows);
  }

  async exportTopParticipants(topId: string, user: AuthenticatedUser) { const rows = (await this.topParticipants(topId, user)).map((item: any) => ({ nome: item.legendary.fullName, lgnd: item.legendary.lgndNumber ?? '', tipo: item.type, status: item.status })); await this.audit.create({ actorUserId: user.sub, entityType: 'Report', entityId: topId, action: 'export_top_participants_csv' }); return this.toCsv(rows); }
  async exportTopServants(topId: string, user: AuthenticatedUser) { const rows = (await this.topServants(topId, user)).map((item: any) => ({ nome: item.legendary.fullName, lgnd: item.legendary.lgndNumber ?? '', equipe: item.team?.name ?? '', funcao: item.role ?? '', status: item.status })); await this.audit.create({ actorUserId: user.sub, entityType: 'Report', entityId: topId, action: 'export_top_servants_csv' }); return this.toCsv(rows); }
  async exportTopFamilies(topId: string, user: AuthenticatedUser) { const rows = (await this.topFamilies(topId, user)).flatMap((family: any) => family.members.length ? family.members.map((member: any) => ({ familia: family.name, representante: family.representative?.fullName ?? '', funcaoRepresentante: family.representativeRole ?? '', subRepresentante: family.deputyRepresentative?.fullName ?? '', funcaoSub: family.deputyRepresentativeRole ?? '', membro: member.topParticipant.legendary.fullName, status: member.status, revisar: member.needsReview ? 'sim' : 'nao' })) : [{ familia: family.name, representante: family.representative?.fullName ?? '', funcaoRepresentante: family.representativeRole ?? '', subRepresentante: family.deputyRepresentative?.fullName ?? '', funcaoSub: family.deputyRepresentativeRole ?? '', membro: '', status: '', revisar: family.needsReview ? 'sim' : 'nao' }]); await this.audit.create({ actorUserId: user.sub, entityType: 'Report', entityId: topId, action: 'export_top_families_csv' }); return this.toCsv(rows); }
  async exportSocialActionParticipants(id: string, user: AuthenticatedUser) { const rows = (await this.socialActionParticipants(id, user)).map((item: any) => ({ nome: item.legendary.fullName, lgnd: item.legendary.lgndNumber ?? '', funcao: item.role ?? '', status: item.status, presente: item.attended ? 'sim' : 'nao' })); await this.audit.create({ actorUserId: user.sub, entityType: 'Report', entityId: id, action: 'export_social_action_participants_csv' }); return this.toCsv(rows); }

  private legendaryWhereForScope(scope: AccessScope, extra: Record<string, unknown> = {}) {
    return this.cityWhereForScope(scope, { deletedAt: null, ...extra });
  }

  private cityWhereForScope(scope: AccessScope, base: Record<string, unknown>) {
    if (scope.isAdmin) return base;
    return {
      ...base,
      AND: [this.accessPolicy.buildCityWhere(scope)],
    };
  }

  private async assertTopCityVisible(topId: string, user: AuthenticatedUser) {
    const [scope, top] = await Promise.all([
      this.accessPolicy.resolveScope(user),
      this.prisma.topEvent.findFirst({
        where: { id: topId, deletedAt: null },
        select: { city: true },
      }),
    ]);
    if (!top) throw new NotFoundException('TOP event not found.');
    this.assertCityVisible(scope, top.city, 'TOP event not found.');
  }

  private async assertSocialActionCityVisible(id: string, user: AuthenticatedUser) {
    const [scope, action] = await Promise.all([
      this.accessPolicy.resolveScope(user),
      this.prisma.socialAction.findFirst({
        where: { id, deletedAt: null },
        select: { city: true },
      }),
    ]);
    if (!action) throw new NotFoundException('Social action not found.');
    this.assertCityVisible(scope, action.city ?? '', 'Social action not found.');
  }

  private assertCityVisible(scope: AccessScope, city: string, notFoundMessage: string) {
    try {
      this.accessPolicy.assertCityAllowed(scope, city);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw new NotFoundException(notFoundMessage);
      }
      throw error;
    }
  }

  private async groupLegendarios(field: 'city', scopeFilter?: any) {
    const where: any = { deletedAt: null };
    if (scopeFilter) where.AND = [scopeFilter];
    const items = await this.prisma.legendary.groupBy({ by: [field], where, _count: { _all: true } });
    return items.map((item: any) => ({ value: item[field] ?? 'Não informado', count: item._count._all })).sort((a: any, b: any) => b.count - a.count);
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
