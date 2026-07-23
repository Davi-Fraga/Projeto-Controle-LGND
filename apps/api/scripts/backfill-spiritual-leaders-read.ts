/**
 * BACKFILL idempotente da permission `spiritual-leaders.read`
 * (change alinhar-abas-controle-acessos).
 *
 * POR QUÊ: a view de Líderes Espirituais (`GET /churches/spiritual-leaders`) passou a exigir
 * uma permission DEDICADA em vez de `churches.read`. Para NÃO tirar acesso de quem já via a
 * lista, todo NÃO-ADMIN que hoje tem GRANT EFETIVO de `churches.read` (por override de usuário —
 * a única fonte de acesso para não-admin) recebe também um GRANT de `spiritual-leaders.read`.
 *
 * REGRAS (fail-safe, sem ampliar acesso):
 *   - Só conta GRANT por OVERRIDE de usuário de `churches.read` (papel não concede a não-admin).
 *   - Admin é ignorado: já recebe a permission pela seed (loop de all-permissions).
 *   - Se já existir QUALQUER override de `spiritual-leaders.read` (GRANT ou REVOKE), não mexe.
 *   - Papel que apenas "listava" churches.read, sem concessão efetiva, NÃO ganha acesso novo.
 *
 * IDEMPOTÊNCIA: reexecutar não cria duplicatas nem sobrescreve overrides existentes.
 *
 * ORDEM DE DEPLOY: seed (cria a permission via SEED_MODE=access) → ESTE backfill --apply →
 * subir a API com o novo guard. A permission já existe e os acessos legítimos são preservados.
 *
 * USO:
 *   pnpm tsx apps/api/scripts/backfill-spiritual-leaders-read.ts           # dry-run (padrão)
 *   pnpm tsx apps/api/scripts/backfill-spiritual-leaders-read.ts --apply   # escreve
 *
 * PRIVACIDADE: o relatório identifica usuários só por id (nunca e-mail/nome).
 */
import 'reflect-metadata';
import { PermissionEffect, PrismaClient } from '@prisma/client';
import { ADMIN_ROLE } from '../src/common/access/access.constants';

async function main() {
  const apply = process.argv.includes('--apply');
  const prisma = new PrismaClient();
  try {
    const perm = await prisma.permission.findUnique({ where: { key: 'spiritual-leaders.read' } });
    if (!perm) {
      console.error('Permission `spiritual-leaders.read` ausente — rode a seed (SEED_MODE=access) antes do backfill.');
      process.exit(1);
      return;
    }

    // Não-admin com GRANT efetivo de churches.read (por override) = quem via a lista antiga.
    const grants = await prisma.userPermissionOverride.findMany({
      where: { effect: PermissionEffect.GRANT, permission: { key: 'churches.read' } },
      include: {
        user: {
          include: {
            roles: { include: { role: true } },
            permissionOverrides: { include: { permission: true } },
          },
        },
      },
    });

    let created = 0;
    let skippedExisting = 0;
    let skippedAdmin = 0;
    const affected: string[] = [];

    for (const grant of grants) {
      const user = grant.user;
      if (!user || user.deletedAt) continue;
      if (user.roles.some((userRole) => userRole.role.name === ADMIN_ROLE)) {
        skippedAdmin += 1;
        continue;
      }
      const alreadyHasOverride = user.permissionOverrides.some(
        (override) => override.permission.key === 'spiritual-leaders.read',
      );
      if (alreadyHasOverride) {
        skippedExisting += 1;
        continue;
      }
      if (apply) {
        await prisma.userPermissionOverride.upsert({
          where: { userId_permissionId: { userId: user.id, permissionId: perm.id } },
          update: {}, // idempotente: nunca sobrescreve
          create: { userId: user.id, permissionId: perm.id, effect: PermissionEffect.GRANT },
        });
      }
      created += 1;
      affected.push(user.id);
    }

    console.log(`[${apply ? 'APPLY' : 'DRY-RUN'}] candidatos com GRANT churches.read: ${grants.length}`);
    console.log(`  concede spiritual-leaders.read: ${created}`);
    console.log(`  já tinham override (pulados): ${skippedExisting} | admins ignorados: ${skippedAdmin}`);
    if (affected.length) console.log(`  usuários afetados (ids): ${affected.join(', ')}`);
    if (!apply) console.log('DRY-RUN: nada foi escrito. Use --apply para persistir.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
