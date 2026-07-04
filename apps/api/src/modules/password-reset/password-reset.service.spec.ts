import { createHash } from 'crypto';
import { NotFoundException } from '@nestjs/common';
import { PasswordResetService } from './password-reset.service';

const hash = (raw: string) => createHash('sha256').update(raw).digest('hex');

function pendingReset(overrides: any = {}) {
  return {
    id: 'tok-1',
    type: 'PASSWORD_RESET',
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 60_000),
    email: 'dono@conta.com',
    userId: 'user-1',
    ...overrides,
  };
}

describe('PasswordResetService', () => {
  let prisma: any;
  let audit: any;
  let config: any;
  let service: PasswordResetService;

  beforeEach(() => {
    prisma = {
      user: { findFirst: jest.fn(), update: jest.fn() },
      authToken: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      refreshToken: { updateMany: jest.fn() },
      $transaction: jest.fn(),
    };
    audit = { create: jest.fn() };
    config = { get: jest.fn().mockReturnValue('http://localhost:3000') };
    service = new PasswordResetService(prisma, audit, config);
  });

  describe('create', () => {
    it('gera link (para /redefinir-senha) e guarda o HASH + auditoria', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'user-1', email: 'dono@conta.com' });
      prisma.authToken.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'tok-1', ...data }));

      const res = await service.create('user-1', 'admin');

      expect(res.link).toMatch(/^http:\/\/localhost:3000\/redefinir-senha\/[a-f0-9]{64}$/);
      const raw = res.link.split('/').pop()!;
      const stored = prisma.authToken.create.mock.calls[0][0].data;
      expect(stored.type).toBe('PASSWORD_RESET');
      expect(stored.tokenHash).toBe(hash(raw));
      expect(stored.tokenHash).not.toBe(raw);
      expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'password_reset_create' }));
    });

    it('recusa usuário inexistente', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.create('ghost')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('validate (anti-enumeração)', () => {
    it('token válido retorna só o email', async () => {
      prisma.authToken.findUnique.mockResolvedValue(pendingReset());
      expect(await service.validate('tok')).toEqual({ email: 'dono@conta.com' });
    });
    it('inexistente/expirado/usado/tipo errado → erro genérico', async () => {
      for (const t of [null, pendingReset({ expiresAt: new Date(Date.now() - 1000) }), pendingReset({ status: 'USED' }), pendingReset({ type: 'INVITE' })]) {
        prisma.authToken.findUnique.mockResolvedValueOnce(t);
        await expect(service.validate('x')).rejects.toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe('reset', () => {
    it('atualiza a senha, revoga sessões e invalida o token (transação)', async () => {
      prisma.authToken.findUnique.mockResolvedValue(pendingReset());
      const tx = {
        user: { update: jest.fn() },
        refreshToken: { updateMany: jest.fn() },
        authToken: { update: jest.fn() },
      };
      prisma.$transaction.mockImplementation((cb: any) => cb(tx));

      const res = await service.reset('tok', { password: 'novasenha123' });

      expect(res).toEqual({ ok: true });
      expect(tx.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'user-1' } }));
      expect(tx.refreshToken.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-1', revokedAt: null } }));
      expect(tx.authToken.update).toHaveBeenCalledWith({ where: { id: 'tok-1' }, data: { status: 'USED', usedAt: expect.any(Date) } });
      expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'password_reset_use' }));
    });

    it('token inválido → não redefine', async () => {
      prisma.authToken.findUnique.mockResolvedValue(null);
      await expect(service.reset('x', { password: 'novasenha123' })).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
