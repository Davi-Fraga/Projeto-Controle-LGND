import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

  findAll() {
    return this.prisma.church.findMany({
      where: { deletedAt: null },
      orderBy: [{ name: 'asc' }, { city: 'asc' }],
    });
  }

  geocode(name: string | undefined, city: string) {
    return this.geocoding.geocode(name, city);
  }

  async spiritualLeadersView(user: AuthenticatedUser) {
    const scope = await this.accessPolicy.resolveScope(user);
    const where: any = { deletedAt: null };
    if (!scope.isAdmin) {
      Object.assign(where, this.accessPolicy.buildChurchWhere(scope));
    }

    return this.prisma.church.findMany({
      where,
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
    const normalized = this.normalizeName(dto.name);
    const churches = await this.prisma.church.findMany({ where: { deletedAt: null } });
    const existing = churches.find((church: any) => this.normalizeName(church.name) === normalized);
    if (existing) return existing;

    if (dto.spiritualLeaderUserId) {
      await this.validateSpiritualLeaderUser(dto.spiritualLeaderUserId);
    }

    let latitude = dto.latitude ?? null;
    let longitude = dto.longitude ?? null;
    // Geocoda apenas quando o usuário não informou coordenadas manualmente.
    if (dto.latitude == null && dto.longitude == null) {
      const geo = await this.geocoding.geocode(dto.name, dto.city);
      if (geo) {
        latitude = geo.lat;
        longitude = geo.lng;
      }
    }

    const church = await this.prisma.church.create({
      data: {
        name: dto.name.trim(),
        city: dto.city?.trim() || null,
        spiritualLeaderName: dto.spiritualLeaderName?.trim() || null,
        spiritualLeaderPhone: dto.spiritualLeaderPhone?.trim() || null,
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
    const nameOrCityChanged = newName !== before.name || newCity !== before.city;

    if (!hasManualCoords && nameOrCityChanged) {
      const geo = await this.geocoding.geocode(newName, newCity);
      if (geo) {
        latitude = geo.lat;
        longitude = geo.lng;
      }
    }

    const after = await this.prisma.church.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        city: dto.city === null ? null : (dto.city !== undefined ? dto.city.trim() : undefined),
        spiritualLeaderName: dto.spiritualLeaderName === null ? null : (dto.spiritualLeaderName !== undefined ? dto.spiritualLeaderName.trim() : undefined),
        spiritualLeaderPhone: dto.spiritualLeaderPhone === null ? null : (dto.spiritualLeaderPhone !== undefined ? dto.spiritualLeaderPhone.trim() : undefined),
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

  private normalizeName(value: string) {
    return value.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
  }
}
