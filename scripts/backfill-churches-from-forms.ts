/**
 * BACKFILL ONE-OFF de igrejas a partir da PLANILHA DE RESPOSTAS do Google Forms da manada.
 * SEPARADO do runtime (o webhook NUNCA cria Church — D11). Curadoria em lote, com HUMANO
 * no loop e mecanismo de ARQUIVO DE CURADORIA editável.
 *
 * FONTE ÚNICA: o MESMO arquivo .xlsx/.csv da planilha de respostas (coluna
 * "Nome da igreja que frequenta"), passado por argumento. Não versione o arquivo.
 *
 * PIPELINE:
 *   1. dry-run (PADRÃO): lê a planilha, deduplica por nome NORMALIZADO, agrupa por
 *      heurística + regras da liderança e GERA `prisma/data/churches-curation.json`.
 *   2. VOCÊ edita o arquivo (move nomes entre seções, ajusta canonical/variants).
 *   3. --apply: lê o arquivo CURADO e cria SÓ `clusters[].canonical`, idempotente por
 *      nome normalizado (rodar 2x não duplica). `review`/`generic`/`noise` NÃO viram igreja.
 *
 * REGRA DE AGRUPAMENTO (decisão da liderança): mesma igreja em CIDADES/LOCALIDADES
 * diferentes = igrejas SEPARADAS (pastores e servos diferentes). O agrupamento só une
 * variações de grafia/abreviação da MESMA congregação na MESMA localidade — nunca
 * unidades de cidades diferentes.
 *
 * USO:
 *   pnpm tsx scripts/backfill-churches-from-forms.ts "<arquivo.xlsx|.csv>"            # dry-run (gera o arquivo)
 *   pnpm tsx scripts/backfill-churches-from-forms.ts "<arquivo.xlsx|.csv>" --force    # regenera, sobrescrevendo edições
 *   pnpm tsx scripts/backfill-churches-from-forms.ts --apply                          # cria a partir do arquivo curado
 */
import { PrismaClient } from '@prisma/client';
import { normalizeName } from '../packages/shared/src/normalization';
import { decideChurchAlias } from '../apps/api/src/modules/legendary-forms-sync/backfill/church-alias-curation';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const FORCE = process.argv.includes('--force');
const FILE_ARG = process.argv.slice(2).find((a) => !a.startsWith('--'));
const CURATION_PATH = join(__dirname, '..', 'prisma', 'data', 'churches-curation.json');
const CHURCH_KEYS = ['Nome da igreja que frequenta', 'churchName', 'igreja', 'Igreja'];

type Cluster = { canonical: string; variants: string[] };
type ReviewItem = { canonical: string; variants: string[]; note: string };
type Curation = {
  '_leia-me': string;
  clusters: Cluster[];
  review: ReviewItem[];
  generic: string[];
  noise: string[];
};

// ---- Leitura da coluna de igreja (xlsx/csv) --------------------------------
function readChurchNames(file: string): string[] {
  const wb = XLSX.readFile(file);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
  if (rows.length === 0) throw new Error('Planilha vazia.');
  const key = Object.keys(rows[0]).find((k) => CHURCH_KEYS.includes(k.trim()));
  if (!key) {
    throw new Error(
      `Coluna de igreja não encontrada. Esperado um destes: ${CHURCH_KEYS.join(' | ')}.\n` +
        `Cabeçalhos do arquivo: ${Object.keys(rows[0]).join(' | ')}`,
    );
  }
  return rows.map((r) => String(r[key] ?? '').trim()).filter(Boolean);
}

// ---- kw = chave de PALAVRAS para os testes de regra: sem acento/caixa e SEM pontuação ----
const kwOf = (s: string) => normalizeName(s).replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

// ---- RUÍDO (não-igreja): não-respostas + espíritas ----
const isNoise = (kw: string) =>
  kw === '' ||
  kw === 'ddd' ||
  ['nenhuma', 'nao frequento', 'sem igreja', 'ainda nao tenho', 'nao tenho', 'espirita'].some((p) => kw.includes(p));

// ---- GENÉRICO/AMBÍGUO: denominação sozinha, sem identificar a igreja específica ----
const GENERIC = new Set([
  'assembleia de deus',
  'batista',
  'igreja batista',
  'catolica',
  'igreja catolica',
  'evangelica',
  'metodista',
  'universal',
]);

/**
 * REGRAS de agrupamento (ordem importa — 1ª que casar vence). Reflete a curadoria da
 * liderança: fusões só de grafia da MESMA localidade; unidades de cidades/localidades
 * diferentes ficam SEPARADAS. `review:true` = não cria por padrão (aguarda confirmação).
 */
