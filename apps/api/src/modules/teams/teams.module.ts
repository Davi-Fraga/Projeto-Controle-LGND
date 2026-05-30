import { Module } from '@nestjs/common';
import { AccessPolicyModule } from '../../common/access/access-policy.module';
import { AuditModule } from '../audit/audit.module';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  imports: [AuditModule, AccessPolicyModule],
  controllers: [TeamsController],
  providers: [TeamsService],
})
export class TeamsModule {}
