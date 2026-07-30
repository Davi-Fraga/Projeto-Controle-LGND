import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ProfessionsController } from './professions.controller';
import { ProfessionsService } from './professions.service';

@Module({
  imports: [AuditModule],
  controllers: [ProfessionsController],
  providers: [ProfessionsService],
  // `ProfessionsService.resolveByName` é o caminho único de resolução de profissão por
  // nome, consumido por Legendários e pelo sync do Forms.
  exports: [ProfessionsService],
})
export class ProfessionsModule {}
