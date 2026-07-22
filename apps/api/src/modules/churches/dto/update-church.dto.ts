import { IsLatitude, IsLongitude, IsNumber, IsOptional, IsUUID, ValidateIf } from 'class-validator';
import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateChurchDto } from './create-church.dto';

export class UpdateChurchDto extends PartialType(
  OmitType(CreateChurchDto, ['spiritualLeaderUserId', 'spiritualLeaderLegendaryId', 'latitude', 'longitude'] as const),
) {
  @IsOptional()
  @ValidateIf((o) => o.spiritualLeaderUserId !== null)
  @IsUUID()
  spiritualLeaderUserId?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.spiritualLeaderLegendaryId !== null)
  @IsUUID()
  spiritualLeaderLegendaryId?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.latitude !== null)
  @IsNumber()
  @IsLatitude()
  latitude?: number | null;

  @IsOptional()
  @ValidateIf((o) => o.longitude !== null)
  @IsNumber()
  @IsLongitude()
  longitude?: number | null;
}
