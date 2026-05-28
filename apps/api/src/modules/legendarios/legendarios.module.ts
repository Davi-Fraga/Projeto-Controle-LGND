import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { LegendariosController } from './legendarios.controller';
import { LegendariosService } from './legendarios.service';

@Module({
  imports: [AuditModule],
  controllers: [LegendariosController],
  providers: [LegendariosService],
  exports: [LegendariosService],
})
export class LegendariosModule {}
