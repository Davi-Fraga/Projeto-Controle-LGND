import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ExpertisesController } from './expertises.controller';
import { ExpertisesService } from './expertises.service';

@Module({
  imports: [AuditModule],
  controllers: [ExpertisesController],
  providers: [ExpertisesService],
})
export class ExpertisesModule {}
