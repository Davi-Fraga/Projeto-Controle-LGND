import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LegendaryHistoryType, LegendaryStatus, TeamMembershipStatus } from '@central-da-manada/shared';
import { AccessPolicyService } from '../../common/access/access-policy.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { getPagination, toPaginatedResponse } from '../../common/pagination/pagination.dto';
import { OptionsQueryDto } from '../../common/options/options-query.dto';
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
  firstTopEvent: true,
  firstTopFamily: true,
  topServants: {
    where: { deletedAt: null },
    include: {
      topEvent: true,
      team: true,
    },
  },
};

@Injectable()
export class LegendariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly accessPolicy: AccessPolicyService,
  ) {}

  async findAll(query: LegendarioQueryDto, user: AuthenticatedUser) {
    const { page, perPage, skip, take } = getPagination(query);
    const where: any = {
      deletedAt: null,
      status: query.status,
      city: query.city ? { contains: query.city, mode: 'insensitive' } : undefined,
      churchId: query.churchId,
      professionId: query.professionId,
      socialActionInterest: query.socialActionInterest,
      isFromRotaDoCerrado: query.isFromRotaDoCerrado,
      needsReview: query.needsReview,
      expertises: query.expertiseId
        ? { some: { expertiseId: query.expertiseId } }
        : undefined,
    };

    const searchOr = this.buildSearchOr(query.search);
    if (searchOr) where.OR = searchOr;

    const scope = await this.accessPolicy.resolveScope(user);
    if (!scope.isAdmin) {
      where.AND = [...(where.AND ?? []), this.accessPolicy.buildLegendaryWhere(scope)];
    }
    if (query.teamId) {
      where.teamMemberships = {
        some: {
          ...this.accessPolicy.buildTeamMembershipWhere(scope, query.teamId),
          status: TeamMembershipStatus.ACTIVE,
          deletedAt: null,
          team: { deletedAt: null },
        },
      };
    }

    const orderBy = { [query.orderBy ?? 'fullName']: query.orderDirection ?? 'asc' };
    const [items, total] = await Promise.all([
      this.prisma.legendary.findMany({ where, include: includeLegendario, orderBy, skip, take }),
      this.prisma.legendary.count({ where }),
    ]);

    // email/birthDate são dados pessoais sensíveis (change sincronizar-legendarios-via-forms,
    // D12): NUNCA em listagens gerais, para ninguém.
    return toPaginatedResponse(
      items.map((item: any) => this.stripSensitive(this.toResponse(item))),
      total,
      page,
      perPage,
    );
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const scope = await this.accessPolicy.resolveScope(user);
    const where: any = { id, deletedAt: null };
    if (!scope.isAdmin) {
      where.AND = [this.accessPolicy.buildLegendaryDetailWhere(scope)];
    }

    const legendario = await this.prisma.legendary.findFirst({
      where,
      include: includeLegendario,
    });

    if (!legendario) {
      throw new NotFoundException('Legendario not found.');
    }

    // Detalhe administrativo: email/birthDate (dados pessoais sensíveis, D12) só para
    // escopo irrestrito (Administrador). Papéis escopados não recebem esses campos.
    const response = this.toResponse(legendario);
    return scope.isAdmin ? response : this.stripSensitive(response);
  }

  async options(query: OptionsQueryDto, user: AuthenticatedUser) {
    const where: any = { deletedAt: null };
    if (query.activeOnly !== false) where.status = { not: LegendaryStatus.INACTIVE };
    const searchOr = this.buildSearchOr(query.search);
    if (searchOr) where.OR = searchOr;

    const scope = await this.accessPolicy.resolveScope(user);
    if (!scope.isAdmin) {
      where.AND = [...(where.AND ?? []), this.accessPolicy.buildLegendaryWhere(scope)];
    }

    const items = await this.prisma.legendary.findMany({
      where,
      select: { id: true, fullName: true, lgndNumber: true, city: true, church: { select: { name: true } } },
      orderBy: { fullName: 'asc' },
      take: query.limit ?? 20,
    });

    return items.map((item: any) => ({
      id: item.id,
      label: item.lgndNumber ? `${item.fullName} - LGND ${item.lgndNumber}` : item.fullName,
      value: item.id,
      metadata: { fullName: item.fullName, lgndNumber: item.lgndNumber, city: item.city, church: item.church?.name },
    }));
  }

  async create(dto: CreateLegendarioDto, actorUserId?: string, db: Prisma.TransactionClient = this.prisma) {
    await this.validateRelations(dto);
    await this.ensureLgndIsAvailable(dto.lgndNumber);

    const legendario = await db.legendary.create({
      data: {
        ...this.toData(dto),
        expertises: {
          create: (dto.expertiseIds ?? []).map((expertiseId) => ({ expertiseId })),
        },
      },
      include: includeLegendario,
    });

    await this.handleServiceInfo(legendario.id, dto, actorUserId, db);

    await this.audit.create({
      actorUserId,
      entityType: 'Legendary',
      entityId: legendario.id,
      action: 'create',
      after: this.toResponse(legendario),
    }, db);
    await this.createHistory(legendario.id, LegendaryHistoryType.LEGENDARY_CREATED, 'Legendário criado', 'Cadastro do legendário criado.', actorUserId, undefined, db);

    if (dto.firstTopIsExternal) {
      await this.createHistory(
        legendario.id,
        LegendaryHistoryType.MANUAL_NOTE,
        'Primeira Montanha (Outra Rota)',
        `Subiu a primeira montanha em outra rota/TOP de origem: ${dto.firstTopExternalText}.${dto.firstTopNotes ? ` Obs.: ${dto.firstTopNotes}` : ''}`,
        actorUserId,
        undefined,
        db
      );
    } else if (dto.firstTopEventId) {
      const topEvent = await db.topEvent.findUnique({ where: { id: dto.firstTopEventId } });
      const family = dto.firstTopFamilyId ? await db.topFamily.findUnique({ where: { id: dto.firstTopFamilyId } }) : null;
      await this.createHistory(
        legendario.id,
        LegendaryHistoryType.TOP_PARTICIPATED,
        'Primeira Montanha',
        `Subiu a primeira montanha no TOP #${topEvent?.number} - ${topEvent?.name} na Família ${family?.name || ''}.${dto.firstTopNotes ? ` Obs.: ${dto.firstTopNotes}` : ''}`,
        actorUserId,
        { topEventId: dto.firstTopEventId, topFamilyId: dto.firstTopFamilyId },
        db
      );
    }

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

      const updated = await tx.legendary.update({
        where: { id },
        data: {
          ...this.toData(dto, { fullName: before.fullName, city: before.city, lgndNumber: before.lgndNumber }),
          expertises: dto.expertiseIds
            ? {
                create: dto.expertiseIds.map((expertiseId) => ({ expertiseId })),
              }
            : undefined,
        },
        include: includeLegendario,
      });

      return updated;
    });

    await this.handleServiceInfo(id, dto, actorUserId);

    await this.audit.create({
      actorUserId,
      entityType: 'Legendary',
      entityId: id,
      action: 'update',
      before: this.toResponse(before),
      after: this.toResponse(after),
    });
    if ('needsReview' in dto && before.needsReview !== after.needsReview) {
      await this.audit.create({
        actorUserId,
        entityType: 'Legendary',
        entityId: id,
        action: 'update_needs_review',
        before: { needsReview: before.needsReview },
        after: { needsReview: after.needsReview },
      });
    }
    await this.createHistory(id, LegendaryHistoryType.LEGENDARY_UPDATED, 'Legendário atualizado', 'Cadastro do legendário atualizado.', actorUserId);

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

  async findHistory(id: string, query: LegendaryHistoryQueryDto, user: AuthenticatedUser) {
    await this.assertAccessible(id, user);
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

  async addHistoryNote(id: string, dto: CreateLegendaryHistoryNoteDto, user: AuthenticatedUser) {
    await this.assertAccessible(id, user);
    return this.prisma.legendaryHistory.create({
      data: {
        legendaryId: id,
        type: LegendaryHistoryType.MANUAL_NOTE,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        actorUserId: user.sub,
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
    const after = await this.prisma.$transaction(async (tx: any) => {
      // Transição (change hierarquia-limites-organograma): ao inativar um gestor, seus
      // geridos voltam para "sem gestor" (vínculo nulo) para o admin redistribuir.
      // Cidade: quem este legendário lidera.
      await tx.legendary.updateMany({ where: { cityLeaderId: id }, data: { cityLeaderId: null } });
      // Equipe: integrantes geridos por qualquer membership deste legendário.
      const memberships = await tx.teamMembership.findMany({ where: { legendaryId: id }, select: { id: true } });
      const membershipIds = memberships.map((m: any) => m.id);
      if (membershipIds.length) {
        await tx.teamMembership.updateMany({ where: { managerMembershipId: { in: membershipIds } }, data: { managerMembershipId: null } });
      }
      return tx.legendary.update({
        where: { id },
        data: { deletedAt: new Date(), status: LegendaryStatus.INACTIVE },
        include: includeLegendario,
      });
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

  private async assertAccessible(id: string, user: AuthenticatedUser) {
    const scope = await this.accessPolicy.resolveScope(user);
    const where: any = { id, deletedAt: null };
    if (!scope.isAdmin) {
      where.AND = [this.accessPolicy.buildLegendaryWhere(scope)];
    }
    const exists = await this.prisma.legendary.findFirst({ where, select: { id: true } });
    if (!exists) throw new NotFoundException('Legendario not found.');
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

    if (dto.firstTopIsExternal) {
      if (!dto.firstTopExternalText?.trim()) {
        throw new BadRequestException('Informe a rota/TOP de origem para TOP externo.');
      }
    } else {
      if (dto.firstTopEventId) {
        const top = await this.prisma.topEvent.findFirst({ where: { id: dto.firstTopEventId, deletedAt: null } });
        if (!top) throw new BadRequestException('Primeiro TOP não existe.');
      }
      if (dto.firstTopFamilyId) {
        const family = await this.prisma.topFamily.findFirst({ where: { id: dto.firstTopFamilyId, deletedAt: null } });
        if (!family) throw new BadRequestException('Família não existe.');
        if (dto.firstTopEventId && family.topEventId !== dto.firstTopEventId) {
          throw new BadRequestException('A família deve pertencer ao TOP selecionado.');
        }
      }
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

  private toData(
    dto: Partial<CreateLegendarioDto>,
    current?: { fullName?: string | null; city?: string | null; lgndNumber?: string | null },
  ) {
    const data: any = {};
    if ('fullName' in dto) data.fullName = dto.fullName?.trim();
    if ('lgndNumber' in dto) data.lgndNumber = dto.lgndNumber?.trim() || null;
    if ('phone' in dto) data.phone = dto.phone ? this.normalizePhone(dto.phone) : null;
    if ('city' in dto) data.city = dto.city?.trim() || null;

    // Recalcula searchText quando algum campo buscável muda, mesclando com os valores atuais.
    if ('fullName' in dto || 'city' in dto || 'lgndNumber' in dto) {
      const fullName = 'fullName' in dto ? data.fullName : current?.fullName;
      const city = 'city' in dto ? data.city : current?.city;
      const lgndNumber = 'lgndNumber' in dto ? data.lgndNumber : current?.lgndNumber;
      data.searchText = this.buildSearchText(fullName, city, lgndNumber);
    }
    if ('isFromRotaDoCerrado' in dto) data.isFromRotaDoCerrado = dto.isFromRotaDoCerrado;
    if ('churchId' in dto) data.churchId = dto.churchId || null;
    if ('servesInChurch' in dto) data.servesInChurch = dto.servesInChurch;
    if ('churchRole' in dto) data.churchRole = dto.churchRole?.trim() || null;
    if ('professionId' in dto) data.professionId = dto.professionId || null;
    if ('status' in dto) data.status = dto.status;
    if ('socialActionInterest' in dto) data.socialActionInterest = dto.socialActionInterest;
    if ('notes' in dto) data.notes = dto.notes?.trim() || null;
    if ('needsReview' in dto) data.needsReview = dto.needsReview;

    if ('firstTopIsExternal' in dto) data.firstTopIsExternal = dto.firstTopIsExternal ?? false;
    if ('firstTopEventId' in dto) data.firstTopEventId = dto.firstTopEventId || null;
    if ('firstTopFamilyId' in dto) data.firstTopFamilyId = dto.firstTopFamilyId || null;
    if ('firstTopExternalText' in dto) data.firstTopExternalText = dto.firstTopExternalText?.trim() || null;
    if ('firstTopNotes' in dto) data.firstTopNotes = dto.firstTopNotes?.trim() || null;
    return data;
  }

  private normalizePhone(phone: string) {
    return phone.replace(/\D/g, '');
  }

  /** Normaliza texto para busca/armazenamento: sem acento, minúsculo, espaços colapsados. */
  private normalizeSearch(value: string) {
    return value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Monta o valor de `searchText` a partir dos campos textuais buscáveis. */
  private buildSearchText(...parts: (string | null | undefined)[]) {
    return this.normalizeSearch(parts.filter(Boolean).join(' '));
  }

  /**
   * Constrói o `OR` de busca. Termos textuais batem no `searchText` (acento/caixa
   * insensível); termos numéricos batem no `phone`. Só inclui clauses não-vazias —
   * evita o bug de `contains: ''`, que casava todos os registros.
   */
  private buildSearchOr(search?: string): any[] | undefined {
    if (!search) return undefined;
    const term = this.normalizeSearch(search);
    const digits = this.normalizePhone(search);
    const or: any[] = [];
    if (term) or.push({ searchText: { contains: term } });
    if (digits) or.push({ phone: { contains: digits } });
    return or.length ? or : undefined;
  }

  private toResponse(legendario: any) {
    return {
      ...legendario,
      expertises: (legendario.expertises ?? []).map((item: any) => item.expertise),
    };
  }

  /**
   * Remove dados pessoais sensíveis (email, data de nascimento) da resposta HTTP.
   * D12: só o escopo administrativo irrestrito vê esses campos, e nunca em listagens.
   * Não afeta o que é persistido nem os registros de auditoria (internos).
   */
  private stripSensitive(response: any) {
    if (!response) return response;
    const rest = { ...response };
    delete rest.email;
    delete rest.birthDate;
    return rest;
  }

  private async createHistory(
    legendaryId: string,
    type: LegendaryHistoryType,
    title: string,
    description: string,
    actorUserId?: string,
    context?: { topEventId?: string | null; teamId?: string | null; topFamilyId?: string | null },
    db: Prisma.TransactionClient = this.prisma
  ) {
    if (!db.legendaryHistory) return;
    await db.legendaryHistory.create({
      data: {
        legendaryId,
        type,
        title,
        description,
        actorUserId,
        topEventId: context?.topEventId || null,
        teamId: context?.teamId || null,
        topFamilyId: context?.topFamilyId || null,
      },
    });
  }

  private async handleServiceInfo(legendaryId: string, dto: Partial<CreateLegendarioDto>, actorUserId?: string, db: Prisma.TransactionClient = this.prisma) {
    if (dto.alreadyServedAsService && dto.serviceTopEventId && dto.serviceTeamId) {
      const topTeamExists = await db.topTeam.findFirst({
        where: { topEventId: dto.serviceTopEventId, teamId: dto.serviceTeamId, deletedAt: null }
      });
      if (!topTeamExists) {
        await db.topTeam.create({
          data: {
            topEventId: dto.serviceTopEventId,
            teamId: dto.serviceTeamId
          }
        });
      }

      const existingServant = await db.topServant.findFirst({
        where: {
          topEventId: dto.serviceTopEventId,
          legendaryId,
          teamId: dto.serviceTeamId,
          deletedAt: null,
          status: { not: 'CANCELLED' }
        }
      });

      if (!existingServant) {
        const topServant = await db.topServant.create({
          data: {
            topEventId: dto.serviceTopEventId,
            legendaryId,
            teamId: dto.serviceTeamId,
            role: dto.serviceRole?.trim() || null,
            status: 'COMPLETED',
            notes: dto.serviceNotes?.trim() || null
          },
          include: { team: true }
        });

        await this.createHistory(
          legendaryId,
          LegendaryHistoryType.TOP_SERVED,
          'Serviu em TOP',
          `Adicionado como servo do TOP${topServant.team?.name ? ` na equipe ${topServant.team.name}` : ''}.`,
          actorUserId,
          { topEventId: dto.serviceTopEventId, teamId: dto.serviceTeamId },
          db
        );
      } else {
        await db.topServant.update({
          where: { id: existingServant.id },
          data: {
            role: dto.serviceRole?.trim() || null,
            notes: dto.serviceNotes?.trim() || null
          }
        });
      }
    }
  }
}
