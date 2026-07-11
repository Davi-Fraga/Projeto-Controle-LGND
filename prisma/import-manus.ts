/**
 * Importação dos legendários exportados do Manus para o Projeto Gestão LGND.
 *
 * COMO USAR:
 *   1. Salve o JSON cru exportado do Manus (a resposta da aba Network — o array
 *      com os objetos { id, nome, numeroLegendario, equipe, ... }) em:
 *        prisma/data/manus-membros.json
 *      (pode ser o array direto OU o objeto { result: { data: { json: [...] } } };
 *       o script aceita os dois.)
 *   2. Rode:  pnpm tsx prisma/import-manus.ts
 *      (ou: npx ts-node prisma/import-manus.ts)
 *
 * O que faz:
 *   - Normaliza cidade (junta "Caldas novas"/"CALDAS NOVAS"/"Caldas Novas GO" → "Caldas Novas").
 *   - Limpa telefone (formato único) e numeroLegendario (remove pontos).
 *   - Cria/atualiza Team por nome (as 9 equipes) e vincula via TeamMembership.
 *   - Faz UPSERT do Legendary por lgndNumber → IDEMPOTENTE (rodar 2x não duplica).
 *   - Marca todos como isFromRotaDoCerrado = true e status ACTIVE.
 *   - Pessoas com função de liderança são marcadas com needsReview = true
 *     (pra você definir coordenador de equipe manualmente depois).
 *
 * NÃO toca em auth, permissões, nem em dados existentes fora dos legendários importados.
 */
import { PrismaClient, LegendaryStatus, TeamMembershipStatus } from '@prisma/client';
// Import relativo à fonte (não ao pacote): este script roda com `tsx` a partir da
// raiz, onde `@central-da-manada/shared` não está linkado. tsx resolve o .ts direto.
import { canonCity as canonCityShared, cleanPhone, cleanLgnd } from '../packages/shared/src/normalization';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

// Normalização (cidade/telefone/número) agora vem do helper compartilhado
// `@central-da-manada/shared` — MESMA lógica usada pelo webhook de sincronização,
// garantindo chave de dedup idêntica. Ver packages/shared/src/normalization.ts.

// Grafias que caíram no fallback Title-Case (não estavam no mapa) — reportadas no resumo.
const unmappedCities = new Set<string>();
const canonCity = (s: string | null): string | null =>
  canonCityShared(s, (raw) => unmappedCities.add(raw));

// função de liderança? (marca needsReview)
function isLeadership(funcao: string | null): boolean {
  const f = (funcao || '').trim().toLowerCase();
  return /coorden|lider|líder|sub/.test(f);
}

type ManusRow = {
  nome: string; numeroLegendario: string | null; equipe: string | null;
  funcao: string | null; telefone: string | null; cidade: string | null;
  estado: string | null; email: string | null;
};

function loadRows(): ManusRow[] {
  const raw = JSON.parse(readFileSync(join(__dirname, 'data', 'manus-membros.json'), 'utf-8'));
  // aceita array direto OU { result: { data: { json: [...] } } }
  if (Array.isArray(raw)) {
    // ou um array de envelopes (como veio no dump): procura o primeiro com json[]
    for (const item of raw) {
      if (Array.isArray(item?.result?.data?.json)) return item.result.data.json;
    }
    return raw;
  }
  if (Array.isArray(raw?.result?.data?.json)) return raw.result.data.json;
  throw new Error('Formato do JSON não reconhecido. Esperado array de membros.');
}

async function main() {
  const rows = loadRows();
  console.log(`Lidos ${rows.length} registros do Manus.`);

  // 1) Garante as equipes (Team) por nome, sem duplicar
  const teamNames = [...new Set(rows.map((r) => (r.equipe || '').trim()).filter(Boolean))];
  const teamByName = new Map<string, string>();
  for (const name of teamNames) {
    const existing = await prisma.team.findFirst({ where: { name, deletedAt: null } });
    const team = existing ?? (await prisma.team.create({ data: { name } }));
    teamByName.set(name, team.id);
  }
  console.log(`Equipes garantidas: ${teamNames.join(', ')}`);

  let created = 0, updated = 0, membershipsCreated = 0, flagged = 0;

  for (const r of rows) {
    const lgndNumber = cleanLgnd(r.numeroLegendario);
    const data = {
      fullName: r.nome?.trim() || 'Sem nome',
      lgndNumber,
      phone: cleanPhone(r.telefone),
      city: canonCity(r.cidade),
      isFromRotaDoCerrado: true,
      status: LegendaryStatus.ACTIVE,
      needsReview: isLeadership(r.funcao),
      notes: r.funcao?.trim() ? `Função no Manus: ${r.funcao.trim()}` : null,
    };
    if (data.needsReview) flagged++;

    // UPSERT idempotente por lgndNumber (quando existir); senão cria
    let legendary;
    if (lgndNumber) {
      const existing = await prisma.legendary.findUnique({ where: { lgndNumber } });
      if (existing) {
        legendary = await prisma.legendary.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        legendary = await prisma.legendary.create({ data });
        created++;
      }
    } else {
      legendary = await prisma.legendary.create({ data });
      created++;
    }

    // Vínculo com a equipe (TeamMembership) — não duplica
    const teamId = r.equipe?.trim() ? teamByName.get(r.equipe.trim()) : undefined;
    if (teamId) {
      const hasMembership = await prisma.teamMembership.findFirst({
        where: { teamId, legendaryId: legendary.id, deletedAt: null },
      });
      if (!hasMembership) {
        await prisma.teamMembership.create({
          data: { teamId, legendaryId: legendary.id, role: r.funcao?.trim() || 'Membro', status: TeamMembershipStatus.ACTIVE },
        });
        membershipsCreated++;
      }
    }
  }

  console.log('\n===== RESUMO =====');
  console.log(`Legendários criados:        ${created}`);
  console.log(`Legendários atualizados:    ${updated}`);
  console.log(`Vínculos de equipe criados: ${membershipsCreated}`);
  console.log(`Marcados p/ revisão (líderes): ${flagged}`);
  if (unmappedCities.size > 0) {
    console.log(`Cidades fora do mapa (fallback Title-Case): ${[...unmappedCities].join(', ')}`);
  } else {
    console.log('Cidades fora do mapa: nenhuma');
  }
  console.log('==================');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
