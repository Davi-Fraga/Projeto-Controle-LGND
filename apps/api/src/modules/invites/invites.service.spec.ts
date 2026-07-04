import { createHash } from 'crypto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvitesService } from './invites.service';

const hash = (raw: string) => createHash('sha256').update(raw).digest('hex');

function pendingInvite(overrides: any = {}) {
  return {
    id: 'inv-1',
    type: 'INVITE',
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 60_000),
    email: 'nova@pessoa.com',
    roles: ['MEMBER'],
    legendaryId: null,
    metadata: null,
    ...overrides,
  };
}

describe('InvitesService', () => {
  let prisma: any;
  let audit: any;
  let config: any;
  let service: InvitesService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
      legendary: { findFirst: jest.fn() },
      authToken: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      role: { findMany: jest.fn() },
      userScope: { createMany: jest.fn() },
      $transaction: jest.fn(),
    };
    audit = { create: jest.fn() };
    config = { get: jest.fn().mockReturnValue('http://localhost:3000') };
    service = new InvitesService(prisma, audit, config);
  });

  describe('create', () => {
    it('gera um link e guarda o HASH (não o token cru) + auditoria', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.authToken.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'inv-1', ...data }));

      const res = await service.create({ email: 'Nova@Pessoa.com', roles: ['MEMBER'] as any }, 'admin');

      expect(res.link).toMatch(/^http:\/\/localhost:3000\/convite\/[a-f0-9]{64}$/);
      const rawToken = res.link.split('/').pop()!;
      const stored = prisma.authToken.create.mock.calls[0][0].data;
      expect(stored.tokenHash).toBe(hash(rawToken));
      expect(stored.tokenHash).not.toBe(rawToken); // nunca guarda o cru
      expect(stored.email).toBe('nova@pessoa.com'); // normalizado
      expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'invite_create' }));
    });

    it('recusa email que já tem conta', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      await expect(service.create({ email: 'existe@x.com', roles: ['MEMBER'] as any })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('validate (anti-enumeração)', () => {
    it('convite válido retorna só o email', async () => {
      prisma.authToken.findUnique.mockResolvedValue(pendingInvite());
      expect(await service.validate('tok')).toEqual({ email: 'nova@pessoa.com' });
    });

    it('token inexistente → erro genérico', async () => {
      prisma.authToken.findUnique.mockResolvedValue(null);
      await expect(service.validate('x')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('convite expirado → recusado', async () => {
      prisma.authToken.findUnique.mockResolvedValue(pendingInvite({ expiresAt: new Date(Date.now() - 1000) }));
      await expect(service.validate('x')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('convite já usado → recusado', async () => {
      prisma.authToken.findUnique.mockResolvedValue(pendingInvite({ status: 'USED' }));
      await expect(service.validate('x')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('token de outro tipo (PASSWORD_RESET) não vale como convite', async () => {
      prisma.authToken.findUnique.mockResolvedValue(pendingInvite({ type: 'PASSWORD_RESET' }));
      await expect(service.validate('x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('accept', () => {
    it('cria a conta com a função do convite e invalida o token (transação)', async () => {
      prisma.authToken.findUnique.mockResolvedValue(pendingInvite({ roles: ['MEMBER'], metadata: { scopes: [{ type: 'CITY', value: 'caldas novas' }] } }));
      const tx = {
        user: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'new-user', email: 'nova@pessoa.com' }) },
        role: { findMany: jest.fn().mockResolvedValue([{ id: 'role-member' }]) },
        userScope: { createMany: jest.fn() },
        authToken: { update: jest.fn() },
      };
      prisma.$transaction.mockImplementation((cb: any) => cb(tx));

      const res = await service.accept('tok', { name: 'Fulano', password: 'senha1234' });

      expect(res).toEqual({ id: 'new-user', email: 'nova@pessoa.com' });
      expect(tx.user.create).toHaveBeenCalled();
      expect(tx.userScope.createMany).toHaveBeenCalled(); // escopo do convite aplicado
      expect(tx.authToken.update).toHaveBeenCalledWith({ where: { id: 'inv-1' }, data: { status: 'USED', usedAt: expect.any(Date) } });
      expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'invite_accept' }));
    });

    it('token inválido → não cria conta', async () => {
      prisma.authToken.findUnique.mockResolvedValue(null);
      await expect(service.accept('x', { name: 'F', password: 'senha1234' })).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
