import { Module } from '@nestjs/common';
import { AccessPolicyModule } from '../../common/access/access-policy.module';
import { AuditModule } from '../audit/audit.module';
import { ChurchesController } from './churches.controller';
import { ChurchesService } from './churches.service';
import { GeocodingService } from './geocoding.service';

@Module({
  imports: [AuditModule, AccessPolicyModule],
  controllers: [ChurchesController],
  providers: [ChurchesService, GeocodingService],
})
export class ChurchesModule {}
