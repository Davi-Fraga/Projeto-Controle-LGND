import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { cleanPhone, normalizeName } from '@central-da-manada/shared';
import { AccessPolicyService } from '../../common/access/access-policy.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { getPagination, toPaginatedResponse } from '../../common/pagination/pagination.dto';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ChurchQueryDto } from './dto/church-query.dto';
import { CreateChurchDto } from './dto/create-church.dto';
import { UpdateChurchDto } from './dto/update-church.dto';
import { GeocodingService } from './geocoding.service';

@Injectable()
export class ChurchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly accessPolicy: AccessPolicyService,
    private readonly geocoding: GeocodingService,
  ) {}

  async findAll(user: AuthenticatedUser, search?: string) {
    const scope = await this.accessPolicy.resolveScope(user);
    const and: any[] = [{ deletedAt: null }];
    // Escopo é obrigatório: para não-admin combina por AND com a busca; a busca
    // nunca amplia a visibilidade.
    if (!scope.isAdmin) {
      and.push(this.accessPolicy.buildChurchWhere(scope));
    }
    const term = normalizeName(search ?? '');
    if (term) {
      and.push({
        OR: [
          { normalizedName: { contains: term } },
          { aliases: { some: { normalizedAlias: { contains: term } } } },
        ],
      });
    }
    return this.prisma.church.findMany({
      where: { AND: and },
      orderBy: [{ name: 'asc' }, { city: 'asc' }],
    });
  }

  async search(query: ChurchQueryDto, user: AuthenticatedUser) {
    const { page, perPage, skip, take } = getPagination(query);
    const and: any[] = [{ deletedAt: null }];

    const searchOr = this.buildSearchOr(query.search);
    if (searchOr) and.push({ OR: searchOr });
    if (query.city) and.push({ city: query.city });

    if (query.hasCoordinates === true) {
      and.push({ latitude: { not: null }, longitude: { not: null } });
    } else if (query.hasCoordinates === false) {
      and.push({ OR: [{ latitude: null }, { longitude: null }] });
    }

    if (query.hasLegendarios === true) {
      and.push({ legendarios: { some: { deletedAt: null } } });
    } else if (query.hasLegendarios === false) {
      and.push({ legendarios: { none: { deletedAt: null } } });
    }

    const scope = await this.accessPolicy.resolveScope(user);
    if (!scope.isAdmin) {
      and.push(this.accessPolicy.buildChurchScopeWhere(scope));
    }

    const where = { AND: and };
    const orderBy = { [query.orderBy ?? 'name']: query.orderDirection ?? 'asc' };
    const [items, total] = await Promise.all([
      this.prisma.church.findMany({ where, orderBy, skip, take }),
      this.prisma.church.count({ where }),
    ]);

    return toPaginatedResponse(items, total, page, perPage);
  }

  async searchCities(user: AuthenticatedUser) {
    const scope = await this.accessPolicy.resolveScope(user);
    const and: any[] = [{ deletedAt: null }, { city: { not: null } }];
    if (!scope.isAdmin) {
      and.push(this.accessPolicy.buildChurchScopeWhere(scope));
    }

    const rows = await this.prisma.church.findMany({
      where: { AND: and },
      select: { city: true },
      distinct: ['city'],
      orderBy: { city: 'asc' },
    });

    return rows
      .map((row: { city: string | null }) => row.city)
      .filter((city): city is string => Boolean(city?.trim()));
  }

  geocode(name: string | undefined, city: string, locationHint?: string) {
    return this.geocoding.geocode(name, city, locationHint);
  }

  async findOne(id: string, user: AuthenticatedUser) {
    // Barreira de IDOR (change access-scope-semantics-hardening): o detalhe por id
    // respeita o escopo de igreja (fail-closed) — não-admin sem a igreja no escopo
    // recebe 404, igual à lista. Sem isto, qualquer `churches.read` abria qualquer igreja.
    const scope = await this.accessPolicy.resolveScope(user);
    const where: any = { id, deletedAt: null };
    if (!scope.isAdmin) {
      where.AND = [this.accessPolicy.buildChurchWhere(scope)];
    }
    const church = await this.prisma.church.findFirst({
      where,
      include: {
        spiritualLeaderLegendary: {
          select: { id: true, fullName: true, deletedAt: true },
        },
        legendarios: {
          where: { deletedAt: null },
          select: { id: true, fullName: true, lgndNumber: true, city: true, phone: true, status: true },
          orderBy: { fullName: 'asc' },
        },
      },
    });
    if (!church) throw new NotFoundException('Church not found.');
    return this.withEffectiveSpiritualLeader(church);
  }

  async remove(id: string, user: AuthenticatedUser) {
    // Mesma barreira de escopo de `findOne`/`update`: excluir não pode ser o único
    // caminho que enxerga igreja fora do escopo (a permissão é admin-only pelo
    // catálogo, mas catálogo é declaração, não enforcement).
    const scope = await this.accessPolicy.resolveScope(user);
    const where: any = { id, deletedAt: null };
    if (!scope.isAdmin) {
      where.AND = [this.accessPolicy.buildChurchWhere(scope)];
    }
    const church = await this.prisma.church.findFirst({ where });
    if (!church) throw new NotFoundException('Church not found.');
    const actorUserId = user.sub;

    // Barreira no backend: só exclui igreja vazia; nunca remove Legendários em cascata.
    const linked = await this.prisma.legendary.count({ where: { churchId: id, deletedAt: null } });
    if (linked > 0) {
      throw new ConflictException('A igreja possui Legendários vinculados e não pode ser excluída.');
    }

    const deleted = await this.prisma.church.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.create({ actorUserId, entityType: 'Church', entityId: id, action: 'delete', before: church });
    return deleted;
  }

  async spiritualLeadersView(user: AuthenticatedUser, search?: string) {
    const scope = await this.accessPolicy.resolveScope(user);
    const and: any[] = [{ deletedAt: null }];
    if (!scope.isAdmin) {
      and.push(this.accessPolicy.buildChurchWhere(scope));
    }

    // Igreja/alias comparam pelo termo normalizado (acento/caixa-insensível);
    // nome do usuário líder e o texto livre legado comparam case-insensitive.
    const raw = (search ?? '').trim();
    const term = normalizeName(search ?? '');
    if (term) {
      and.push({
        OR: [
          { normalizedName: { contains: term } },
          { aliases: { some: { normalizedAlias: { contains: term } } } },
          { spiritualLeader: { name: { contains: raw, mode: 'insensitive' } } },
          { spiritualLeaderLegendary: { fullName: { contains: raw, mode: 'insensitive' }, deletedAt: null } },
          { spiritualLeaderName: { contains: raw, mode: 'insensitive' } },
        ],
      });
    }

    const churches = await this.prisma.church.findMany({
      where: { AND: and },
      select: {
        id: true,
        name: true,
        city: true,
        spiritualLeaderName: true,
        spiritualLeaderPhone: true,
        spiritualLeaderUserId: true,
        spiritualLeader: { select: { id: true, name: true, email: true } },
        spiritualLeaderLegendaryId: true,
        spiritualLeaderLegendary: { select: { id: true, fullName: true, deletedAt: true } },
        latitude: true,
        longitude: true,
        _count: { select: { legendarios: { where: { deletedAt: null } } } },
      },
      orderBy: [{ name: 'asc' }],
    });

    return churches.map((church) => this.withEffectiveSpiritualLeader(church));
  }

  async create(dto: CreateChurchDto, actor: AuthenticatedUser) {
    const normalized = normalizeName(dto.name);
    const churches = await this.prisma.church.findMany({ where: { deletedAt: null } });
    const existing = churches.find((church: any) => normalizeName(church.name) === normalized);
    if (existing) return existing;

    if (dto.spiritualLeaderUserId) {
      await this.validateSpiritualLeaderUser(dto.spiritualLeaderUserId);
    }
    if (dto.spiritualLeaderLegendaryId) {
      await this.validateSpiritualLeaderLegendary(dto.spiritualLeaderLegendaryId, actor);
    }

    const locationHint = dto.address?.trim() || null;
    let latitude = dto.latitude ?? null;
    let longitude = dto.longitude ?? null;
    // Geocoda apenas quando o usuário não informou coordenadas manualmente.
    if (dto.latitude == null && dto.longitude == null) {
      const geo = await this.geocoding.geocode(dto.name, dto.city, locationHint);
      if (geo) {
        latitude = geo.lat;
        longitude = geo.lng;
      }
    }

    const church = await this.prisma.church.create({
      data: {
        name: dto.name.trim(),
        normalizedName: normalized,
        searchText: this.buildSearchText(dto.name, dto.city),
        city: dto.city?.trim() || null,
        address: dto.address?.trim() || null,
        spiritualLeaderName: dto.spiritualLeaderName?.trim() || null,
        spiritualLeaderPhone: cleanPhone(dto.spiritualLeaderPhone ?? null),
        spiritualLeaderUserId: dto.spiritualLeaderUserId || null,
        spiritualLeaderLegendaryId: dto.spiritualLeaderLegendaryId || null,
        latitude,
        longitude,
        notes: dto.notes?.trim() || null,
      },
    });
    await this.audit.create({ actorUserId: actor.sub, entityType: 'Church', entityId: church.id, action: 'create', after: church });
    return church;
  }

  async update(id: string, dto: UpdateChurchDto, actor: AuthenticatedUser) {
    // Barreira de IDOR na edição: a igreja-alvo é resolvida DENTRO do escopo antes de
    // qualquer mutação. Fora do escopo → 404 e nada é alterado.
    const scope = await this.accessPolicy.resolveScope(actor);
    const beforeWhere: any = { id, deletedAt: null };
    if (!scope.isAdmin) {
      beforeWhere.AND = [this.accessPolicy.buildChurchWhere(scope)];
    }
    const before = await this.prisma.church.findFirst({ where: beforeWhere });
    if (!before) throw new NotFoundException('Church not found.');

    if (dto.spiritualLeaderUserId) {
      await this.validateSpiritualLeaderUser(dto.spiritualLeaderUserId);
    }
    if (dto.spiritualLeaderLegendaryId) {
      await this.validateSpiritualLeaderLegendary(dto.spiritualLeaderLegendaryId, actor);
    }

    let latitude = dto.latitude !== undefined ? (dto.latitude ?? null) : undefined;
    let longitude = dto.longitude !== undefined ? (dto.longitude ?? null) : undefined;

    // Coordenadas manuais no payload têm prioridade e nunca são sobrescritas pelo geocoding.
    const hasManualCoords = dto.latitude !== undefined || dto.longitude !== undefined;
    const newName = dto.name !== undefined ? dto.name.trim() : before.name;
    const newCity = dto.city === null ? null : (dto.city !== undefined ? dto.city.trim() : before.city);
    const newAddress = dto.address === null ? null : (dto.address !== undefined ? dto.address.trim() : before.address);
    const newLocationHint = newAddress || null;
    const geoInputChanged =
      newName !== before.name ||
      newCity !== before.city ||
      newAddress !== before.address;

    if (!hasManualCoords && geoInputChanged) {
      const geo = await this.geocoding.geocode(newName, newCity, newLocationHint);
      if (geo) {
        latitude = geo.lat;
        longitude = geo.lng;
      }
    }

    const after = await this.prisma.church.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        normalizedName: dto.name !== undefined ? normalizeName(newName) : undefined,
        searchText: dto.name !== undefined || dto.city !== undefined
          ? this.buildSearchText(newName, newCity)
          : undefined,
        city: dto.city === null ? null : (dto.city !== undefined ? dto.city.trim() : undefined),
        address: dto.address === null ? null : (dto.address !== undefined ? dto.address.trim() : undefined),
        spiritualLeaderName: dto.spiritualLeaderName === null ? null : (dto.spiritualLeaderName !== undefined ? dto.spiritualLeaderName.trim() : undefined),
        spiritualLeaderPhone: dto.spiritualLeaderPhone === null
          ? null
          : (dto.spiritualLeaderPhone !== undefined ? cleanPhone(dto.spiritualLeaderPhone) : undefined),
        spiritualLeaderUserId: dto.spiritualLeaderUserId !== undefined ? (dto.spiritualLeaderUserId ?? null) : undefined,
        spiritualLeaderLegendaryId: dto.spiritualLeaderLegendaryId !== undefined ? (dto.spiritualLeaderLegendaryId ?? null) : undefined,
        latitude,
        longitude,
        notes: dto.notes === null ? null : (dto.notes !== undefined ? dto.notes.trim() : undefined),
      },
    });

    await this.audit.create({ actorUserId: actor.sub, entityType: 'Church', entityId: id, action: 'update', before, after });

    if ('spiritualLeaderUserId' in dto && before.spiritualLeaderUserId !== after.spiritualLeaderUserId) {
      await this.audit.create({
        actorUserId: actor.sub,
        entityType: 'Church',
        entityId: id,
        action: 'update_spiritual_leader',
        before: { spiritualLeaderUserId: before.spiritualLeaderUserId },
        after: { spiritualLeaderUserId: after.spiritualLeaderUserId },
      });
    }

    if ('spiritualLeaderLegendaryId' in dto && before.spiritualLeaderLegendaryId !== after.spiritualLeaderLegendaryId) {
      await this.audit.create({
        actorUserId: actor.sub,
        entityType: 'Church',
        entityId: id,
        action: 'update_spiritual_leader_legendary',
        before: { spiritualLeaderLegendaryId: before.spiritualLeaderLegendaryId },
        after: { spiritualLeaderLegendaryId: after.spiritualLeaderLegendaryId },
      });
    }

    return after;
  }

  private async validateSpiritualLeaderUser(userId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null, isActive: true } });
    if (!user) throw new BadRequestException('Spiritual leader user not found or inactive.');
  }

  private async validateSpiritualLeaderLegendary(legendaryId: string, actor: AuthenticatedUser) {
    const scope = await this.accessPolicy.resolveScope(actor);
    const where: any = { id: legendaryId, deletedAt: null };
    if (!scope.isAdmin) {
      where.AND = [this.accessPolicy.buildLegendaryWhere(scope)];
    }
    const legendary = await this.prisma.legendary.findFirst({ where, select: { id: true } });
    if (!legendary) {
      throw new BadRequestException('Spiritual leader legendary not found or unavailable.');
    }
  }

  private withEffectiveSpiritualLeader<T extends {
    spiritualLeaderName: string | null;
    spiritualLeaderLegendary: { id: string; fullName: string; deletedAt: Date | null } | null;
  }>(church: T) {
    const { spiritualLeaderLegendary, ...rest } = church;
    const linked = spiritualLeaderLegendary && !spiritualLeaderLegendary.deletedAt
      ? { id: spiritualLeaderLegendary.id, fullName: spiritualLeaderLegendary.fullName }
      : null;
    return {
      ...rest,
      spiritualLeaderLegendary: linked,
      spiritualLeaderEffectiveName: linked?.fullName ?? church.spiritualLeaderName,
    };
  }

  private buildSearchOr(search?: string): any[] | undefined {
    if (!search) return undefined;
    const term = normalizeName(search);
    if (!term) return undefined;
    return [
      { searchText: { contains: term } },
      { aliases: { some: { normalizedAlias: { contains: term } } } },
    ];
  }

  private buildSearchText(name?: string | null, city?: string | null) {
    return normalizeName([name, city].filter(Boolean).join(' '));
  }
}
