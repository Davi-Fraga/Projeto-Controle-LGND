import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';

@Module({
  imports: [AuditModule],
  controllers: [InvitesController],
  providers: [InvitesService],
})
export class InvitesModule {}