type Rule = { canonical: string; test: (kw: string) => boolean; review?: string };
const RULES: Rule[] = [
  // PIB "Central" fica separada e comentada — confirmar se é a mesma PIB de Caldas Novas.
  {
    canonical: 'Primeira Igreja Batista Central',
    test: (k) => k.includes('primeira igreja batista central') || (/\bpib\b/.test(k) && k.includes('central')),
    review: 'Confirmar com a liderança se é a mesma PIB de Caldas Novas ou outra igreja. NÃO fundida por padrão.',
  },
  // PIB Caldas Novas — todas as variantes de grafia (exceto "Central", já capturada acima).
  {
    canonical: 'Primeira Igreja Batista (PIB) — Caldas Novas',
    test: (k) => /\bpib\b/.test(k) || k.includes('primeira igreja batista') || k.includes('primeira batista'),
  },
  { canonical: 'Igreja Vida na Palavra (IVP)', test: (k) => /\bivp\b/.test(k) || k.includes('vida na palavra') || k.includes('vida ba palavra') },
  { canonical: 'Ministério Palavra da Reconciliação (MPR)', test: (k) => /\bmpr\b/.test(k) || k.includes('palavra da reconciliacao') },
  { canonical: 'Assembleia de Deus Madureira', test: (k) => k.includes('madureira') },
  // AD Caldas do Oeste (ADCO/ADC) — SEPARADA da ADCN Caldas Novas (localidades diferentes).
  { canonical: 'Assembleia de Deus Caldas do Oeste (ADCO)', test: (k) => k.includes('caldas do oeste') || k.includes('caldas doeste') || /\badco\b/.test(k) || /\badc\b/.test(k) },
  { canonical: 'Assembleia de Deus Caldas Novas (ADCN)', test: (k) => /\badcn\b/.test(k) || (k.includes('assembleia de deus') && k.includes('caldas nova')) },
  { canonical: 'Ministério Tempo de Colher', test: (k) => k.includes('tempo de colher') || k.includes('templo de colher') },
  // Comunidade das Nações — SEPARADA por localidade.
  { canonical: 'Comunidade das Nações — Goiânia', test: (k) => (k.includes('comunidade das nacoes') || /\bcn\b/.test(k)) && k.includes('goiania') },
  { canonical: 'Comunidade das Nações — Valparaíso', test: (k) => (k.includes('comunidade das nacoes') || /\bcn\b/.test(k)) && k.includes('valparaiso') },
  { canonical: 'Comunidade das Nações', test: (k) => k.includes('comunidade das nacoes'), review: 'Localidade não especificada — confirmar a cidade. NÃO fundida com Goiânia/Valparaíso.' },
  { canonical: 'Igreja Católica São Sebastião', test: (k) => k.includes('sebastiao') },
  { canonical: 'Igreja Fonte da Vida — Caldas Novas', test: (k) => k.includes('fonte da vida') },
  { canonical: 'Igreja Cristã Nova Aliança (ICNA)', test: (k) => /\bicna\b/.test(k) || k.includes('nova alianca') },
  { canonical: 'Igreja Batista Kerygma', test: (k) => k.includes('kerygma') },
  { canonical: 'Igreja Nova História', test: (k) => k.includes('nova historia') },
  { canonical: 'Igreja Adventista do Sétimo Dia', test: (k) => k.includes('adventista') || k.includes('setimo dia') },
  { canonical: 'Igreja Amor e Cuidado', test: (k) => k.includes('amor e cuidado') },
  { canonical: 'Ministério Internacional Plenitude de Deus', test: (k) => k.includes('plenitude de deus') },
  { canonical: 'Igreja Batista Vida Nova', test: (k) => k.includes('vida nova') },
  { canonical: 'Igreja da Paz', test: (k) => k.includes('igreja da paz') },
  // Água Viva — SEPARADA por localidade (Itatiba vs sem cidade).
  { canonical: 'Igreja Batista Água Viva — Itatiba', test: (k) => k.includes('agua viva') && k.includes('itatiba') },
  { canonical: 'Igreja Batista Água Viva', test: (k) => k.includes('agua viva') },
  // Sal da Terra — SEPARADA por localidade (Morrinhos / Zona Sul / sem cidade).
  { canonical: 'Igreja Sal da Terra — Morrinhos', test: (k) => k.includes('sal da terra') && k.includes('morrinhos') },
  { canonical: 'Igreja Sal da Terra — Zona Sul', test: (k) => k.includes('sal da terra') && k.includes('zona sul') },
  { canonical: 'Igreja Sal da Terra', test: (k) => k.includes('sal da terra') },
];

