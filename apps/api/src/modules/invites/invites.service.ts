import { createHash, randomBytes } from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import type { AuthToken } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AcceptInviteDto, CreateInviteDto } from './dto/invites.dto';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias, uso único
const GENERIC_INVALID = 'Convite inválido ou expirado.';

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  // Admin gera um convite → retorna o LINK (token cru só aqui; no banco só o hash).
  async create(dto: CreateInviteDto, actorUserId?: string) {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) throw new BadRequestException('Já existe uma conta com este email.');

    if (dto.legendaryId) {
      const legendary = await this.prisma.legendary.findFirst({ where: { id: dto.legendaryId, deletedAt: null }, select: { id: true } });
      if (!legendary) throw new BadRequestException('Legendário não encontrado.');
      const linked = await this.prisma.user.findFirst({ where: { legendaryId: dto.legendaryId }, select: { id: true } });
      if (linked) throw new BadRequestException('Este legendário já está vinculado a uma conta.');
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hash(rawToken);

    const invite = await this.prisma.authToken.create({
      data: {
        type: 'INVITE',
        tokenHash,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        email,
        roles: dto.roles,
        legendaryId: dto.legendaryId ?? null,
        metadata: dto.scopes?.length
          ? { scopes: dto.scopes.map((scope) => ({ type: scope.type, value: scope.value })) }
          : undefined,
        createdByUserId: actorUserId ?? null,
      },
    });

    await this.audit.create({ actorUserId, entityType: 'AuthToken', entityId: invite.id, action: 'invite_create', after: { email, roles: dto.roles } });

    return { link: this.buildLink(rawToken), email, expiresAt: invite.expiresAt };
  }

  // Público: valida o token e devolve só o email (para a tela de aceite).
  async validate(rawToken: string) {
    const invite = await this.findValidInvite(rawToken);
    return { email: invite.email };
  }

  // Público: a pessoa define nome + senha; a conta nasce com a função/escopo do
  // convite e o token vira USED (tudo numa transação).
  async accept(rawToken: string, dto: AcceptInviteDto) {
    const invite = await this.findValidInvite(rawToken);
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const roleNames = invite.roles.length ? invite.roles : ['MEMBER'];
    const scopes = ((invite.metadata as any)?.scopes as Array<{ type: string; value: string }> | undefined) ?? [];

    const user = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { email: invite.email! }, select: { id: true } });
      if (existing) throw new BadRequestException(GENERIC_INVALID);

      const roles = await tx.role.findMany({ where: { name: { in: roleNames } }, select: { id: true } });
      const created = await tx.user.create({
        data: {
          name: dto.name.trim(),
          email: invite.email!,
          passwordHash,
          legendaryId: invite.legendaryId ?? undefined,
          roles: { create: roles.map((role) => ({ roleId: role.id })) },
        },
        select: { id: true, email: true },
      });

      if (scopes.length) {
        await tx.userScope.createMany({
          data: scopes.map((scope) => ({ userId: created.id, type: scope.type as any, value: scope.value })),
          skipDuplicates: true,
        });
      }

      await tx.authToken.update({ where: { id: invite.id }, data: { status: 'USED', usedAt: new Date() } });
      return created;
    });

    await this.audit.create({ actorUserId: user.id, entityType: 'AuthToken', entityId: invite.id, action: 'invite_accept', after: { email: user.email } });
    return { id: user.id, email: user.email };
  }

  // Resolve um convite válido (hash + tipo + status + validade). Erro genérico
  // para não vazar existência (anti-enumeração).
  private async findValidInvite(rawToken: string): Promise<AuthToken> {
    const invite = await this.prisma.authToken.findUnique({ where: { tokenHash: this.hash(rawToken) } });
    if (
      !invite ||
      invite.type !== 'INVITE' ||
      invite.status !== 'PENDING' ||
      invite.expiresAt <= new Date() ||
      !invite.email
    ) {
      throw new NotFoundException(GENERIC_INVALID);
    }
    return invite;
  }

  private hash(rawToken: string) {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private buildLink(rawToken: string) {
    const base = (this.config.get<string>('WEB_URL') ?? 'http://localhost:3000').replace(/\/$/, '');
    return `${base}/convite/${rawToken}`;
  }
}
