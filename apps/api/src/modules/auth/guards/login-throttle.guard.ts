import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { Request } from 'express';
import { RedisService } from '../../../common/cache/redis.service';

const WINDOW_SECONDS = 300; // janela de 5 minutos
const MAX_PER_IP_EMAIL = 10; // tentativas por IP+e-mail na janela
const MAX_PER_IP = 50; // tentativas por IP na janela (anti password-spraying)

/**
 * Throttle dedicado ao login (anti brute-force / credential stuffing) — VULN-004.
 * Conta tentativas no Redis por IP+e-mail e por IP. A chave por IP+e-mail evita que
 * um atacante em outro IP esgote o limite e bloqueie a conta de um usuário legítimo.
 * Aplicado SOMENTE em POST /auth/login; o RateLimitGuard global continua valendo.
 */
@Injectable()
export class LoginThrottleGuard implements CanActivate {
  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { body?: { email?: string } }>();
    const ip = (req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown').toString();
    const email = (req.body?.email ?? '').toString().toLowerCase().trim();
    const emailHash = email ? createHash('sha256').update(email).digest('hex').slice(0, 16) : 'noemail';

    await Promise.all([
      this.hit(`login:ip:${ip}`, MAX_PER_IP),
      this.hit(`login:ipmail:${ip}:${emailHash}`, MAX_PER_IP_EMAIL),
    ]);
    return true;
  }

  private async hit(key: string, max: number) {
    const count = await this.redis.client.incr(key);
    if (count === 1) {
      await this.redis.client.expire(key, WINDOW_SECONDS);
    }
    if (count > max) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Muitas tentativas de login. Tente novamente em alguns minutos.',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
