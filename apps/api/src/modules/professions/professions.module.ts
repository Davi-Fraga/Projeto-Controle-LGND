import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ProfessionsController } from './professions.controller';
import { ProfessionsService } from './professions.service';

@Module({
  imports: [AuditModule],
  controllers: [ProfessionsController],
  providers: [ProfessionsService],
})
export class ProfessionsModule {}
