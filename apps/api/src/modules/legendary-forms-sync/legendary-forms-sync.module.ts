import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { LegendaryFormsSyncController } from './legendary-forms-sync.controller';
import { LegendaryFormsSyncService } from './legendary-forms-sync.service';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [LegendaryFormsSyncController],
  providers: [LegendaryFormsSyncService],
})
export class LegendaryFormsSyncModule {}
