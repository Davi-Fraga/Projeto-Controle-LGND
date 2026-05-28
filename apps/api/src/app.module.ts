import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
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
    ReportsModule,
  ],
})
export class AppModule {}
