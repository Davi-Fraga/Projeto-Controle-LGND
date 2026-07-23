/**
 * BACKFILL idempotente de `UserScopePolicy` (change access-scope-bulk-selection).
 *
 * POR QUÊ: o escopo passou a ter estado explícito por (usuário, tipo): MISSING / SELECTED / ALL.
 * Os escopos LEGADOS (linhas em `UserScope`) representam intenção "SELECTED". Este backfill cria
 * uma política `SELECTED` para cada par (userId, type) que já possui ao menos um `UserScope`.
 *
 * REGRAS (sem ampliar acesso):
 *   - Usuário SEM `UserScope` de um tipo → NENHUMA política (permanece MISSING).
 *   - Nunca cria `ALL` (isso é intenção explícita, feita só pela API/admin).
 *   - Se já existir política para (userId, type) → NÃO sobrescreve (preserva um `ALL` eventual).
 *
 * IDEMPOTÊNCIA: reexecutar não cria duplicatas nem altera valores/políticas existentes.
 *
 * ORDEM DE DEPLOY: migration (cria a tabela) → ESTE backfill --apply → subir a API.
 *
 * USO:
 *   pnpm tsx apps/api/scripts/backfill-user-scope-policy.ts           # dry-run (padrão)
 *   pnpm tsx apps/api/scripts/backfill-user-scope-policy.ts --apply   # escreve
 */
import 'reflect-metadata';
import { PrismaClient, UserScopeSelectionMode } from '@prisma/client';

async function main() {
  const apply = process.argv.includes('--apply');
  const prisma = new PrismaClient();
  try {
    // Pares distintos (userId, type) que têm ao menos um UserScope legado.
    const pairs = await prisma.userScope.findMany({
      distinct: ['userId', 'type'],
      select: { userId: true, type: true },
    });

    let created = 0;
    let skippedExisting = 0;
    for (const { userId, type } of pairs) {
      const existing = await prisma.userScopePolicy.findUnique({ where: { userId_type: { userId, type } } });
      if (existing) {
        skippedExisting += 1;
        continue;
      }
      if (apply) {
        await prisma.userScopePolicy.create({ data: { userId, type, mode: UserScopeSelectionMode.SELECTED } });
      }
      created += 1;
    }

    console.log(`[${apply ? 'APPLY' : 'DRY-RUN'}] pares (userId,type) com escopo legado: ${pairs.length}`);
    console.log(`  cria política SELECTED: ${created} | já tinham política: ${skippedExisting}`);
    if (!apply) console.log('DRY-RUN: nada foi escrito. Use --apply para persistir.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
