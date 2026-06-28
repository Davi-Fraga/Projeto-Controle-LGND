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
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

// ---- Normalização de cidade -------------------------------------------------
const CANON_CITY: Record<string, string> = {
  'caldas novas': 'Caldas Novas', morrinhos: 'Morrinhos', goiania: 'Goiânia',
  'aparecida de goiania': 'Aparecida de Goiânia', goiatuba: 'Goiatuba', itatiba: 'Itatiba',
  mairipotaba: 'Mairipotaba', piracanjuba: 'Piracanjuba', corumbaiba: 'Corumbaíba',
  itumbiara: 'Itumbiara', 'rio verde': 'Rio Verde', bonfinopolis: 'Bonfinópolis',
  'ponta grossa': 'Ponta Grossa', uberlandia: 'Uberlândia', sanclerlandia: 'Sanclerlândia',
  edeia: 'Edéia', caiaponia: 'Caiapônia', aloandia: 'Aloândia', luziania: 'Luziânia',
  alvorada: 'Alvorada', 'aguas lindas de goias': 'Águas Lindas de Goiás', ipameri: 'Ipameri',
  araguari: 'Araguari', 'ribeirao preto': 'Ribeirão Preto', pontalina: 'Pontalina',
  canapolis: 'Canápolis', marzagao: 'Marzagão', catalao: 'Catalão', 'sao paulo': 'São Paulo',
  'bela vista de goias': 'Bela Vista de Goiás', brasilia: 'Brasília', jatai: 'Jataí', maraba: 'Marabá',
};

function cityKey(s: string): string {
  let k = (s || '').trim().toLowerCase();
  k = k.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // tira acentos
  k = k.replace(/-/g, ' ');
  for (const suf of [' goias', ' go']) if (k.endsWith(suf)) k = k.slice(0, -suf.length).trim();
  return k.replace(/\s+/g, ' ').trim();
}
function canonCity(s: string | null): string | null {
  if (!s) return null;
  const k = cityKey(s);
  if (!k) return null;
  return CANON_CITY[k] ?? k.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ---- Limpeza de telefone e número ------------------------------------------
function cleanPhone(t: string | null): string | null {
  let d = (t || '').replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2);
  if (d.length > 11 && d.startsWith('0')) d = d.replace(/^0+/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d || null;
}
function cleanLgnd(n: string | null): string | null {
  const d = (n || '').replace(/\D/g, '');
  return d || null;
}

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
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.result?.data?.json)) return raw.result.data.json;
  // ou um array de envelopes (como veio no dump): procura o primeiro com json[]
  if (Array.isArray(raw)) for (const item of raw) {
    if (Array.isArray(item?.result?.data?.json)) return item.result.data.json;
  }
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
  console.log('==================');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
