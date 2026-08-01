/**
 * Smoke de UI da change `acoes-web-e-seletores-contextuais` (task 6.5).
 *
 * Dirige o Chromium de verdade contra o app local — complementa `acoes-web-smoke.ts`, que
 * prova 403/404 na API. Aqui se prova o que a INTERFACE oferece, que é o que nenhum teste de
 * componente com fixture escrita à mão garante.
 *
 * Pré-requisitos:
 *   1. web em :3000 e API em :3333
 *   2. usuários de smoke no banco:  pnpm --filter api exec tsx scripts/acoes-web-smoke.ts --keep
 *   3. playwright + chromium:       npx playwright install chromium
 *
 * Rodar:  node apps/api/scripts/acoes-web-ui-smoke.mjs
 * Depois, APAGAR os usuários rodando o smoke de API sem --keep.
 *
 * Armadilhas que custaram tempo e já estão resolvidas aqui:
 *  - Login: `fill` antes de o React hidratar deixa o estado controlado vazio e o formulário
 *    envia {email:'',password:''} → 400. Use `networkidle` + `pressSequentially`.
 *  - ActionMenu: clicar o gatilho quando ele JÁ está aberto o fecha. Navegue pelo href do item.
 *  - AsyncCombobox: o gatilho é o único botão com `aria-expanded` — use esse seletor
 *    estrutural. O texto varia com placeholder/noneLabel e vem colado no ícone, então
 *    `getByRole('button', { name })` não casa.
 */
import { chromium } from 'playwright';
const WEB='http://localhost:3000';
const out=[]; const ck=(ok,l,d='')=>{out.push({ok,l,d});console.log(`${ok?'  ok ':' FAIL'} ${l}${d?` · ${d}`:''}`)};
const login=async(p,e)=>{await p.goto(`${WEB}/login`,{waitUntil:'networkidle'});await p.waitForTimeout(1200);
 const a=p.locator('input[type="email"]');await a.click();await a.pressSequentially(e,{delay:8});
 const w=p.locator('input[type="password"]');await w.click();await w.pressSequentially('SmokeAcoesWeb!2026',{delay:8});
 await p.click('button[type="submit"]');await p.waitForURL(u=>!u.pathname.includes('/login'),{timeout:20000});await p.waitForTimeout(2000)};
const abrirVer=async(p)=>{if(!(await p.locator('[role="menu"] a').count())){
  await p.locator('table tbody tr').first().locator('button').first().click();await p.waitForTimeout(800);}
  const h=await p.locator('[role="menu"] a').first().getAttribute('href');
  await p.goto(WEB+h,{waitUntil:'networkidle'});await p.waitForTimeout(2500)};
// O AsyncCombobox é um BOTÃO gatilho (aria-expanded) que revela o campo de busca ao abrir.
const buscarNoCombobox=async(p,nomeGatilho,termo)=>{
  // getByRole(name:) falha: o gatilho tem ícone além do texto, o nome acessível não casa
  // exato. Filtrar por texto contido é o que funciona.
  // Seletor ESTRUTURAL: o gatilho do AsyncCombobox é o único botão com aria-expanded.
  // Texto não serve — varia com placeholder/noneLabel e vem junto do ícone.
  const gat=p.locator('button[aria-expanded]');
  await (nomeGatilho ? gat.filter({hasText:nomeGatilho}).first() : gat.first()).click();
  await p.waitForTimeout(900);
  const i=p.locator('input[placeholder*="Buscar"]:visible').last();
  await i.pressSequentially(termo,{delay:50});
  await p.waitForTimeout(3000);
  return p.locator('[role="option"]').count();
};
const b=await chromium.launch();

