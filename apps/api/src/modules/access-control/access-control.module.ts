import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AccessControlController } from './access-control.controller';
import { AccessControlService } from './access-control.service';

// EffectivePermissionsService vem do AccessPolicyModule (global).
@Module({
  imports: [AuditModule],
  controllers: [AccessControlController],
  providers: [AccessControlService],
})
export class AccessControlModule {}
