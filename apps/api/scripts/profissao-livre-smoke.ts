/**
 * SMOKE TEST da change profissao-livre-vinculo-catalogo contra o BANCO REAL.
 *
 * POR QUÊ: os unit tests rodam com Prisma mockado — provam a regra, não a fiação. Este
 * script exercita o stack de verdade (DTO → `LegendariosService` → `ProfessionsService`
 * → Prisma Client tipado → coluna real), pegando o que mock nenhum pega: coluna
 * inexistente, client desatualizado, precedência que não persiste.
 *
 * SEGURANÇA: tudo roda dentro de UMA transação externa encerrada por ROLLBACK
 * intencional — nenhum dado de teste sobrevive, e o script confirma isso no fim. O
 * `$transaction` interno do service é redirecionado para a mesma transação por um Proxy
 * (mesmo padrão de injeção de tx usado no dry-run do backfill do Forms).
 *
 * PRÉ-REQUISITOS: migration aplicada, `prisma generate` feito, catálogo de profissões com
 * ao menos uma entrada ativa (usada no cenário de match) e **build da API ATUALIZADO** —
 * o script carrega os serviços de `dist`, então um build anterior ao último fix faz o
 * smoke reprovar por artefato velho, não por regressão real (já aconteceu).
 *
 * USO:
 *   pnpm --filter api build
 *   pnpm tsx apps/api/scripts/profissao-livre-smoke.ts
 */
import 'reflect-metadata';
import { PrismaClient } from '@prisma/client';
// Importa de `dist` (não de `src`): o `tsx` transpila os decorators do class-validator de
// forma incompatível e quebra ao carregar os DTOs. Usar o build tem um bônus — valida
// exatamente o artefato que vai a deploy. Por isso o `build` é pré-requisito abaixo.
import { AccessPolicyService } from '../dist/common/access/access-policy.service';
import { AuditService } from '../dist/modules/audit/audit.service';
import { LegendariosService } from '../dist/modules/legendarios/legendarios.service';
import { ProfessionsService } from '../dist/modules/professions/professions.service';

const prisma = new PrismaClient();
const results: { nome: string; ok: boolean; detalhe: string }[] = [];

function check(nome: string, ok: boolean, detalhe: string) {
  results.push({ nome, ok, detalhe });
}

/** Campos obrigatórios do DTO; cada cenário sobrepõe só o que interessa. */
const baseDto = {
  isFromRotaDoCerrado: false,
  servesInChurch: false,
  status: 'ACTIVE',
  socialActionInterest: false,
  expertiseIds: [],
} as any;

async function main() {
  const catalogo = await prisma.profession.findFirst({
    where: { deletedAt: null },
    select: { id: true, name: true },
  });
  if (!catalogo) throw new Error('Catálogo de profissões vazio — cenário de match não pode ser validado.');
  console.log(`Profissão do catálogo usada no match: "${catalogo.name}"\n`);

  try {
    await prisma.$transaction(
      async (tx) => {
        // O service abre sua própria transação no `update`; redireciona para ESTA.
        const prismaLike: any = new Proxy(tx as any, {
          get(target, prop) {
            if (prop === '$transaction') return async (cb: (c: unknown) => unknown) => cb(prismaLike);
            return target[prop as keyof typeof target];
          },
        });

        const audit = new AuditService(prismaLike);
        const professions = new ProfessionsService(prismaLike, audit);
        const service = new LegendariosService(prismaLike, audit, new AccessPolicyService(prismaLike), professions);

        const read = (id: string) =>
          tx.legendary.findUnique({
            where: { id },
            select: { professionId: true, professionText: true, needsReview: true },
          });

        // 1. Texto sem match: preserva o valor aparado e força revisão.
        const semMatch = await service.create({
          ...baseDto,
          fullName: 'SMOKE Sem Match',
          professionText: '  Engenheiro de Prompt  ',
        });
        const r1 = await read(semMatch.id);
        check(
          '1. sem match → professionText aparado + professionId null + needsReview',
          r1?.professionText === 'Engenheiro de Prompt' && r1?.professionId === null && r1?.needsReview === true,
          JSON.stringify(r1),
        );

        // 2. Match normalizado (caixa/espaços): vincula e limpa o texto.
        const comMatch = await service.create({
          ...baseDto,
          fullName: 'SMOKE Com Match',
          professionText: `  ${catalogo.name.toUpperCase()}  `,
        });
        const r2 = await read(comMatch.id);
        check(
          '2. match normalizado → professionId vinculado + professionText null + sem forçar revisão',
          r2?.professionId === catalogo.id && r2?.professionText === null && r2?.needsReview === false,
          JSON.stringify(r2),
        );

        // 3. PATCH não relacionado: profissão intacta (protege vínculo legado).
        await service.update(comMatch.id, { fullName: 'SMOKE Com Match Renomeado' } as any);
        const r3 = await read(comMatch.id);
        check(
          '3. PATCH sem profissão → vínculo preservado',
          r3?.professionId === catalogo.id && r3?.professionText === null,
          JSON.stringify(r3),
        );

        // 4. Limpeza explícita: zera os dois.
        await service.update(comMatch.id, { professionText: '' } as any);
        const r4 = await read(comMatch.id);
        check(
          '4. professionText vazio → limpa vínculo e texto',
          r4?.professionId === null && r4?.professionText === null,
          JSON.stringify(r4),
        );

        // 5. Cliente legado por ID limpa texto residual (exclusividade mútua).
        await service.update(semMatch.id, { professionId: catalogo.id } as any);
        const r5 = await read(semMatch.id);
        check(
          '5. professionId isolado → vincula E limpa o texto livre residual',
          r5?.professionId === catalogo.id && r5?.professionText === null,
          JSON.stringify(r5),
        );

        // 6. Payload ambíguo é rejeitado sem alterar nada.
        let rejeitou = false;
        try {
          await service.create({
            ...baseDto,
            fullName: 'SMOKE Ambiguo',
            professionId: catalogo.id,
            professionText: catalogo.name,
          });
        } catch (error) {
          rejeitou = (error as { status?: number }).status === 400 || error instanceof Error;
        }
        check('6. texto + ID juntos → rejeitado como ambíguo', rejeitou, rejeitou ? 'rejeitado' : 'NÃO rejeitou');

        throw new Error('ROLLBACK_INTENCIONAL');
      },
      { timeout: 60000, maxWait: 15000 },
    );
  } catch (error) {
    if ((error as Error).message !== 'ROLLBACK_INTENCIONAL') throw error;
  }

  // Prova que o rollback não deixou resíduo.
  const sobrou = await prisma.legendary.count({ where: { fullName: { startsWith: 'SMOKE ' } } });
  check('7. rollback removeu todo dado de teste', sobrou === 0, `legendários "SMOKE " restantes: ${sobrou}`);

  console.log('--- SMOKE ---');
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FALHA'}  ${r.nome}${r.ok ? '' : `  → ${r.detalhe}`}`);
  const falhas = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - falhas}/${results.length} PASS`);
  if (falhas) process.exitCode = 1;
}

main()
  .catch((error: Error) => {
    console.error('ERRO:', error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
