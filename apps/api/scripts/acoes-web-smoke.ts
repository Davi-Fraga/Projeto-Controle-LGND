/**
 * Smoke de autorização da change `acoes-web-e-seletores-contextuais` (tasks 6.5/6.6).
 *
 * Prova, contra a API REAL, que esconder um controle na interface não é o que protege nada:
 * a chamada manual continua recebendo `403` (sem permission) ou `404` (pai fora do escopo).
 *
 * Por que dá para montar perfis exatos: em `EffectivePermissionsService`, a base do papel só
 * conta para o Administrador — para os demais, as efetivas vêm SÓ dos overrides `GRANT`. Então
 * um usuário com papel MEMBER + N grants tem exatamente essas N permissions, sem herança.
 *
 * Uso (ambiente LOCAL):
 *   pnpm --filter api exec tsx scripts/acoes-web-smoke.ts            # cria, testa e apaga
 *   pnpm --filter api exec tsx scripts/acoes-web-smoke.ts --keep     # não apaga (p/ depurar)
 *
 * Cria usuários `*@acoes-web-smoke.local` e os REMOVE no final. Não toca em nenhum dado real.
 * NUNCA rodar em produção: escreve no banco apontado por `DATABASE_URL`.
 */

import { PrismaClient } from '@prisma/client';
import { satisfiesPermissionRule, visiblePrimaryNav, type PermissionRule } from '@central-da-manada/shared';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const API = process.env.SMOKE_API_URL ?? 'http://localhost:3333/api';
const PASSWORD = 'SmokeAcoesWeb!2026';
const EMAIL_DOMAIN = '@acoes-web-smoke.local';
const KEEP = process.argv.includes('--keep');
// O RateLimitGuard global corta em 100 req/min por IP. As checagens de autorização sozinhas já
// gastam ~70; somar a varredura de regressão na mesma passada estoura o teto e produz 429 que
// PARECE defeito do sistema. Por isso são duas passadas independentes:
//   sem flag  → autorização (403/404/paridade)
//   --sweep   → regressão (varre as rotas do sistema como admin)
const SWEEP_ONLY = process.argv.includes('--sweep');

type Profile = {
  key: string;
  label: string;
  admin?: boolean;
  grants: string[];
  /** Dimensões liberadas via `UserScopePolicy=ALL` — sem escopo tudo vira 404 e o teste não prova nada. */
  scopeAll: Array<'CITY' | 'CHURCH' | 'TEAM' | 'TOP'>;
};

const PROFILES: Profile[] = [
  {
    key: 'view',
    label: 'VIEW — só leitura das telas',
    grants: ['legendarios.read', 'teams.read', 'tops.read', 'social-actions.read', 'teams.members.read'],
    scopeAll: ['CITY', 'CHURCH', 'TEAM', 'TOP'],
  },
  {
    key: 'edit-parcial',
    label: 'EDIT PARCIAL — adiciona membro, NÃO abre Legendários (o caso que originou a change)',
    grants: ['teams.members.add'],
    scopeAll: ['CITY', 'CHURCH', 'TEAM', 'TOP'],
  },
  {
    key: 'edit-completo',
    label: 'EDIT COMPLETO — edita os recursos-pai, ainda sem a tela de Legendários',
    grants: [
      'teams.read', 'teams.update', 'teams.members.add',
      'tops.read', 'tops.update', 'tops.participants.add', 'tops.servants.add', 'tops.teams.add',
      'social-actions.read', 'social-actions.update', 'social-actions.participants.add',
    ],
    scopeAll: ['CITY', 'CHURCH', 'TEAM', 'TOP'],
  },
  {
    // O perfil REALISTA do problema que a change resolve. Os sintéticos acima isolam permissions
    // uma a uma e por isso não enxergam aba nenhuma (`screenAccess` é derivado de permission +
    // escopo, e a VIEW de cada tela no SCREEN_CATALOG é um conjunto, não uma key solta).
    // Este aqui é o que um coordenador de equipe teria de fato: entra na tela de Equipes,
    // adiciona membro, e NÃO tem a tela de Legendários.
    key: 'coord-equipe',
    label: 'COORD. DE EQUIPE — perfil realista: entra em Equipes, adiciona membro, sem Legendários',
    grants: ['teams.read', 'teams.members.read', 'teams.members.add'],
    scopeAll: ['CITY', 'CHURCH', 'TEAM', 'TOP'],
  },
  { key: 'admin', label: 'ADMIN — coordenação', admin: true, grants: [], scopeAll: [] },
];

