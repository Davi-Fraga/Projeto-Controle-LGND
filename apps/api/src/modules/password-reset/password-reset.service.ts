import { createHash, randomBytes } from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import type { AuthToken } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ResetPasswordDto } from './dto/password-reset.dto';

const RESET_TTL_MS = 24 * 60 * 60 * 1000; // 24h, uso único (credencial sensível)
const GENERIC_INVALID = 'Link inválido ou expirado.';

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  // Admin gera um link de redefinição para um usuário. Reaproveita AuthToken (PASSWORD_RESET).
  async create(userId: string, actorUserId?: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null }, select: { id: true, email: true } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    const rawToken = randomBytes(32).toString('hex');
    const token = await this.prisma.authToken.create({
      data: {
        type: 'PASSWORD_RESET',
        tokenHash: this.hash(rawToken),
        expiresAt: new Date(Date.now() + RESET_TTL_MS),
        userId: user.id,
        email: user.email,
        createdByUserId: actorUserId ?? null,
      },
    });

    await this.audit.create({ actorUserId, entityType: 'AuthToken', entityId: token.id, action: 'password_reset_create', after: { userId: user.id } });
    return { link: this.buildLink(rawToken), email: user.email, expiresAt: token.expiresAt };
  }

  // Público: valida o link e devolve só o email (para a página de redefinição).
  async validate(rawToken: string) {
    const token = await this.findValidReset(rawToken);
    return { email: token.email };
  }

  // Público: a pessoa define a nova senha. Atualiza o hash, REVOGA as sessões
  // (refresh tokens) do usuário e invalida o token — tudo em transação.
  async reset(rawToken: string, dto: ResetPasswordDto) {
    const token = await this.findValidReset(rawToken);
    const passwordHash = await bcrypt.hash(dto.password, 12);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: token.userId! }, data: { passwordHash } });
      await tx.refreshToken.updateMany({ where: { userId: token.userId!, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.authToken.update({ where: { id: token.id }, data: { status: 'USED', usedAt: new Date() } });
    });

    await this.audit.create({ actorUserId: token.userId ?? undefined, entityType: 'AuthToken', entityId: token.id, action: 'password_reset_use', after: { userId: token.userId } });
    return { ok: true };
  }

  private async findValidReset(rawToken: string): Promise<AuthToken> {
    const token = await this.prisma.authToken.findUnique({ where: { tokenHash: this.hash(rawToken) } });
    if (
      !token ||
      token.type !== 'PASSWORD_RESET' ||
      token.status !== 'PENDING' ||
      token.expiresAt <= new Date() ||
      !token.userId
    ) {
      throw new NotFoundException(GENERIC_INVALID);
    }
    return token;
  }

  private hash(rawToken: string) {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private buildLink(rawToken: string) {
    const base = (this.config.get<string>('WEB_URL') ?? 'http://localhost:3000').replace(/\/$/, '');
    return `${base}/redefinir-senha/${rawToken}`;
  }
}
