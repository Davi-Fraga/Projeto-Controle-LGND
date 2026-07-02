import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { DatabaseModule } from './database/prisma.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsersModule } from './modules/users/users.module';
import { ChurchesModule } from './modules/churches/churches.module';
import { ExpertisesModule } from './modules/expertises/expertises.module';
import { LegendariosModule } from './modules/legendarios/legendarios.module';
import { ProfessionsModule } from './modules/professions/professions.module';
import { TeamsModule } from './modules/teams/teams.module';
import { TopsModule } from './modules/tops/tops.module';
import { HealthModule } from './modules/health/health.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CommunicationsModule } from './modules/communications/communications.module';
import { SocialActionsModule } from './modules/social-actions/social-actions.module';
import { PreRegistrationsModule } from './modules/preregistrations/preregistrations.module';
import { ReportsModule } from './modules/reports/reports.module';
import { MapModule } from './modules/map/map.module';
import { OrgChartModule } from './modules/org-chart/org-chart.module';
import { CacheModule } from './common/cache/cache.module';
import { AccessPolicyModule } from './common/access/access-policy.module';
import { AccessControlModule } from './modules/access-control/access-control.module';
import { REDIS_CONFIG } from './config/env';
import { RateLimitGuard } from './common/guards/rate-limit.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    DatabaseModule,
    CacheModule,
    BullModule.forRoot({
      connection: {
        host: REDIS_CONFIG.host,
        port: REDIS_CONFIG.port,
      },
    }),
    AccessPolicyModule,
    HealthModule,
    AuthModule,
    UsersModule,
    AccessControlModule,
    RolesModule,
    PermissionsModule,
    AuditModule,
    LegendariosModule,
    ChurchesModule,
    ProfessionsModule,
    ExpertisesModule,
    TeamsModule,
    TopsModule,
    DashboardModule,
    CommunicationsModule,
    SocialActionsModule,
    PreRegistrationsModule,
    ReportsModule,
    MapModule,
    OrgChartModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule {}
