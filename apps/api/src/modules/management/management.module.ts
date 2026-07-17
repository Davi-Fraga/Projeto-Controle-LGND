import { Module } from '@nestjs/common';
import { AccessPolicyModule } from '../../common/access/access-policy.module';
import { AuditModule } from '../audit/audit.module';
import { ManagementController } from './management.controller';
import { ManagementService } from './management.service';

@Module({
  imports: [AuditModule, AccessPolicyModule],
  controllers: [ManagementController],
  providers: [ManagementService],
  exports: [ManagementService],
})
export class ManagementModule {}
