import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { cleanPhone, normalizeName } from '@central-da-manada/shared';
import { AccessPolicyService } from '../../common/access/access-policy.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
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

  geocode(name: string | undefined, city: string, locationHint?: string) {
    return this.geocoding.geocode(name, city, locationHint);
  }

  async findOne(id: string) {
    const church = await this.prisma.church.findFirst({
      where: { id, deletedAt: null },
      include: {
        legendarios: {
          where: { deletedAt: null },
          select: { id: true, fullName: true, lgndNumber: true, city: true, phone: true, status: true },
          orderBy: { fullName: 'asc' },
        },
      },
    });
    if (!church) throw new NotFoundException('Church not found.');
    return church;
  }

  async remove(id: string, actorUserId?: string) {
    const church = await this.prisma.church.findFirst({ where: { id, deletedAt: null } });
    if (!church) throw new NotFoundException('Church not found.');

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
          { spiritualLeaderName: { contains: raw, mode: 'insensitive' } },
        ],
      });
    }

    return this.prisma.church.findMany({
      where: { AND: and },
      select: {
        id: true,
        name: true,
        city: true,
        spiritualLeaderName: true,
        spiritualLeaderPhone: true,
        spiritualLeaderUserId: true,
        spiritualLeader: { select: { id: true, name: true, email: true } },
        latitude: true,
        longitude: true,
        _count: { select: { legendarios: { where: { deletedAt: null } } } },
      },
      orderBy: [{ name: 'asc' }],
    });
  }

  async create(dto: CreateChurchDto, actorUserId?: string) {
    const normalized = normalizeName(dto.name);
    const churches = await this.prisma.church.findMany({ where: { deletedAt: null } });
    const existing = churches.find((church: any) => normalizeName(church.name) === normalized);
    if (existing) return existing;

    if (dto.spiritualLeaderUserId) {
      await this.validateSpiritualLeaderUser(dto.spiritualLeaderUserId);
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
        city: dto.city?.trim() || null,
        address: dto.address?.trim() || null,
        spiritualLeaderName: dto.spiritualLeaderName?.trim() || null,
        spiritualLeaderPhone: cleanPhone(dto.spiritualLeaderPhone ?? null),
        spiritualLeaderUserId: dto.spiritualLeaderUserId || null,
        latitude,
        longitude,
        notes: dto.notes?.trim() || null,
      },
    });
    await this.audit.create({ actorUserId, entityType: 'Church', entityId: church.id, action: 'create', after: church });
    return church;
  }

  async update(id: string, dto: UpdateChurchDto, actorUserId?: string) {
    const before = await this.prisma.church.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw new NotFoundException('Church not found.');

    if (dto.spiritualLeaderUserId) {
      await this.validateSpiritualLeaderUser(dto.spiritualLeaderUserId);
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
        city: dto.city === null ? null : (dto.city !== undefined ? dto.city.trim() : undefined),
        address: dto.address === null ? null : (dto.address !== undefined ? dto.address.trim() : undefined),
        spiritualLeaderName: dto.spiritualLeaderName === null ? null : (dto.spiritualLeaderName !== undefined ? dto.spiritualLeaderName.trim() : undefined),
        spiritualLeaderPhone: dto.spiritualLeaderPhone === null
          ? null
          : (dto.spiritualLeaderPhone !== undefined ? cleanPhone(dto.spiritualLeaderPhone) : undefined),
        spiritualLeaderUserId: dto.spiritualLeaderUserId !== undefined ? (dto.spiritualLeaderUserId ?? null) : undefined,
        latitude,
        longitude,
        notes: dto.notes === null ? null : (dto.notes !== undefined ? dto.notes.trim() : undefined),
      },
    });

    await this.audit.create({ actorUserId, entityType: 'Church', entityId: id, action: 'update', before, after });

    if ('spiritualLeaderUserId' in dto && before.spiritualLeaderUserId !== after.spiritualLeaderUserId) {
      await this.audit.create({
        actorUserId,
        entityType: 'Church',
        entityId: id,
        action: 'update_spiritual_leader',
        before: { spiritualLeaderUserId: before.spiritualLeaderUserId },
        after: { spiritualLeaderUserId: after.spiritualLeaderUserId },
      });
    }

    return after;
  }

  private async validateSpiritualLeaderUser(userId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null, isActive: true } });
    if (!user) throw new BadRequestException('Spiritual leader user not found or inactive.');
  }
}
