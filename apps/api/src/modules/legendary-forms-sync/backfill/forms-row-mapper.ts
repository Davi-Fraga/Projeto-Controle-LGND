import { createHash } from 'crypto';
import { cleanLgnd, normalizeName } from '@central-da-manada/shared';
import { FormsSyncWebhookDto } from '../dto/forms-sync-webhook.dto';

/**
 * Mapa EXATO das colunas da planilha de respostas do Google Forms "MANADA ROTA DO
 * CERRADO" → campos do payload canônico (o mesmo do Apps Script / FormsSyncWebhookDto).
 * A ordem é a da planilha; o casamento é feito por texto do cabeçalho com trim() nos
 * dois lados (a planilha tem cabeçalhos com espaço no fim em algumas colunas).
 */
export const COLUMN_MAP = [
  { header: 'Carimbo de data/hora', field: 'responseTimestamp' },
  { header: 'Nome completo', field: 'fullName' },
  { header: 'Número de telefone (WhatsApp)', field: 'phone' },
  { header: 'Número de Legendário', field: 'lgndNumber' },
  { header: 'Faço parte ou quero fazer parte da equipe', field: 'team' },
  { header: 'E-mail', field: 'email' },
  { header: 'Confirmação de e-mail', field: 'emailConfirmation' },
  { header: 'Data de nascimento', field: 'birthDate' },
  { header: 'Bairro', field: 'district' },
  { header: 'Cidade', field: 'city' },
  { header: 'Estado', field: 'state' },
  { header: 'Nome da igreja que frequenta', field: 'churchName' },
  { header: 'Nome do Líder Espiritual', field: 'spiritualLeaderName' },
  { header: 'Contato do Líder Espiritual', field: 'spiritualLeaderPhone' },
  { header: 'Habilidades (opcional)', field: 'skills' },
  { header: 'Profissão', field: 'profession' },
  { header: 'Nome da esposa ou mãe', field: 'relativeName' },
  { header: 'Contato (Esposa ou Mãe)', field: 'relativePhone' },
  { header: 'E-mail da esposa ou mãe', field: 'relativeEmail' },
  { header: 'É líder espiritual?', field: 'isSpiritualLeader' },
  { header: 'Qual sua liderança?', field: 'leadershipRole' },
  { header: 'Qual TOP você subiu a montanha?', field: 'firstMountainTop' },
] as const;

/** Cabeçalhos esperados que faltam no arquivo (comparação por trim). Vazio = OK. */
export function validateHeaders(actual: string[]): string[] {
  const present = new Set(actual.map((h) => h.trim()));
  return COLUMN_MAP.map((c) => c.header).filter((h) => !present.has(h));
}

/**
 * Converte a data do Forms para 'YYYY-MM-DD' — MESMA regra do normalizeDate_ do Apps
 * Script (o Forms costuma devolver dd/MM/yyyy). Formato desconhecido passa adiante: o
 * backend valida e, se inválido, marca needsReview (não bloqueia).
 */
export function normalizeFormsDate(raw: string | null | undefined): string {
  const v = (raw ?? '').trim();
  if (!v) return '';
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return v;
}

/**
 * Carimbo de data/hora da planilha (pt-BR, ex.: "14/07/2026 13:45:22") → ISO 8601.
 * Interpretado em America/Sao_Paulo (-03:00, sem DST desde 2019) — o mesmo instante que
 * o Apps Script enviaria via e.response.getTimestamp(). Só a ordenação relativa importa
 * para o last-write-wins; o offset garante o instante absoluto correto na colisão com o
 * webhook ao vivo. Formato não reconhecido → null (o backend rejeita como inválido).
 */
export function parseSheetTimestampToISO(raw: string | null | undefined): string | null {
  const v = (raw ?? '').trim();
  if (!v) return null;
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    const [, d, mo, y, h, mi, s] = m;
    const pad = (x: string) => x.padStart(2, '0');
    return `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:${pad(s ?? '00')}-03:00`;
  }
  const parsed = new Date(v);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * responseId estável e determinístico por linha (a planilha NÃO traz o responseId do
 * evento do Forms). Usa os MESMOS helpers do serviço (cleanLgnd, normalizeName) para
 * ser imune a diferenças de espaço/caixa/acento entre exportações:
 *
 *   responseId = "backfill:" + sha256( cleanLgnd(lgndNumber) | normalizeName(fullName) | responseTimestampISO )
 *
 * Consequências (idempotência):
 *  - MESMA linha em 2 execuções → mesmo hash → o serviço faz skipped/duplicate (ou stale).
 *  - MESMA pessoa com 2 carimbos diferentes → 2 ids → ambas processadas em ordem; LWW resolve.
 */
export function makeResponseId(lgndNumber: string, fullName: string, responseTimestamp: string): string {
  const key = [cleanLgnd(lgndNumber) ?? '', normalizeName(fullName), responseTimestamp].join('|');
  return 'backfill:' + createHash('sha256').update(key).digest('hex');
}

/**
 * Monta o payload canônico a partir de um registro (cabeçalho→valor) da planilha.
 * IDÊNTICO ao buildPayload_ do Apps Script: mesmo mapeamento, normalizeDate_ na data,
 * isSpiritualLeader por /^sim$/i. NÃO reimplementa regra de negócio — só transporta os
 * campos; toda normalização/dedup/needsReview acontece no serviço.
 *
 * `timestampMs` é o instante do carimbo (para ordenar cronologicamente antes de ingerir).
 */
export function rowToPayload(record: Record<string, string>): { payload: FormsSyncWebhookDto; timestampMs: number | null } {
  const val = (header: string) => (record[header] ?? '').trim();
  const opt = (header: string) => val(header) || undefined;

  const responseTimestampISO = parseSheetTimestampToISO(val('Carimbo de data/hora'));
  const responseTimestamp = responseTimestampISO ?? val('Carimbo de data/hora');
  const lgndNumber = val('Número de Legendário');
  const fullName = val('Nome completo');

  const payload: FormsSyncWebhookDto = {
    responseId: makeResponseId(lgndNumber, fullName, responseTimestamp),
    responseTimestamp,
    fullName,
    lgndNumber,
    phone: opt('Número de telefone (WhatsApp)'),
    team: opt('Faço parte ou quero fazer parte da equipe'),
    email: opt('E-mail'),
    emailConfirmation: opt('Confirmação de e-mail'),
    birthDate: normalizeFormsDate(val('Data de nascimento')) || undefined,
    district: opt('Bairro'),
    city: opt('Cidade'),
    state: opt('Estado'),
    churchName: opt('Nome da igreja que frequenta'),
    spiritualLeaderName: opt('Nome do Líder Espiritual'),
    spiritualLeaderPhone: opt('Contato do Líder Espiritual'),
    skills: opt('Habilidades (opcional)'),
    profession: opt('Profissão'),
    relativeName: opt('Nome da esposa ou mãe'),
    relativePhone: opt('Contato (Esposa ou Mãe)'),
    relativeEmail: opt('E-mail da esposa ou mãe'),
    isSpiritualLeader: /^sim$/i.test(val('É líder espiritual?')),
    leadershipRole: opt('Qual sua liderança?'),
    firstMountainTop: opt('Qual TOP você subiu a montanha?'),
  };

  return { payload, timestampMs: responseTimestampISO ? new Date(responseTimestampISO).getTime() : null };
}
