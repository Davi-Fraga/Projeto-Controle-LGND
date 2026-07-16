/**
 * BACKFILL EM MASSA de legendários a partir da PLANILHA DE RESPOSTAS do Google Forms
 * "MANADA ROTA DO CERRADO" — para respostas históricas que nunca passaram pelo webhook
 * `legendary-forms-sync`.
 *
 * PRINCÍPIO: REUSAR, não reimplementar. Cada linha vira o MESMO payload canônico do
 * Apps Script (via forms-row-mapper) e é ingerida pelo MESMO serviço de produção
 * (LegendaryFormsSyncService.ingest). Normalização, dedup, last-write-wins, needsReview,
 * conflito de nome e match de igreja/profissão/equipe são TODOS do serviço — aqui só há
 * leitura de arquivo, ordenação e relatório. O resultado de cada linha é idêntico ao que
 * aconteceria se a resposta tivesse chegado pelo Forms.
 *
 * IDEMPOTÊNCIA (a planilha não traz o responseId do evento):
 *   responseId = "backfill:" + sha256( cleanLgnd(lgndNumber) | normalizeName(fullName) | responseTimestampISO )
 *   - Mesma linha em 2 execuções → mesmo hash → o serviço faz skipped/duplicate (ou stale).
 *     Rodar 2x o mesmo arquivo NÃO duplica.
 *   - Mesma pessoa com 2 carimbos → 2 ids → ambas processadas em ordem; o LWW resolve.
 *   - Colisão com o Forms ao vivo (a mesma resposta já entrou pelo webhook com o responseId
 *     REAL): o upsert é por lgndNumber (@unique), então NÃO cria duplicata — mesmo instante
 *     resulta em skipped/stale; instante maior apenas re-atualiza o MESMO legendário.
 *   (detalhes em ../src/modules/legendary-forms-sync/backfill/forms-row-mapper.ts)
 *
 * MODO SEGURO:
 *   - --dry-run é o PADRÃO: roda o MESMO código do apply dentro de UMA transação e dá
 *     ROLLBACK no final (nada é escrito). Não passa `db` = comportamento de produção.
 *   - --apply escreve: cada linha em sua própria transação (idêntico ao webhook).
 *   - Processa em ordem cronológica pelo carimbo (para o LWW resolver múltiplas respostas).
 *
 * PRIVACIDADE: o arquivo e qualquer dado pessoal NÃO são versionados (.gitignore *.xlsx/*.csv).
 * O relatório identifica linhas problemáticas apenas pelo NÚMERO DE LEGENDÁRIO (nunca
 * e-mail/telefone/nascimento).
 *
 * USO:
 *   pnpm tsx apps/api/scripts/backfill-legendaries-from-forms.ts "<arquivo.xlsx|.csv>"            # dry-run
 *   pnpm tsx apps/api/scripts/backfill-legendaries-from-forms.ts "<arquivo.xlsx|.csv>" --apply    # escreve
 */
