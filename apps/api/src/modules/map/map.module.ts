import { Module } from '@nestjs/common';
import { AccessPolicyModule } from '../../common/access/access-policy.module';
import { MapController } from './map.controller';
import { MapService } from './map.service';

@Module({
  imports: [AccessPolicyModule],
  controllers: [MapController],
  providers: [MapService],
})
export class MapModule {}
