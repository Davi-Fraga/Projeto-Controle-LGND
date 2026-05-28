import { PartialType } from '@nestjs/mapped-types';
import { CreateTopDto } from './top-query.dto';

export class UpdateTopDto extends PartialType(CreateTopDto) {}
