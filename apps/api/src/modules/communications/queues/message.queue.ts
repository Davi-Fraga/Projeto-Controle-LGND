import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class MessageQueue {
  constructor(@InjectQueue('internal-messages') private readonly queue: Queue) {}

  async addMessage(data: { messageId: string; targetType: string; targetId?: string }) {
    await this.queue.add('dispatch-message', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }
}
