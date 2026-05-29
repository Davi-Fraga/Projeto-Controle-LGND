import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CONFIG } from '../../config/env';

@Injectable()
export class RedisService implements OnModuleDestroy {
  public readonly client: Redis;

  constructor() {
    this.client = new Redis({
      host: REDIS_CONFIG.host,
      port: REDIS_CONFIG.port,
    });

    this.client.on('error', (err) => {
      console.error('Redis Connection Error:', err);
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