console.log('\n=== COORD. DE EQUIPE — teams.read + members.read/add, SEM legendarios.read ===');
{const c=await b.newContext(),p=await c.newPage();const err=[],reqs=[];
 p.on('response',r=>r.status()>=400&&err.push(`${r.status()} ${(r.url().split('/api')[1]||'').slice(0,50)}`));
 p.on('request',r=>r.url().includes('member-candidates')&&reqs.push('member-candidates'));
 await login(p,'coord-equipe@acoes-web-smoke.local');
 ck(!(await p.locator('nav a, aside a').allTextContents()).some(t=>/legend[áa]rios/i.test(t)),'Navegação sem a aba Legendários');
 await p.goto(`${WEB}/dashboard/equipes`,{waitUntil:'networkidle'});await p.waitForTimeout(2000);
 await p.locator('table tbody tr').first().locator('button').first().click();await p.waitForTimeout(700);
 const it=(await p.locator('[role="menu"] a, [role="menu"] button').allTextContents()).map(s=>s.trim()).filter(Boolean);
 ck(it.length===1&&/ver/i.test(it[0]),'ActionMenu só oferece "Ver"',JSON.stringify(it));
 await abrirVer(p);
 ck(await p.locator('table tbody tr td:first-child a').count()===0,'Nome do membro é texto, não link');
 ck(await p.getByRole('link',{name:/editar cadastro/i}).count()===0,'"Editar cadastro" escondido');
 await p.getByRole('button',{name:/adicionar membro/i}).first().click();await p.waitForTimeout(1500);
 err.length=0;
 const n=await buscarNoCombobox(p,/^selecione$/i,'a');
 await p.screenshot({path:'FINAL-candidatos.png',fullPage:true});
 ck(n>0,'★ Busca de candidatos retorna gente (era 403 antes da change)',`${n} opções`);
 ck(reqs.length>0,'Chamou o endpoint CONTEXTUAL member-candidates');
 ck(!err.some(e=>e.startsWith('403')),'Nenhum 403',err.slice(0,2).join(' / '));
 await c.close();}

console.log('\n=== ADMIN ===');
{const c=await b.newContext(),p=await c.newPage();const err=[];
 p.on('response',r=>r.status()>=400&&err.push(`${r.status()} ${(r.url().split('/api')[1]||'').slice(0,50)}`));
 await login(p,'admin@acoes-web-smoke.local');
 await p.goto(`${WEB}/dashboard/equipes`,{waitUntil:'networkidle'});await p.waitForTimeout(2000);
 await p.locator('table tbody tr').first().locator('button').first().click();await p.waitForTimeout(700);
 const it=(await p.locator('[role="menu"] a, [role="menu"] button').allTextContents()).map(s=>s.trim()).filter(Boolean);
 ck(it.length>1,'Admin vê mais itens no ActionMenu',JSON.stringify(it));
 await p.keyboard.press('Escape');
 const ed=p.locator('a[href*="/editar"]').first();
 if(await ed.count()){await ed.click();await p.waitForTimeout(3000);
  await p.screenshot({path:'FINAL-equipe-editar.png',fullPage:true});
  ck(await p.getByText(/\(legend[áa]rio vinculado\)/i).count()===0,'Rótulo do dirigente sem "(legendário vinculado)"');}
 await p.goto(`${WEB}/dashboard/tops`,{waitUntil:'networkidle'});await p.waitForTimeout(2000);
 await abrirVer(p);
 const ab=p.getByRole('button',{name:/^equipes$/i}).first();
 if(await ab.count()){await ab.click();await p.waitForTimeout(1500);}
 const v=p.getByRole('button',{name:/vincular|adicionar equipe/i}).first();
 if(await v.count()){await v.click();await p.waitForTimeout(1200);err.length=0;
  await p.getByRole('button',{name:/^salvar$/i}).first().click();await p.waitForTimeout(1800);
  ck(await p.getByText(/selecione a equipe/i).count()>0,'Submeter sem equipe avisa na tela (o 400 corrigido)');
  ck(!err.some(e=>e.startsWith('400')),'Nenhum 400 disparado',err.slice(0,2).join(' / '));
  const n=await buscarNoCombobox(p,null,'a');
  await p.screenshot({path:'FINAL-top-equipe.png',fullPage:true});
  ck(n>0,'Busca de Equipe no combobox retorna opções',`${n} opções`);}
 else ck(false,'Botão de vincular equipe não achado');
 await c.close();}
await b.close();
const f=out.filter(r=>!r.ok);
console.log(`\n${'='.repeat(64)}\nUI: ${out.length} checagens · ok: ${out.length-f.length} · falhas: ${f.length}`);
f.forEach(x=>console.log('  FAIL',x.l,x.d));
process.exit(f.length?1:0);
