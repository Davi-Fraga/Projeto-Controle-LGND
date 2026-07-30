/**
 * PREVIEW / POST-CHECK da migration `20260730120000_add_legendary_profession_text`
 * (change profissao-livre-vinculo-catalogo).
 *
 * POR QUÊ: a migration é aditiva e NÃO deve tocar em nenhum vínculo existente. Este
 * script prova isso comparando o mesmo conjunto de métricas antes e depois — incluindo
 * um fingerprint md5 do conjunto `(id, professionId)`, que muda se QUALQUER vínculo
 * mudar de par, coisa que contagens agregadas sozinhas não detectariam.
 *
 * SOMENTE LEITURA: nenhuma mutation. Usa `$queryRawUnsafe` para não depender do client
 * gerado, então roda igual ANTES e DEPOIS da migration.
 *
 * CRITÉRIO DE ACEITE: entre as duas execuções, `total`, `com_vinculo`,
 * `profissoes_distintas`, `fingerprint` e `orfaos` devem ser IDÊNTICOS; depois a coluna
 * deve existir como `text` / nullable com `com_texto_livre = 0`.
 *
 * USO:
 *   pnpm tsx apps/api/scripts/profissao-livre-check.ts antes    # antes da migration
 *   pnpm exec prisma migrate deploy
 *   pnpm tsx apps/api/scripts/profissao-livre-check.ts depois   # depois da migration
 */
import { PrismaClient } from '@prisma/client';

const phase = process.argv[2] ?? 'check';
const prisma = new PrismaClient();

async function main() {
  const [counts] = await prisma.$queryRawUnsafe<
    { total: number; com_vinculo: number; profissoes_distintas: number }[]
  >(`
    SELECT count(*)::int                       AS total,
           count("professionId")::int          AS com_vinculo,
           count(DISTINCT "professionId")::int AS profissoes_distintas
      FROM "Legendary" WHERE "deletedAt" IS NULL
  `);

  // Fingerprint do CONJUNTO de pares: prova que nenhum vínculo trocou de profissão.
  const [fp] = await prisma.$queryRawUnsafe<{ fingerprint: string | null }[]>(`
    SELECT md5(string_agg(id::text || ':' || coalesce("professionId"::text,'-'), ',' ORDER BY id)) AS fingerprint
      FROM "Legendary" WHERE "deletedAt" IS NULL
  `);

  // Vínculos órfãos (FK apontando para Profession inexistente). Esperado: 0.
  const [orphans] = await prisma.$queryRawUnsafe<{ orfaos: number }[]>(`
    SELECT count(*)::int AS orfaos
      FROM "Legendary" l
      LEFT JOIN "Profession" p ON p.id = l."professionId"
     WHERE l."professionId" IS NOT NULL AND p.id IS NULL
  `);

  const [col] = await prisma.$queryRawUnsafe<
    { existe: number; is_nullable: string | null; data_type: string | null }[]
  >(`
    SELECT count(*)::int AS existe, max(is_nullable) AS is_nullable, max(data_type) AS data_type
      FROM information_schema.columns
     WHERE table_name = 'Legendary' AND column_name = 'professionText'
  `);

  let comTextoLivre: number | null = null;
  if (col.existe > 0) {
    const [t] = await prisma.$queryRawUnsafe<{ com_texto_livre: number }[]>(
      `SELECT count("professionText")::int AS com_texto_livre FROM "Legendary"`,
    );
    comTextoLivre = t.com_texto_livre;
  }

  console.log(
    JSON.stringify(
      {
        fase: phase,
        total: counts.total,
        com_vinculo: counts.com_vinculo,
        profissoes_distintas: counts.profissoes_distintas,
        fingerprint: fp.fingerprint,
        orfaos: orphans.orfaos,
        coluna_professionText:
          col.existe > 0
            ? { existe: true, tipo: col.data_type, nullable: col.is_nullable, com_texto_livre: comTextoLivre }
            : { existe: false },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error: Error) => {
    console.error('ERRO:', error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
