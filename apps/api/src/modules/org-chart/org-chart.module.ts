import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/prisma.module';
import { OrgChartController } from './org-chart.controller';
import { OrgChartService } from './org-chart.service';

@Module({
  imports: [DatabaseModule],
  controllers: [OrgChartController],
  providers: [OrgChartService],
})
export class OrgChartModule {}
