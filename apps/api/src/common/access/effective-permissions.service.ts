import { Injectable } from '@nestjs/common';
import { PermissionEffect } from '@central-da-manada/shared';
import { PrismaService } from '../../database/prisma.service';
import { roleContributesBase } from './access.constants';

const userAccessInclude = {
  roles: {
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  },
  permissionOverrides: { include: { permission: true } },
} as const;

@Injectable()
export class EffectivePermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  // Permissions efetivas = (papel ∪ GRANTs) − REVOKEs.
  // Reavaliado por requisição: a fonte da verdade é o banco, não o token.
  async resolveKeys(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null, isActive: true },
      include: userAccessInclude,
    });

    if (!user) return [];

    // Base do papel só conta para o Administrador. Funções não concedem acesso;
    // para não-admin, a base é vazia e as efetivas vêm só das concessões por tela.
    const effective = new Set<string>();
    for (const userRole of user.roles) {
      if (!roleContributesBase(userRole.role.name)) continue;
      for (const rolePermission of userRole.role.permissions) {
        effective.add(rolePermission.permission.key);
      }
    }

    for (const override of user.permissionOverrides) {
      if (override.effect === PermissionEffect.GRANT) {
        effective.add(override.permission.key);
      } else {
        effective.delete(override.permission.key);
      }
    }

    return Array.from(effective);
  }
}
