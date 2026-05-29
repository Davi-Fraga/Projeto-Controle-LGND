import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuditModule } from '../audit/audit.module';
import { DatabaseModule } from '../../database/prisma.module';
import { CommunicationsController } from './communications.controller';
import { CommunicationsService } from './communications.service';
import { MessageQueue } from './queues/message.queue';
import { MessageProcessor } from './queues/message.processor';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    BullModule.registerQueue({
      name: 'internal-messages',
    }),
  ],
  controllers: [CommunicationsController],
  providers: [CommunicationsService, MessageQueue, MessageProcessor],
})
export class CommunicationsModule {}