// ---- Construção da curadoria a partir dos nomes distintos ----
function buildCuration(names: string[]): Curation {
  // Distintos por nome NORMALIZADO; guarda a 1ª grafia crua como display.
  const distinct = new Map<string, string>();
  for (const raw of names) {
    const key = normalizeName(raw);
    if (key && !distinct.has(key)) distinct.set(key, raw);
  }

  const clusterMap = new Map<string, string[]>();
  const reviewMap = new Map<string, { variants: string[]; note: string }>();
  const generic: string[] = [];
  const noise: string[] = [];

  for (const display of distinct.values()) {
    const kw = kwOf(display);
    if (isNoise(kw)) { noise.push(display); continue; }
    const rule = RULES.find((r) => r.test(kw));
    if (rule?.review) {
      const cur = reviewMap.get(rule.canonical) ?? { variants: [], note: rule.review };
      cur.variants.push(display);
      reviewMap.set(rule.canonical, cur);
      continue;
    }
    if (rule) {
      const cur = clusterMap.get(rule.canonical) ?? [];
      cur.push(display);
      clusterMap.set(rule.canonical, cur);
      continue;
    }
    if (GENERIC.has(kw)) { generic.push(display); continue; }
    // Singleton (provável igreja única) = cluster de 1 variante, canônico = a própria grafia.
    clusterMap.set(display, [display]);
  }

  const sortPt = (a: string, b: string) => a.localeCompare(b, 'pt-BR');
  const clusters: Cluster[] = [...clusterMap.entries()]
    .map(([canonical, variants]) => ({ canonical, variants: variants.sort(sortPt) }))
    .sort((a, b) => b.variants.length - a.variants.length || sortPt(a.canonical, b.canonical));
  const review: ReviewItem[] = [...reviewMap.entries()]
    .map(([canonical, v]) => ({ canonical, variants: v.variants.sort(sortPt), note: v.note }))
    .sort((a, b) => sortPt(a.canonical, b.canonical));

  return {
    '_leia-me':
      'Curadoria de igrejas para o --apply. clusters[].canonical SERÁ criado (idempotente por nome normalizado). ' +
      'review NÃO é criado (confirme e mova para clusters se for o caso). generic NÃO vira igreja (o legendário fica needsReview). ' +
      'noise é descartado. Edite livremente: mova nomes entre seções, ajuste canonical/variants. A decisão de agrupamento é sua. ' +
      'Regra: fusões só de grafia da MESMA localidade; cidades/localidades diferentes ficam separadas.',
    clusters,
    review,
    generic: generic.sort(sortPt),
    noise: noise.sort(sortPt),
  };
}

function printSummary(c: Curation) {
  const real = c.clusters.length;
  const merged = c.clusters.filter((x) => x.variants.length > 1).length;
  console.log('\n===== RESUMO DA CURADORIA (dry-run) =====');
  console.log(`Igrejas a criar (clusters):   ${real}  (${merged} são fusões de grafia)`);
  console.log(`Em revisão (review):          ${c.review.length}`);
  console.log(`Genéricos (não criam):        ${c.generic.length}`);
  console.log(`Ruído (descartados):          ${c.noise.length}`);

  console.log('\n----- Fusões (>1 variante) -----');
  c.clusters
    .filter((x) => x.variants.length > 1)
    .forEach((x) => console.log(`  ${x.canonical}  ←  ${x.variants.length} variantes`));

  console.log('\n----- Em revisão (confirme antes de criar) -----');
  c.review.forEach((x) => console.log(`  ${x.canonical}  ·  ${x.note}`));

  console.log('\n----- Genéricos (ficam needsReview) -----');
  console.log('  ' + c.generic.join(' · '));
  console.log('\n----- Ruído (descartado) -----');
  console.log('  ' + c.noise.join(' · '));
}

async function runDryRun(file: string) {
  const names = readChurchNames(file);
  console.log(`Lidos ${names.length} preenchimentos de igreja de ${file}.`);
  const curation = buildCuration(names);
  printSummary(curation);

  if (existsSync(CURATION_PATH) && !FORCE) {
    console.log(`\n⚠ Arquivo de curadoria já existe e NÃO foi sobrescrito (suas edições estão preservadas):`);
    console.log(`  ${CURATION_PATH}`);
    console.log('  Use --force para regenerar do zero (perde edições).');
  } else {
    mkdirSync(dirname(CURATION_PATH), { recursive: true });
    writeFileSync(CURATION_PATH, JSON.stringify(curation, null, 2) + '\n', 'utf-8');
    console.log(`\nArquivo de curadoria gerado: ${CURATION_PATH}`);
  }
  console.log('\nRevise/edite o arquivo e depois rode com --apply para criar as igrejas.');
}