type Check = {
  profile: string;
  method: 'GET' | 'POST' | 'PATCH';
  path: string;
  expect: number | number[];
  why: string;
  body?: unknown;
};

const tokens = new Map<string, string>();
const results: Array<{ ok: boolean; check: Check; got: number }> = [];

async function call(profileKey: string, method: string, path: string, body?: unknown) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${tokens.get(profileKey)}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return response.status;
}

async function run(checks: Check[]) {
  for (const check of checks) {
    const got = await call(check.profile, check.method, check.path, check.body);
    const expected = Array.isArray(check.expect) ? check.expect : [check.expect];
    const ok = expected.includes(got);
    results.push({ ok, check, got });
    const mark = ok ? '  ok ' : ' FAIL';
    console.log(`${mark} [${check.profile}] ${check.method} ${check.path} → ${got} (esperado ${expected.join('|')}) · ${check.why}`);
  }
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const permissions = await prisma.permission.findMany();
  const byKey = new Map(permissions.map((p) => [p.key, p.id]));

  for (const profile of PROFILES) {
    const email = `${profile.key}${EMAIL_DOMAIN}`;
    const roleName = profile.admin ? 'COORDINATION_ADMIN' : 'MEMBER';
    const role = await prisma.role.findFirst({ where: { name: roleName } });
    if (!role) throw new Error(`Papel ${roleName} não existe — rode o seed de acesso antes.`);

    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash, isActive: true, deletedAt: null },
      create: { email, name: `Smoke ${profile.key}`, passwordHash, isActive: true },
    });

    await prisma.userRole.deleteMany({ where: { userId: user.id } });
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });

    await prisma.userPermissionOverride.deleteMany({ where: { userId: user.id } });
    for (const key of profile.grants) {
      const permissionId = byKey.get(key);
      if (!permissionId) throw new Error(`Permission inexistente no banco: ${key}`);
      await prisma.userPermissionOverride.create({ data: { userId: user.id, permissionId, effect: 'GRANT' } });
    }

    await prisma.userScopePolicy.deleteMany({ where: { userId: user.id } });
    for (const type of profile.scopeAll) {
      await prisma.userScopePolicy.create({ data: { userId: user.id, type, mode: 'ALL' } });
    }

    const response = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    if (!response.ok) throw new Error(`Login falhou para ${email}: ${response.status}`);
    const payload = await response.json();
    tokens.set(profile.key, payload.data.accessToken);
    console.log(`  · ${profile.label}`);
  }
}

async function cleanup() {
  const users = await prisma.user.findMany({ where: { email: { endsWith: EMAIL_DOMAIN } } });
  const userIds = users.map((u) => u.id);
  if (!userIds.length) return;
  await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.userPermissionOverride.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.userScopePolicy.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.userScope.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  console.log(`\nLimpeza: ${userIds.length} usuários de smoke removidos.`);
}

/**
 * PARIDADE gate visual ↔ API — o coração da change.
 *
 * A tese é que a interface só deve oferecer o que a API concede. Um teste de componente com
 * fixture escrita à mão não prova isso: ele confirma que o componente obedece à fixture. Aqui a
 * entrada é o `/auth/me` REAL de cada usuário e a saída é o status REAL do endpoint. Se a regra
 * declarada na tela discordar do que a API responde, aparece como falha:
 *
 *   - visual libera / API nega  → caminho morto (o usuário clica e toma 403)
 *   - visual esconde / API concede → ação legítima escondida (foi o bug do `equipes/[id]`)
 *
 * As regras abaixo são as DECLARADAS nas páginas. Divergiram da página? Este check acusa —
 * mas ele precisa ser atualizado junto com ela; é um contrato, não uma dedução automática.
 */
