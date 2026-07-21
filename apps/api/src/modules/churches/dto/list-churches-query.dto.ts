import { IsOptional, IsString } from 'class-validator';

/**
 * Query opcional das listagens de Igrejas (`GET /churches` e
 * `GET /churches/spiritual-leaders`). `search` é aditivo: ausente ou vazio após
 * normalização, a listagem preserva formato/ordenação e aplica apenas o escopo.
 */
export class ListChurchesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
