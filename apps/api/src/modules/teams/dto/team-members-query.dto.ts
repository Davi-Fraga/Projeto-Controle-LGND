import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TeamMembershipStatus } from '@central-da-manada/shared';
import { PaginationDto } from '../../../common/pagination/pagination.dto';

export class TeamMembersQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(TeamMembershipStatus)
  status?: TeamMembershipStatus;

  @IsOptional()
  @IsString()
  role?: string;
}
