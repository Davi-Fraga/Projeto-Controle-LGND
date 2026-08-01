import { UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

/**
 * Enumeração de usuário por timing (CWE-208): a mensagem de erro do login é genérica,
 * mas se o caminho "e-mail não existe" pular o bcrypt ele responde na hora, enquanto
 * o caminho "e-mail existe" paga ~100ms. A diferença de latência entrega quais e-mails
 * têm conta. O contrato aqui é: os DOIS caminhos executam um bcrypt.compare.
 */
describe('AuthService.login — equalização de tempo', () => {
  let service: AuthService;
  let prisma: any;
  let compareSpy: jest.SpyInstance;

  beforeEach(() => {
    prisma = { user: { findFirst: jest.fn(), update: jest.fn() } };
    service = new AuthService(prisma, {} as any, {} as any, {} as any);
    compareSpy = jest.spyOn(bcrypt, 'compare');
  });

  afterEach(() => {
    compareSpy.mockRestore();
  });

  it('executa bcrypt.compare mesmo quando o e-mail não existe', async () => {
    prisma.user.findFirst.mockResolvedValueOnce(null);

    await expect(service.login('naoexiste@exemplo.com', 'senha')).rejects.toThrow(UnauthorizedException);

    expect(compareSpy).toHaveBeenCalledTimes(1);
    // Compara contra o hash descartável, nunca contra string vazia/null — senão o
    // bcrypt retornaria cedo e o custo não seria equivalente.
    const [, hash] = compareSpy.mock.calls[0];
    expect(typeof hash).toBe('string');
    expect(hash as string).toMatch(/^\$2[aby]\$12\$/);
  });

  it('não vaza a existência da conta pela mensagem de erro', async () => {
    prisma.user.findFirst.mockResolvedValueOnce(null);
    const inexistente = await service.login('naoexiste@exemplo.com', 'x').catch((e) => e);

    prisma.user.findFirst.mockResolvedValueOnce({
      id: 'u1',
      passwordHash: await bcrypt.hash('outra-senha', 4),
    });
    const senhaErrada = await service.login('existe@exemplo.com', 'x').catch((e) => e);

    expect(senhaErrada.message).toBe(inexistente.message);
  });
});
