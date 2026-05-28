import { PartialType } from '@nestjs/mapped-types';
import { CreateLegendarioDto } from './create-legendario.dto';

export class UpdateLegendarioDto extends PartialType(CreateLegendarioDto) {}
