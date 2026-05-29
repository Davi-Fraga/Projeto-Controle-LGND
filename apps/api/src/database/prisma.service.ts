import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getEnv } from '../config/env';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly readClient: PrismaClient;

  constructor() {
    super();

    // Read Replica initialization
    const readUrl = getEnv('DATABASE_READ_URL');
    if (readUrl) {
      this.readClient = new PrismaClient({
        datasources: {
          db: { url: readUrl },
        },
      });
    }
  }

  /**
   * Executes a read operation on the replica if available, otherwise on primary.
   */
  async read<T>(fn: (client: PrismaClient) => Promise<T>): Promise<T> {
    const client = this.readClient || this;
    return fn(client);
  }

  async onModuleDestroy() {
    await this.$disconnect();
    if (this.readClient) {
      await this.readClient.$disconnect();
    }
  }
}
