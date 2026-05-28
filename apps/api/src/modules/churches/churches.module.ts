import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ChurchesController } from './churches.controller';
import { ChurchesService } from './churches.service';

@Module({
  imports: [AuditModule],
  controllers: [ChurchesController],
  providers: [ChurchesService],
})
export class ChurchesModule {}
