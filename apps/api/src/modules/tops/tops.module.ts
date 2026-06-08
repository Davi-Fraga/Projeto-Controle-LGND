import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { TopsController } from './tops.controller';
import { TopsService } from './tops.service';

@Module({ imports: [AuditModule], controllers: [TopsController], providers: [TopsService], exports: [TopsService] })
export class TopsModule {}
