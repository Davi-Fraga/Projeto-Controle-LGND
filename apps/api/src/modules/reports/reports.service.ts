import { BadRequestException, Injectable } from '@nestjs/common';
import { getPagination, PaginationDto, toPaginatedResponse } from '../../common/pagination/pagination.dto';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async legendarios(query: PaginationDto) {
    const { page, perPage, skip, take } = getPagination(query);
    const where = { deletedAt: null };
    const [items, total] = await Promise.all([
      this.prisma.legendary.findMany({ where, include: { church: true, profession: true, expertises: { include: { expertise: true } } }, orderBy: { fullName: 'asc' }, skip, take }),
      this.prisma.legendary.count({ where }),
    ]);
    return toPaginatedResponse(items.map((item: any) => this.legendaryRow(item)), total, page, perPage);
  }

  byCity() { return this.groupLegendarios('city'); }
  byChurch() { return this.prisma.church.findMany({ where: { deletedAt: null }, select: { id: true, name: true, city: true, _count: { select: { legendarios: { where: { deletedAt: null } } } } }, orderBy: { name: 'asc' } }); }
  byTeam() { return this.prisma.team.findMany({ where: { deletedAt: null }, select: { id: true, name: true, _count: { select: { memberships: { where: { deletedAt: null, status: 'ACTIVE' } } } } }, orderBy: { name: 'asc' } }); }
  byProfession() { return this.prisma.profession.findMany({ where: { deletedAt: null }, select: { id: true, name: true, _count: { select: { legendarios: { where: { deletedAt: null } } } } }, orderBy: { name: 'asc' } }); }
  byExpertise() { return this.prisma.expertise.findMany({ where: { deletedAt: null }, select: { id: true, name: true, _count: { select: { legendarios: true } } }, orderBy: { name: 'asc' } }); }
  socialInterested() { return this.prisma.legendary.findMany({ where: { deletedAt: null, socialActionInterest: true }, select: { id: true, fullName: true, city: true, profession: true }, orderBy: { fullName: 'asc' } }); }

  topParticipants(topId: string) { return this.prisma.topParticipant.findMany({ where: { topEventId: topId, deletedAt: null }, include: { legendary: true }, orderBy: { createdAt: 'asc' } }); }
  topServants(topId: string) { return this.prisma.topServant.findMany({ where: { topEventId: topId, deletedAt: null }, include: { legendary: true, team: true }, orderBy: { createdAt: 'asc' } }); }
  topFamilies(topId: string) { return this.prisma.topFamily.findMany({ where: { topEventId: topId, deletedAt: null }, include: { representative: true, deputyRepresentative: true, members: { where: { deletedAt: null }, include: { topParticipant: { include: { legendary: true } } } } }, orderBy: { name: 'asc' } }); }
  socialActionParticipants(id: string) { return this.prisma.socialActionParticipant.findMany({ where: { socialActionId: id, deletedAt: null }, include: { legendary: true }, orderBy: { createdAt: 'asc' } }); }

  async exportLegendarios(actorUserId?: string) {
    const rows = (await this.prisma.legendary.findMany({ where: { deletedAt: null }, include: { church: true, profession: true }, orderBy: { fullName: 'asc' } })).map((item: any) => ({ nome: item.fullName, lgnd: item.lgndNumber ?? '', cidade: item.city ?? '', igreja: item.church?.name ?? '', profissao: item.profession?.name ?? '', status: item.status, interesseSocial: item.socialActionInterest ? 'sim' : 'nao' }));
    await this.audit.create({ actorUserId, entityType: 'Report', action: 'export_legendarios_csv' });
    return this.toCsv(rows);
  }

  async exportTopParticipants(topId: string, actorUserId?: string) { const rows = (await this.topParticipants(topId)).map((item: any) => ({ nome: item.legendary.fullName, lgnd: item.legendary.lgndNumber ?? '', tipo: item.type, status: item.status })); await this.audit.create({ actorUserId, entityType: 'Report', entityId: topId, action: 'export_top_participants_csv' }); return this.toCsv(rows); }
  async exportTopServants(topId: string, actorUserId?: string) { const rows = (await this.topServants(topId)).map((item: any) => ({ nome: item.legendary.fullName, lgnd: item.legendary.lgndNumber ?? '', equipe: item.team?.name ?? '', funcao: item.role ?? '', status: item.status })); await this.audit.create({ actorUserId, entityType: 'Report', entityId: topId, action: 'export_top_servants_csv' }); return this.toCsv(rows); }
  async exportTopFamilies(topId: string, actorUserId?: string) { const rows = (await this.topFamilies(topId)).flatMap((family: any) => family.members.length ? family.members.map((member: any) => ({ familia: family.name, representante: family.representative.fullName, subRepresentante: family.deputyRepresentative?.fullName ?? '', membro: member.topParticipant.legendary.fullName, status: member.status })) : [{ familia: family.name, representante: family.representative.fullName, subRepresentante: family.deputyRepresentative?.fullName ?? '', membro: '', status: '' }]); await this.audit.create({ actorUserId, entityType: 'Report', entityId: topId, action: 'export_top_families_csv' }); return this.toCsv(rows); }
  async exportSocialActionParticipants(id: string, actorUserId?: string) { const rows = (await this.socialActionParticipants(id)).map((item: any) => ({ nome: item.legendary.fullName, lgnd: item.legendary.lgndNumber ?? '', funcao: item.role ?? '', status: item.status, presente: item.attended ? 'sim' : 'nao' })); await this.audit.create({ actorUserId, entityType: 'Report', entityId: id, action: 'export_social_action_participants_csv' }); return this.toCsv(rows); }

  private async groupLegendarios(field: 'city') {
    const items = await this.prisma.legendary.groupBy({ by: [field], where: { deletedAt: null }, _count: { _all: true } });
    return items.map((item: any) => ({ value: item[field] ?? 'Nao informado', count: item._count._all })).sort((a, b) => b.count - a.count);
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
