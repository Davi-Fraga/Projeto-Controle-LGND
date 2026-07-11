/**
 * BACKFILL ONE-OFF de igrejas a partir das respostas do Google Forms da manada.
 * SEPARADO do runtime (o webhook NUNCA cria Church — D11). Este script é curadoria
 * em lote, com HUMANO no loop.
 *
 * Pipeline obrigatório (D11):
 *   1. Extrai os nomes de igreja distintos das respostas.
 *   2. Normaliza (sem acento/caixa/espaços) e DEDUPLICA — nunca SELECT DISTINCT cru,
 *      que recriaria a duplicação que já houve com as cidades.
 *   3. Emite a lista para REVISÃO HUMANA (dry-run, padrão).
 *   4. Só insere com `--apply`, de forma IDEMPOTENTE (rodar 2x não duplica).
 *
 * FONTE (Q6): export das respostas do Forms para JSON — um array de objetos, um por
 * resposta. Gere a partir da planilha de respostas (Arquivo → Fazer download → .csv
 * e converta para JSON, ou use a Sheets API). Salve em:
 *     prisma/data/forms-respostas.json
 * A coluna do nome da igreja é detectada por um destes cabeçalhos (o primeiro que existir):
 *   churchName | "Nome da igreja que frequenta" | igreja | Igreja
 *
 * USO:
 *   pnpm tsx scripts/backfill-churches-from-forms.ts            # dry-run (só revisão)
 *   pnpm tsx scripts/backfill-churches-from-forms.ts --apply    # insere as faltantes
 */
import { PrismaClient } from '@prisma/client';
import { normalizeName } from '../packages/shared/src/normalization';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const SOURCE = join(__dirname, '..', 'prisma', 'data', 'forms-respostas.json');
const CHURCH_KEYS = ['churchName', 'Nome da igreja que frequenta', 'igreja', 'Igreja'];

function loadRows(): Record<string, unknown>[] {
  const raw = JSON.parse(readFileSync(SOURCE, 'utf-8'));
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.result?.data?.json)) return raw.result.data.json;
  throw new Error(`Formato não reconhecido em ${SOURCE}. Esperado array de respostas.`);
}

function churchNameOf(row: Record<string, unknown>): string | null {
  for (const key of CHURCH_KEYS) {
    const v = row[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

async function main() {
  const rows = loadRows();
  console.log(`Lidas ${rows.length} respostas de ${SOURCE}.`);

  // 1+2) Distintas por nome NORMALIZADO; guarda a primeira grafia crua como canônica.
  const byKey = new Map<string, string>();
  for (const row of rows) {
    const name = churchNameOf(row);
    if (!name) continue;
    const key = normalizeName(name);
    if (key && !byKey.has(key)) byKey.set(key, name);
  }
  console.log(`Igrejas distintas (normalizadas): ${byKey.size}`);

  // Confronta com o que já existe no banco (match por nome normalizado).
  const existing = await prisma.church.findMany({ where: { deletedAt: null }, select: { name: true } });
  const existingKeys = new Set(existing.map((c) => normalizeName(c.name)));

  const toCreate: string[] = [];
  const alreadyThere: string[] = [];
  for (const [key, display] of byKey) {
    (existingKeys.has(key) ? alreadyThere : toCreate).push(display);
  }

  // 3) Revisão humana — imprime a lista antes de qualquer escrita.
  console.log('\n===== REVISÃO (nenhuma escrita ainda) =====');
  console.log(`Já existem no banco (${alreadyThere.length}):`);
  alreadyThere.sort().forEach((n) => console.log(`  = ${n}`));
  console.log(`\nSeriam CRIADAS (${toCreate.length}):`);
  toCreate.sort().forEach((n) => console.log(`  + ${n}`));

  if (!APPLY) {
    console.log('\nDRY-RUN. Revise a lista acima. Para inserir as faltantes, rode com --apply.');
    return;
  }

  // 4) Inserção idempotente: só cria o que não bate (por nome normalizado) com o que
  //    já existe. `existingKeys` foi lido do banco acima; toCreate já os exclui.
  let created = 0;
  for (const name of toCreate) {
    const key = normalizeName(name);
    if (existingKeys.has(key)) continue; // guarda extra contra reruns/estado concorrente
    await prisma.church.create({ data: { name } });
    existingKeys.add(key);
    created++;
  }
  console.log(`\n===== APLICADO =====`);
  console.log(`Igrejas criadas: ${created}`);
  console.log(`Já existentes (inalteradas): ${alreadyThere.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