async function runApply() {
  if (!existsSync(CURATION_PATH)) {
    throw new Error(`Arquivo de curadoria não encontrado: ${CURATION_PATH}. Rode o dry-run primeiro (sem --apply).`);
  }
  const curation: Curation = JSON.parse(readFileSync(CURATION_PATH, 'utf-8'));

  // 1) Igrejas canônicas — idempotente por nome normalizado. Mapa normName -> churchId
  //    (existentes + criadas) alimenta a regra de colisão de alias (canônico de outra igreja).
  const existing = await prisma.church.findMany({ where: { deletedAt: null }, select: { id: true, name: true } });
  const canonicalOwnerByNorm = new Map<string, string>();
  for (const c of existing) canonicalOwnerByNorm.set(normalizeName(c.name), c.id);

  let churchesCreated = 0;
  let churchesSkipped = 0;
  for (const cluster of curation.clusters) {
    const name = (cluster.canonical ?? '').trim();
    if (!name) continue;
    const key = normalizeName(name);
    if (canonicalOwnerByNorm.has(key)) { churchesSkipped++; continue; }
    const church = await prisma.church.create({ data: { name } });
    canonicalOwnerByNorm.set(key, church.id);
    churchesCreated++;
  }

  // 2) Aliases das variantes — idempotente por normalizedAlias; regra de colisão (D2).
  const existingAliases = await prisma.churchAlias.findMany({ select: { normalizedAlias: true, churchId: true } });
  const aliasOwnerByNorm = new Map<string, string>();
  for (const a of existingAliases) aliasOwnerByNorm.set(a.normalizedAlias, a.churchId);

  let aliasesCreated = 0;
  let aliasesNoop = 0;
  const collisions: string[] = [];
  for (const cluster of curation.clusters) {
    const canonicalName = (cluster.canonical ?? '').trim();
    if (!canonicalName) continue;
    const canonicalNormalized = normalizeName(canonicalName);
    const churchId = canonicalOwnerByNorm.get(canonicalNormalized);
    if (!churchId) continue;
    for (const variant of cluster.variants ?? []) {
      const { decision, normalizedAlias } = decideChurchAlias({
        variant,
        churchId,
        canonicalNormalized,
        canonicalOwnerByNorm,
        aliasOwnerByNorm,
      });
      if (decision === 'created') {
        await prisma.churchAlias.create({ data: { churchId, alias: variant, normalizedAlias, source: 'curation' } });
        aliasOwnerByNorm.set(normalizedAlias, churchId);
        aliasesCreated++;
      } else if (decision === 'collision') {
        collisions.push(`"${variant}" (cluster "${canonicalName}")`);
      } else {
        aliasesNoop++;
      }
    }
  }

  console.log('===== APLICADO (a partir do arquivo curado) =====');
  console.log(`Igrejas criadas:              ${churchesCreated}`);
  console.log(`Igrejas já existentes:        ${churchesSkipped}`);
  console.log(`Aliases criados:              ${aliasesCreated}`);
  console.log(`Aliases já existentes/no-op:  ${aliasesNoop}`);
  console.log(`Colisões de alias (puladas):  ${collisions.length}`);
  collisions.forEach((c) => console.log(`  ⚠ ${c}`));
  console.log(`Ignorados — review:           ${curation.review?.length ?? 0}`);
  console.log(`Ignorados — generic:          ${curation.generic?.length ?? 0}`);
  console.log(`Ignorados — noise:            ${curation.noise?.length ?? 0}`);
}

async function main() {
  if (APPLY) {
    await runApply();
    return;
  }
  if (!FILE_ARG) {
    console.error('Uso: pnpm tsx scripts/backfill-churches-from-forms.ts "<arquivo.xlsx|.csv>" [--force]  (dry-run)');
    console.error('     pnpm tsx scripts/backfill-churches-from-forms.ts --apply                        (cria do arquivo curado)');
    process.exit(1);
  }
  if (!existsSync(FILE_ARG)) {
    console.error(`Arquivo não encontrado: ${FILE_ARG}`);
    process.exit(1);
  }
  await runDryRun(FILE_ARG);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