async function runParityChecks(parents: { team: any; top: any; action: any }) {
  console.log('\n— PARIDADE: o que a tela oferece × o que a API concede —');

  const controls: Array<{ control: string; rule: PermissionRule; method: 'GET' | 'POST' | 'PATCH'; path: string | null; body?: unknown }> = [
    {
      control: 'Equipes/[id] · seletor "Adicionar membro"',
      rule: { mode: 'allOf', keys: ['teams.members.add'] },
      method: 'GET',
      path: parents.team ? `/teams/${parents.team.id}/member-candidates/options` : null,
    },
    {
      control: 'Equipes/[id] · botão "Editar" da equipe',
      rule: { mode: 'allOf', keys: ['teams.update'] },
      method: 'PATCH',
      path: parents.team ? `/teams/${parents.team.id}` : null,
      body: { name: 'nao deve gravar' },
    },
    {
      control: 'TOPs/[id] · seletor de participante',
      rule: { mode: 'allOf', keys: ['tops.participants.add'] },
      method: 'GET',
      path: parents.top ? `/tops/${parents.top.id}/participant-candidates/options` : null,
    },
    {
      control: 'TOPs/[id] · seletor de servo',
      rule: { mode: 'allOf', keys: ['tops.servants.add'] },
      method: 'GET',
      path: parents.top ? `/tops/${parents.top.id}/servant-candidates/options` : null,
    },
    {
      control: 'Ações Sociais/[id] · vincular participante',
      rule: { mode: 'allOf', keys: ['social-actions.participants.add'] },
      method: 'GET',
      path: parents.action ? `/social-actions/${parents.action.id}/participant-candidates/options` : null,
    },
    {
      control: 'Ações Sociais/[id] · botão "Cancelar"',
      rule: { mode: 'allOf', keys: ['social-actions.update'] },
      method: 'PATCH',
      path: parents.action ? `/social-actions/${parents.action.id}/cancel` : null,
      body: {},
    },
    {
      control: 'Formulários de dirigente · LegendarioCombobox (união do caso B)',
      rule: {
        mode: 'anyOf',
        keys: ['legendarios.read', 'tops.create', 'tops.update', 'tops.teams.add', 'tops.teams.update',
          'tops.families.create', 'tops.families.update', 'teams.create', 'teams.update',
          'social-actions.create', 'social-actions.update', 'churches.create', 'churches.update',
          'communications.create', 'communications.update'],
      },
      method: 'GET',
      path: '/legendarios/options',
    },
  ];

  for (const profile of PROFILES) {
    // `/auth/me` REAL: é a mesma carga que o web usa para decidir o que renderizar.
    const meResponse = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${tokens.get(profile.key)}` } });
    const me = (await meResponse.json()).data;
    const permissions: string[] = me.permissions ?? [];

    for (const item of controls) {
      if (!item.path) continue;
      const visualOffers = satisfiesPermissionRule(permissions, item.rule);
      const status = await call(profile.key, item.method, item.path, item.body);
      const apiGrants = status !== 403;
      const ok = visualOffers === apiGrants;
      results.push({
        ok,
        got: status,
        check: { profile: profile.key, method: item.method, path: item.path, expect: status, why: item.control },
      });
      const verdict = ok
        ? `  ok  [${profile.key}] ${visualOffers ? 'oferece' : 'esconde '} ↔ API ${status}`
        : ` FAIL [${profile.key}] visual ${visualOffers ? 'OFERECE' : 'ESCONDE'} mas API respondeu ${status}`;
      console.log(`${verdict} · ${item.control}`);
    }
  }

  // Navegação: as abas visíveis têm que ser exatamente as telas que o usuário consegue abrir.
  console.log('\n— Navegação lateral derivada do /auth/me real —');
  for (const profile of PROFILES) {
    const meResponse = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${tokens.get(profile.key)}` } });
    const me = (await meResponse.json()).data;
    const tabs = visiblePrimaryNav(me).map((item) => item.label);
    console.log(`  · ${profile.key}: ${tabs.length ? tabs.join(', ') : '(nenhuma aba — acesso não configurado)'}`);
  }
}

/**
 * Varredura de REGRESSÃO do sistema, como admin.
 *
 * Existe porque os testes de service mockam o `PrismaService`: um nome de relação errado
 * (`teamMemberships`, `topParticipants`, `socialActionParticipants`…) ou um `select` inválido
 * passa verde no Jest e só explode em runtime, contra o banco de verdade. Aqui cada rota é
 * chamada pra valer e a query roda no Postgres.
 */
