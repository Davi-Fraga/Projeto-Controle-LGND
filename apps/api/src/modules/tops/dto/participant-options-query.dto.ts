import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { OptionsQueryDto } from '../../../common/options/options-query.dto';

/**
 * Query de opções de participantes de um TOP. Deriva do `OptionsQueryDto`
 * (search/limit/activeOnly) e adiciona o contexto opcional `availableForFamily`.
 * Sem o flag, o endpoint preserva o comportamento compatível para outros consumidores.
 */
export class ParticipantOptionsQueryDto extends OptionsQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value === 'true' || value === true ? true : value === 'false' || value === false ? false : value))
  @IsBoolean()
  availableForFamily?: boolean;
}
