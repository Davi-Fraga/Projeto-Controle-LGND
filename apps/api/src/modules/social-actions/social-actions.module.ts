import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DatabaseModule } from '../../database/prisma.module';
import { SocialActionsController } from './social-actions.controller';
import { SocialActionsService } from './social-actions.service';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [SocialActionsController],
  providers: [SocialActionsService],
})
export class SocialActionsModule {}