async function runSystemSweep(ctx: { team: any; top: any; action: any; legendary: any }) {
  console.log('\n— VARREDURA DE REGRESSÃO (admin, contra o banco real) —');

  const routes: Array<[string, string]> = [
    ['Painel', '/dashboard/summary'],
    ['Legendários · lista', '/legendarios?page=1&perPage=5'],
    ['Legendários · options', '/legendarios/options?limit=5'],
    ['Legendários · detalhe', ctx.legendary ? `/legendarios/${ctx.legendary.id}` : ''],
    ['Legendários · histórico', ctx.legendary ? `/legendarios/${ctx.legendary.id}/history` : ''],
    ['Equipes · lista', '/teams?page=1&perPage=5'],
    ['Equipes · options', '/teams/options?limit=5'],
    ['Equipes · detalhe', ctx.team ? `/teams/${ctx.team.id}` : ''],
    ['Equipes · membros', ctx.team ? `/teams/${ctx.team.id}/members?page=1&perPage=5` : ''],
    ['Equipes · candidatos a membro', ctx.team ? `/teams/${ctx.team.id}/member-candidates/options?limit=5` : ''],
    ['TOPs · lista', '/tops?page=1&perPage=5'],
    ['TOPs · options', '/tops/options?limit=5'],
    ['TOPs · detalhe', ctx.top ? `/tops/${ctx.top.id}` : ''],
    ['TOPs · participantes', ctx.top ? `/tops/${ctx.top.id}/participants?page=1&perPage=5` : ''],
    ['TOPs · options de participante', ctx.top ? `/tops/${ctx.top.id}/participants/options?limit=5` : ''],
    ['TOPs · candidatos a participante', ctx.top ? `/tops/${ctx.top.id}/participant-candidates/options?limit=5` : ''],
    ['TOPs · candidatos a servo', ctx.top ? `/tops/${ctx.top.id}/servant-candidates/options?limit=5` : ''],
    ['TOPs · servos', ctx.top ? `/tops/${ctx.top.id}/servants?page=1&perPage=5` : ''],
    ['TOPs · equipes', ctx.top ? `/tops/${ctx.top.id}/teams` : ''],
    ['TOPs · famílias', ctx.top ? `/tops/${ctx.top.id}/families` : ''],
    ['TOPs · organograma', ctx.top ? `/tops/${ctx.top.id}/org-chart?view=teams` : ''],
    ['Ações Sociais · lista', '/social-actions?page=1&perPage=5'],
    ['Ações Sociais · detalhe', ctx.action ? `/social-actions/${ctx.action.id}` : ''],
    ['Ações Sociais · participantes', ctx.action ? `/social-actions/${ctx.action.id}/participants` : ''],
    ['Ações Sociais · candidatos', ctx.action ? `/social-actions/${ctx.action.id}/participant-candidates/options?limit=5` : ''],
    ['Ações Sociais · sugestões', '/social-actions/volunteers/suggestions?page=1&perPage=5'],
    // `/churches` e `/churches/spiritual-leaders` NÃO paginam: o DTO tem whitelist e recusa
    // `page`/`perPage` com 400. Devolvem a coleção inteira.
    ['Igrejas · lista', '/churches'],
    ['Líderes Espirituais', '/churches/spiritual-leaders'],
    ['Comunicação · lista', '/communications?page=1&perPage=5'],
    ['Relatórios · legendários', '/reports/legendarios?page=1&perPage=5'],
    ['Mapa', '/map/rota-do-cerrado'],
    ['Organograma · equipes', '/org-chart/teams/options'],
    // `mode` é obrigatório nesta rota (legendaries | churches).
    ['Organograma · cidades', '/org-chart/cities?mode=legendaries'],
    ['Organograma · coordenadores', '/org-chart/coordinators'],
    ['Pré-inscrições', '/preregistrations?page=1&perPage=5'],
    ['Sessão', '/auth/me'],
  ];

  for (const [label, path] of routes) {
    if (!path) continue;
    // O RateLimitGuard global corta em 100 req/min por IP. A varredura inteira estoura esse teto
    // se disparar em rajada — 429 aqui seria defeito do script, não do sistema.
    await new Promise((resolve) => setTimeout(resolve, 700));
    const response = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${tokens.get('admin')}` } });
    let size = '';
    try {
      const payload: any = await response.json();
      const data = payload?.data;
      if (Array.isArray(data)) size = `${data.length} itens`;
      else if (Array.isArray(payload)) size = `${payload.length} itens`;
      else if (data && typeof data === 'object') size = 'objeto';
      if (payload?.meta?.total !== undefined) size = `${payload.meta.total} no total`;
    } catch {
      size = '(sem corpo JSON)';
    }
    const ok = response.status === 200;
    results.push({
      ok,
      got: response.status,
      check: { profile: 'admin', method: 'GET', path, expect: 200, why: `regressão: ${label}` },
    });
    console.log(`${ok ? '  ok ' : ' FAIL'} ${label.padEnd(34)} → ${response.status} ${size}`);
  }
}

async function main() {
  console.log(`API: ${API}\n\nPerfis:`);
  await seedUsers();

  if (SWEEP_ONLY) {
    await runSystemSweep({
      team: await prisma.team.findFirst({ where: { deletedAt: null } }),
      top: await prisma.topEvent.findFirst({ where: { deletedAt: null } }),
      action: await prisma.socialAction.findFirst({ where: { deletedAt: null } }),
      legendary: await prisma.legendary.findFirst({ where: { deletedAt: null } }),
    });
    const sweepFailed = results.filter((r) => !r.ok);
    console.log(`
${'='.repeat(70)}
Varredura: ${results.length} rotas · ok: ${results.length - sweepFailed.length} · falhas: ${sweepFailed.length}`);
    for (const item of sweepFailed) console.log(`  ${item.check.path} → ${item.got}`);
    return sweepFailed.length;
  }

  // Recursos-pai reais para exercitar o caminho feliz e o escopo.
  const team = await prisma.team.findFirst({ where: { deletedAt: null } });
  const top = await prisma.topEvent.findFirst({ where: { deletedAt: null } });
  const action = await prisma.socialAction.findFirst({ where: { deletedAt: null } });
  const ABSENT = '00000000-0000-0000-0000-000000000000';

  console.log('\n— Endpoints CONTEXTUAIS: a permission da AÇÃO destrava, a da tela não —');
  const contextual: Check[] = [];
  if (team) {
    contextual.push(
      { profile: 'edit-parcial', method: 'GET', path: `/teams/${team.id}/member-candidates/options`, expect: 200, why: 'teams.members.add basta — É O CASO QUE ORIGINOU A CHANGE' },
      { profile: 'view', method: 'GET', path: `/teams/${team.id}/member-candidates/options`, expect: 403, why: 'ler a tela não dá o diretório de candidatos' },
      { profile: 'admin', method: 'GET', path: `/teams/${team.id}/member-candidates/options`, expect: 200, why: 'admin' },
      { profile: 'edit-parcial', method: 'GET', path: `/teams/${ABSENT}/member-candidates/options`, expect: 404, why: 'equipe-pai inexistente → 404, sem vazar candidatos' },
    );
  }
  if (top) {
    contextual.push(
      { profile: 'edit-completo', method: 'GET', path: `/tops/${top.id}/participant-candidates/options`, expect: 200, why: 'tops.participants.add' },
      { profile: 'view', method: 'GET', path: `/tops/${top.id}/participant-candidates/options`, expect: 403, why: 'tops.read não destrava' },
      { profile: 'edit-completo', method: 'GET', path: `/tops/${top.id}/servant-candidates/options`, expect: 200, why: 'tops.servants.add' },
      { profile: 'edit-parcial', method: 'GET', path: `/tops/${top.id}/servant-candidates/options`, expect: 403, why: 'permission de outro domínio não vale' },
      { profile: 'edit-completo', method: 'GET', path: `/tops/${ABSENT}/participant-candidates/options`, expect: 404, why: 'TOP-pai inexistente → 404' },
    );
  }
  if (action) {
    contextual.push(
      { profile: 'edit-completo', method: 'GET', path: `/social-actions/${action.id}/participant-candidates/options`, expect: 200, why: 'social-actions.participants.add' },
      { profile: 'view', method: 'GET', path: `/social-actions/${action.id}/participant-candidates/options`, expect: 403, why: 'social-actions.read não destrava' },
      { profile: 'edit-completo', method: 'GET', path: `/social-actions/${ABSENT}/participant-candidates/options`, expect: 404, why: 'ação-pai inexistente → 404' },
    );
  }
  await run(contextual);

  console.log('\n— Fluxo ponta a ponta do coordenador de equipe (o problema original) —');
  const flow: Check[] = [
    { profile: 'coord-equipe', method: 'GET', path: '/teams', expect: 200, why: 'entra na tela de Equipes' },
    { profile: 'coord-equipe', method: 'GET', path: '/legendarios', expect: 403, why: 'NÃO tem a tela de Legendários' },
    { profile: 'coord-equipe', method: 'GET', path: '/legendarios/options', expect: 403, why: 'nem o diretório global' },
  ];
  if (team) {
    flow.push(
      { profile: 'coord-equipe', method: 'GET', path: `/teams/${team.id}/members`, expect: 200, why: 'vê os membros da equipe' },
      { profile: 'coord-equipe', method: 'GET', path: `/teams/${team.id}/member-candidates/options`, expect: 200, why: 'ANTES DA CHANGE ISTO ERA 403 — é o bug que motivou tudo' },
    );
  }
  await run(flow);

  console.log('\n— União do caso B: options de dirigente sem a tela global —');
  await run([
    { profile: 'edit-completo', method: 'GET', path: '/legendarios/options', expect: 200, why: 'teams.update/tops.update entram na união' },
    { profile: 'edit-parcial', method: 'GET', path: '/legendarios/options', expect: 403, why: 'teams.members.add NÃO está na união — usa o contextual' },
    { profile: 'edit-completo', method: 'GET', path: '/teams/options', expect: 200, why: 'tops.teams.add entra na união' },
    { profile: 'edit-parcial', method: 'GET', path: '/teams/options', expect: 403, why: 'sem nenhuma das keys da união' },
  ]);

  console.log('\n— O que NÃO pode ter sido afrouxado: lista e detalhe continuam fechados —');
  const legendary = await prisma.legendary.findFirst({ where: { deletedAt: null } });
  const closed: Check[] = [
    { profile: 'edit-completo', method: 'GET', path: '/legendarios', expect: 403, why: 'options aberto NÃO abre a lista' },
    { profile: 'edit-parcial', method: 'GET', path: '/legendarios', expect: 403, why: 'idem' },
    { profile: 'edit-parcial', method: 'GET', path: '/teams', expect: 403, why: '/teams/options aberto NÃO abre a lista' },
  ];
  if (legendary) {
    closed.push(
      { profile: 'edit-parcial', method: 'GET', path: `/legendarios/${legendary.id}`, expect: 403, why: 'o contextual não concede o DETALHE (PII)' },
      { profile: 'edit-completo', method: 'GET', path: `/legendarios/${legendary.id}`, expect: 403, why: 'idem' },
    );
  }
  await run(closed);

  console.log('\n— Controles escondidos na UI: a mutação continua negada na chamada manual —');
  const mutations: Check[] = [];
  if (team) {
    mutations.push(
      { profile: 'view', method: 'POST', path: `/teams/${team.id}/members`, expect: 403, why: 'botão "Adicionar membro" escondido — API nega igual', body: { legendaryId: ABSENT, role: 'Apoio' } },
      { profile: 'view', method: 'PATCH', path: `/teams/${team.id}`, expect: 403, why: '"Editar" escondido — API nega igual', body: { name: 'nao deve gravar' } },
      { profile: 'edit-parcial', method: 'PATCH', path: `/teams/${team.id}`, expect: 403, why: 'adicionar membro não é editar a equipe', body: { name: 'nao deve gravar' } },
    );
  }
  if (top) {
    mutations.push(
      { profile: 'view', method: 'POST', path: `/tops/${top.id}/participants`, expect: 403, why: 'bloco de participantes escondido', body: { legendaryId: ABSENT, type: 'NEW_PARTICIPANT', status: 'REGISTERED' } },
      { profile: 'edit-parcial', method: 'PATCH', path: `/tops/${top.id}`, expect: 403, why: 'sem tops.update', body: { name: 'nao deve gravar' } },
    );
  }
  if (action) {
    mutations.push(
      { profile: 'view', method: 'POST', path: `/social-actions/${action.id}/participants`, expect: 403, why: 'vincular participante escondido', body: { legendaryId: ABSENT } },
      { profile: 'view', method: 'PATCH', path: `/social-actions/${action.id}/cancel`, expect: 403, why: '"Cancelar" escondido', body: {} },
    );
  }
  await run(mutations);

  console.log('\n— Telas sem permission nenhuma no gate visual (achado da §4) —');
  await run([
    { profile: 'view', method: 'GET', path: '/reports/legendarios/export', expect: [403, 404], why: 'exportar Relatórios exige reports.export' },
    { profile: 'edit-parcial', method: 'GET', path: '/communications', expect: 403, why: 'sem communications.read' },
  ]);

  await runParityChecks({ team, top, action });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Total: ${results.length} · ok: ${results.length - failed.length} · falhas: ${failed.length}`);
  if (failed.length) {
    console.log('\nFALHAS:');
    for (const f of failed) {
      console.log(`  [${f.check.profile}] ${f.check.method} ${f.check.path} → ${f.got}, esperado ${f.check.expect}`);
    }
  }
  return failed.length;
}

main()
  .then(async (failed) => {
    if (!KEEP) await cleanup();
    else console.log('\n--keep: usuários de smoke MANTIDOS no banco.');
    await prisma.$disconnect();
    process.exit(failed ? 1 : 0);
  })
  .catch(async (error) => {
    console.error('\nErro no smoke:', error);
    if (!KEEP) await cleanup().catch(() => {});
    await prisma.$disconnect();
    process.exit(1);
  });
