import { IsIn } from 'class-validator';
import type { OrgChartView } from '@central-da-manada/shared';

export const ORG_CHART_VIEWS: OrgChartView[] = ['teams', 'families', 'cities'];

export class OrgChartQueryDto {
  @IsIn(ORG_CHART_VIEWS, { message: 'view must be one of: teams, families, cities' })
  view: OrgChartView;
}
