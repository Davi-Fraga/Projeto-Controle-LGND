import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

@Processor('internal-messages')
export class MessageProcessor extends WorkerHost {
  private readonly logger = new Logger(MessageProcessor.name);

  async process(job: Job<any, any, string>): Promise<any> {
    const { messageId, targetType, targetId } = job.data;

    this.logger.log(`Processing message ${messageId} for ${targetType} ${targetId || ''}`);

    try {
      // Logic to dispatch messages to recipients would go here
      // This avoids blocking the main API request
      await this.simulateDispatch();

      return { success: true };
    } catch (error: any) {
      this.logger.error(`Failed to dispatch message ${messageId}: ${error?.message || 'Unknown error'}`);
      throw error; // BullMQ will retry based on the queue configuration
    }
  }

  private async simulateDispatch() {
    return new Promise((resolve) => setTimeout(resolve, 500));
  }
}
