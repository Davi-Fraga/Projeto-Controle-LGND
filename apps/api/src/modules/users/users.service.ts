import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { getPagination, PaginationDto, toPaginatedResponse } from '../../common/pagination/pagination.dto';
import { UserWithAccess } from '../../common/types/safe-user';
import { roleContributesBase } from '../../common/access/access.constants';
import { PrismaService } from '../../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const includeUserAccess = {
  roles: {
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  },
  permissionOverrides: {
    include: {
      permission: true,
    },
  },
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findMe(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: includeUserAccess,
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return this.toSafeUser(user);
  }

  async findAll(params: PaginationDto) {
    const { page, perPage, skip, take } = getPagination(params);
    const where = { deletedAt: null };
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: includeUserAccess,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
    ]);

    return toPaginatedResponse(
      (users as UserWithAccess[]).map((user: UserWithAccess) => this.toSafeUser(user)),
      total,
      page,
      perPage,
    );
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: includeUserAccess,
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return this.toSafeUser(user);
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new BadRequestException('Email already in use.');
    }

    const roles = await this.resolveRoles(dto.roles ?? ['COORDINATION_USER']);
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        passwordHash,
        legendaryId: dto.legendaryId,
        roles: {
          create: roles.map((role: { id: string }) => ({ roleId: role.id })),
        },
      },
      include: includeUserAccess,
    });

    return this.toSafeUser(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.ensureUserExists(id);

    if (dto.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase() },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException('Email already in use.');
      }
    }

    const roles = dto.roles ? await this.resolveRoles(dto.roles) : undefined;
    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 12) : undefined;

    const user = await this.prisma.$transaction(async (tx: any) => {
      if (roles) {
        await tx.userRole.deleteMany({ where: { userId: id } });
      }

      return tx.user.update({
        where: { id },
        data: {
          name: dto.name,
          email: dto.email?.toLowerCase(),
          passwordHash,
          legendaryId: dto.legendaryId,
          roles: roles
            ? {
                create: roles.map((role: { id: string }) => ({ roleId: role.id })),
              }
            : undefined,
        },
        include: includeUserAccess,
      });
    });

    return this.toSafeUser(user);
  }

  async deactivate(id: string) {
    await this.ensureUserExists(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        refreshTokens: {
          updateMany: {
            where: { revokedAt: null },
            data: { revokedAt: new Date() },
          },
        },
      },
      include: includeUserAccess,
    });

    return this.toSafeUser(user);
  }

  private async ensureUserExists(id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }
  }

  private async resolveRoles(roleNames: string[]) {
    const roles = await this.prisma.role.findMany({ where: { name: { in: roleNames } } });
    if (roles.length !== roleNames.length) {
      throw new BadRequestException('One or more roles do not exist.');
    }
    return roles;
  }

  private toSafeUser(user: UserWithAccess) {
    const roles = user.roles.map((item) => item.role.name);
    // Base do papel só conta para o Administrador; funções não concedem acesso.
    const effective = new Set<string>();
    for (const item of user.roles) {
      if (!roleContributesBase(item.role.name)) continue;
      for (const rolePermission of item.role.permissions) effective.add(rolePermission.permission.key);
    }
    for (const override of user.permissionOverrides ?? []) {
      if (override.effect === 'GRANT') effective.add(override.permission.key);
      else effective.delete(override.permission.key);
    }
    const permissions = Array.from(effective);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      legendaryId: user.legendaryId,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      roles,
      permissions,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
