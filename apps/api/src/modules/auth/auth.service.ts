import { createHash, randomBytes } from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { UserWithAccess } from '../../common/types/safe-user';
import { roleContributesBase } from '../../common/access/access.constants';
import { PrismaService } from '../../database/prisma.service';
import { EffectiveScreenAccessService } from '../../common/access/effective-screen-access.service';

const userInclude = {
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

// Custo do bcrypt usado em toda gravação de senha (invites, password-reset, seed).
const BCRYPT_COST = 12;

/**
 * Hash descartável, de senha aleatória, usado só para equalizar o tempo do login.
 *
 * Sem ele o `!user ||` curto-circuita o `bcrypt.compare` quando o e-mail não existe:
 * e-mail cadastrado paga ~100ms de bcrypt, e-mail inexistente responde na hora. A
 * mensagem de erro é genérica, mas a LATÊNCIA denuncia quais e-mails têm conta —
 * é enumeração de usuário por canal lateral (CWE-208).
 *
 * Calculado uma vez, sob demanda: gerar no import atrasaria o boot e todo suite de
 * teste que importa este arquivo.
 */
let dummyPasswordHash: Promise<string> | null = null;
const getDummyPasswordHash = (): Promise<string> => {
  dummyPasswordHash ??= bcrypt.hash(randomBytes(32).toString('hex'), BCRYPT_COST);
  return dummyPasswordHash;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly effectiveScreenAccess: EffectiveScreenAccessService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null, isActive: true },
      include: userInclude,
    });

    // Os dois caminhos de falha pagam um bcrypt.compare — ver `getDummyPasswordHash`.
    if (!user) {
      await bcrypt.compare(password, await getDummyPasswordHash());
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken: await this.createAccessToken(user),
      refreshToken: await this.createRefreshToken(user.id),
      user: await this.toSafeUser(user),
    };
  }

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing.');
    }

    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: userInclude } },
    });

    if (!token || token.revokedAt || token.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    await this.prisma.refreshToken.update({
      where: { id: token.id },
      data: { revokedAt: new Date() },
    });

    if (!token.user.isActive || token.user.deletedAt) {
      throw new UnauthorizedException('User inactive.');
    }

    return {
      accessToken: await this.createAccessToken(token.user),
      refreshToken: await this.createRefreshToken(token.userId),
      user: await this.toSafeUser(token.user),
    };
  }

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) {
      return;
    }

    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (token && !token.revokedAt) {
      await this.prisma.refreshToken.update({
        where: { id: token.id },
        data: { revokedAt: new Date() },
      });
    }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findFirstOrThrow({
      where: { id: userId, deletedAt: null },
      include: userInclude,
    });

    return this.toSafeUser(user);
  }

  getRefreshCookieName() {
    return this.config.get<string>('REFRESH_TOKEN_COOKIE_NAME') ?? 'central_refresh_token';
  }

  getRefreshCookieMaxAgeMs() {
    const days = Number(this.config.get<string>('JWT_REFRESH_EXPIRES_IN_DAYS') ?? 7);
    return days * 24 * 60 * 60 * 1000;
  }

  isProduction() {
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  private async createAccessToken(user: UserWithAccess) {
    const safeUser = await this.toSafeUser(user);

    return this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      legendaryId: user.legendaryId,
      roles: safeUser.roles,
      permissions: safeUser.permissions,
    });
  }

  private async createRefreshToken(userId: string) {
    const token = randomBytes(64).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + this.getRefreshCookieMaxAgeMs());

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return token;
  }

  private async toSafeUser(user: UserWithAccess) {
    const roles = user.roles.map((item) => item.role.name);
    // Efetivas coerentes com o PermissionsGuard (para os menus refletirem):
    // base do papel só conta para o Administrador; demais funções não concedem.
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

    const screenAccess = await this.effectiveScreenAccess.forUser({ id: user.id, roles, permissions });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      legendaryId: user.legendaryId,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      roles,
      permissions,
      screenAccess,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
