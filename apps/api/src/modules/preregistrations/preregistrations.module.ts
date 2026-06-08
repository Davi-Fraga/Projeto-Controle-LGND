import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { LegendariosModule } from '../legendarios/legendarios.module';
import { TopsModule } from '../tops/tops.module';
import { PreRegistrationsController } from './preregistrations.controller';
import { PreRegistrationsWebhookController } from './preregistrations-webhook.controller';
import { PreRegistrationsActionsController } from './preregistrations-actions.controller';
import { PreRegistrationsService } from './preregistrations.service';

@Module({
  imports: [DatabaseModule, AuditModule, LegendariosModule, TopsModule],
  controllers: [PreRegistrationsController, PreRegistrationsWebhookController, PreRegistrationsActionsController],
  providers: [PreRegistrationsService],
})
export class PreRegistrationsModule {}
