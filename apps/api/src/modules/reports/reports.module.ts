import { Module } from '@nestjs/common';
import { AccessPolicyModule } from '../../common/access/access-policy.module';
import { AuditModule } from '../audit/audit.module';
import { DatabaseModule } from '../../database/prisma.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [DatabaseModule, AuditModule, AccessPolicyModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
