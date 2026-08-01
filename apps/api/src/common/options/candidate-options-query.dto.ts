import { IsOptional, IsString } from 'class-validator';
import { OptionsQueryDto } from './options-query.dto';

/**
 * Query dos endpoints de CANDIDATOS contextuais (TOP e Ações Sociais).
 *
 * `city` é um filtro OPCIONAL do cliente — nunca aplicado automaticamente a partir do
 * recurso-pai. **Participação em TOP não tem relação com a cidade do Legendário**: qualquer
 * legendário pode ir a qualquer TOP, de qualquer rota (regra confirmada pelo Davi em
 * 31/07/2026). Herdar a cidade do pai escondia candidato legítimo — na base de homologação,
 * 99 de 242 pessoas, sem nenhuma forma de contornar pela interface.
 *
 * Mesma semântica do filtro `city` de `GET /social-actions/volunteers/suggestions`: quem
 * pesquisa decide se quer restringir por cidade.
 */
export class CandidateOptionsQueryDto extends OptionsQueryDto {
  @IsOptional()
  @IsString()
  city?: string;
}
