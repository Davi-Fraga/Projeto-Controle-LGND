import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

// Overview+detail (change organograma-navegacao-escalavel): quando `depth` é
// informado, o organograma volta projetado até essa profundidade (recolhido por
// padrão). Ausente => árvore inteira (comportamento legado, compatível).
export class DepthQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null || value === '' ? undefined : Number(value)))
  @IsInt()
  @Min(0)
  depth?: number;
}
