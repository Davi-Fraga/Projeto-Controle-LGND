import { createHash, randomBytes } from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { UserWithAccess } from '../../common/types/safe-user';
import { PrismaService } from '../../database/prisma.service';

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
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null, isActive: true },
      include: userInclude,
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken: await this.createAccessToken(user),
      refreshToken: await this.createRefreshToken(user.id),
      user: this.toSafeUser(user),
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
      user: this.toSafeUser(token.user),
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
    const safeUser = this.toSafeUser(user);

    return this.jwt.signAsync({
      sub: user.id,
      email: user.email,
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

  private toSafeUser(user: UserWithAccess) {
    const roles = user.roles.map((item) => item.role.name);
    const permissions = Array.from(
      new Set(
        user.roles.flatMap((item) =>
          item.role.permissions.map((rolePermission) => rolePermission.permission.key),
        ),
      ),
    );

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
