import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { TopsController } from './tops.controller';
import { TopsService } from './tops.service';
import { TopScopeGuard } from './guards/top-scope.guard';

// AccessPolicyService vem do AccessPolicyModule (global).
@Module({ imports: [AuditModule], controllers: [TopsController], providers: [TopsService, TopScopeGuard], exports: [TopsService] })
export class TopsModule {}