import 'reflect-metadata';
import { existsSync } from 'fs';
import { BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import { AuditService } from '../src/modules/audit/audit.service';
import { LegendaryFormsSyncService } from '../src/modules/legendary-forms-sync/legendary-forms-sync.service';
import { rowToPayload, validateHeaders } from '../src/modules/legendary-forms-sync/backfill/forms-row-mapper';

const DATETIME_HEADER = 'Carimbo de data/hora';
const DATE_HEADER = 'Data de nascimento';
const DRY_RUN_TX_TIMEOUT_MS = 300_000; // planilhas muito grandes podem exigir chunking

/** Sentinela para forçar o ROLLBACK da transação única do dry-run. */
class DryRunRollback extends Error {}

/**
 * Reduz uma issue do serviço a uma CATEGORIA PII-safe (só o prefixo conhecido; nunca o
 * valor, que pode conter nome de igreja, data de nascimento etc.). Issue desconhecida
 * (defensivo contra novos tipos) vira "outro", sem despejar o texto.
 */
function categorizeIssue(issue: string): string {
  if (issue.startsWith('Igreja não encontrada')) return 'igreja sem match';
  if (issue.startsWith('Profissão não encontrada')) return 'profissão sem match';
  if (issue.startsWith('Equipe não encontrada')) return 'equipe sem match';
  if (issue.startsWith('Campo obrigatório ausente')) return issue.toLowerCase(); // o rótulo é nome de campo, não PII
  if (issue.startsWith('Data de nascimento inválida')) return 'data de nascimento inválida';
  if (issue.startsWith('E-mail e confirmação')) return 'e-mail e confirmação divergem';
  if (issue.startsWith('Declarou-se líder')) return 'declarou-se líder espiritual';
  return 'outro';
}

// ---- Conversão de datas do Excel (serial → string pt-BR, sem depender do fuso da máquina) ----
// O serial do Excel é wall-clock sem timezone; usar getters UTC devolve os componentes
// exatos da célula de forma determinística. O mapper reaplica o offset -03:00.
function excelSerialToUTC(serial: number): Date {
  return new Date(Math.round((serial - 25569) * 86400) * 1000);
}
const p2 = (n: number) => String(n).padStart(2, '0');
function serialToPtBrDate(serial: number): string {
  const d = excelSerialToUTC(serial);
  return `${p2(d.getUTCDate())}/${p2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}
function serialToPtBrDateTime(serial: number): string {
  const d = excelSerialToUTC(serial);
  return `${serialToPtBrDate(serial)} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`;
}

function cellToString(header: string, cell: unknown): string {
  if (cell === null || cell === undefined) return '';
  if (typeof cell === 'number') {
    if (header === DATETIME_HEADER) return serialToPtBrDateTime(cell);
    if (header === DATE_HEADER) return serialToPtBrDate(cell);
  }
  return String(cell).trim();
}

export function readSheet(filePath: string): { headers: string[]; records: Record<string, string>[] } {
  const wb = XLSX.readFile(filePath, { cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: '', blankrows: false });
  if (matrix.length === 0) throw new Error('Planilha vazia.');

  const headers = (matrix[0] as unknown[]).map((h) => String(h ?? '').trim());
  const records: Record<string, string>[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i] as unknown[];
    const rec: Record<string, string> = {};
    headers.forEach((h, j) => {
      rec[h] = cellToString(h, row[j]);
    });
    // Ignora linhas totalmente vazias (sem âncoras de identidade).
    if (!rec['Nome completo'] && !rec['Número de Legendário']) continue;
    records.push(rec);
  }
  return { headers, records };
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const filePath = args.find((a) => !a.startsWith('--'));

  if (!filePath) {
    console.error('Uso: pnpm tsx apps/api/scripts/backfill-legendaries-from-forms.ts "<arquivo.xlsx|.csv>" [--apply]');
    process.exit(1);
  }
  if (!existsSync(filePath)) {
    console.error(`Arquivo não encontrado: ${filePath}`);
    process.exit(1);
  }

  const { headers, records } = readSheet(filePath);

  // Casamento de cabeçalhos por trim; se faltar qualquer um, avisa e PARA (não adivinha posição).
  const missing = validateHeaders(headers);
  if (missing.length > 0) {
    console.error('Cabeçalhos esperados ausentes no arquivo (nada foi processado):');
    missing.forEach((h) => console.error(`  - ${h}`));
    process.exit(1);
  }

  // Monta payloads e ORDENA cronologicamente pelo carimbo (LWW). Carimbo inválido vai ao fim.
  const items = records
    .map((rec, idx) => ({ rowNum: idx + 2, ...rowToPayload(rec) })) // +2: linha 1 é cabeçalho, 1-based
    .sort((a, b) => (a.timestampMs ?? Number.POSITIVE_INFINITY) - (b.timestampMs ?? Number.POSITIVE_INFINITY));

  console.log(`Arquivo: ${filePath}`);
  console.log(`Linhas de resposta consideradas: ${items.length}`);
  console.log(`Modo: ${apply ? 'APPLY (escreve)' : 'DRY-RUN (nada será escrito)'}\n`);

  const prisma = new PrismaClient();
  const service = new LegendaryFormsSyncService(prisma as any, new AuditService(prisma as any));

  const summary = { created: 0, updated: 0, conflict: 0, needsReview: 0, duplicate: 0, stale: 0, validationError: 0 };
  // Linhas problemáticas: SOMENTE número de legendário + linha + categoria (sem PII).
  const problems: { lgnd: string; rowNum: number; reason: string }[] = [];
  // Motivos de needsReview agregados por categoria (ocorrências; uma linha pode ter várias).
  const reasonCounts = new Map<string, number>();

  const processOne = async (item: (typeof items)[number], db?: any) => {
    const lgnd = item.payload.lgndNumber || '(sem número)';
    try {
      const res = await service.ingest(item.payload, db);
      switch (res.result) {
        case 'created':
          summary.created++;
          break;
        case 'updated':
          summary.updated++;
          break;
        case 'conflict':
          summary.conflict++;
          problems.push({ lgnd, rowNum: item.rowNum, reason: 'conflito de nome' });
          break;
        case 'skipped':
          res.reason === 'duplicate' ? summary.duplicate++ : summary.stale++;
          break;
      }
      if (res.result !== 'conflict' && res.needsReview) {
        summary.needsReview++;
        problems.push({ lgnd, rowNum: item.rowNum, reason: 'needsReview' });
        for (const issue of res.issues ?? []) {
          const cat = categorizeIssue(issue);
          reasonCounts.set(cat, (reasonCounts.get(cat) ?? 0) + 1);
        }
      }
    } catch (e) {
      if (e instanceof BadRequestException) {
        summary.validationError++;
        problems.push({ lgnd, rowNum: item.rowNum, reason: `validação: ${e.message}` });
        return;
      }
      throw e; // erro inesperado: aborta (aparece no console)
    }
  };

  try {
    if (apply) {
      // Produção: cada linha na sua própria transação (sem `db`).
      for (const item of items) await processOne(item);
    } else {
      // Dry-run: MESMO código, uma transação única com ROLLBACK ao final.
      try {
        await prisma.$transaction(
          async (tx) => {
            for (const item of items) await processOne(item, tx);
            throw new DryRunRollback();
          },
          { timeout: DRY_RUN_TX_TIMEOUT_MS, maxWait: 10_000 },
        );
      } catch (e) {
        if (!(e instanceof DryRunRollback)) throw e;
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  // ---- Resumo ----
  console.log('===== RESUMO =====');
  console.log(`Total processado:        ${items.length}`);
  console.log(`Criados:                 ${summary.created}`);
  console.log(`Atualizados:             ${summary.updated}`);
  console.log(`needsReview:             ${summary.needsReview}`);
  console.log(`Conflitos de nome:       ${summary.conflict}`);
  console.log(`Erros de validação:      ${summary.validationError}`);
  console.log(`Ignorados (duplicados):  ${summary.duplicate}`);
  console.log(`Ignorados (mais antigos):${summary.stale}`);

  if (reasonCounts.size > 0) {
    console.log('\n===== MOTIVOS DE needsReview (ocorrências; uma linha pode ter várias) =====');
    [...reasonCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, n]) => console.log(`  ${String(n).padStart(4)} · ${cat}`));
  }

  if (problems.length > 0) {
    console.log(`\n===== LINHAS PARA REVISÃO (${problems.length}) — só nº de legendário =====`);
    problems
      .sort((a, b) => a.rowNum - b.rowNum)
      .forEach((p) => console.log(`  linha ${p.rowNum} · LGND ${p.lgnd} · ${p.reason}`));
  }

  if (!apply) console.log('\nDRY-RUN concluído (nada foi escrito). Para aplicar, rode com --apply.');
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
