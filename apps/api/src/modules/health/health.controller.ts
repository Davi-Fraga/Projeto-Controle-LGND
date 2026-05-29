import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../common/cache/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async check() {
    const checks = {
      database: 'down',
      redis: 'down',
      timestamp: new Date().toISOString(),
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'up';
    } catch {}

    try {
      await this.redis.client.ping();
      checks.redis = 'up';
    } catch {}

    const isHealthy = checks.database === 'up' && checks.redis === 'up';

    return {
      status: isHealthy ? 'ok' : 'error',
      ...checks,
    };
  }
}
