import { Module } from '@nestjs/common';
import { AccessPolicyModule } from '../../common/access/access-policy.module';
import { AuditModule } from '../audit/audit.module';
import { ProfessionsModule } from '../professions/professions.module';
import { LegendariosController } from './legendarios.controller';
import { LegendariosService } from './legendarios.service';

@Module({
  imports: [AuditModule, AccessPolicyModule, ProfessionsModule],
  controllers: [LegendariosController],
  providers: [LegendariosService],
  exports: [LegendariosService],
})
export class LegendariosModule {}
