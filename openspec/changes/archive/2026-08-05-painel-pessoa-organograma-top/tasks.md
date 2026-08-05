## 1. Fase 1 — devolver eventos de ponteiro ao canvas

Arquivo: `apps/web/src/features/org-chart/org-chart-tree.tsx`.

- [x] 1.1 Remover `elementsSelectable={false}` do `<ReactFlow>`, deixando a prop no padrão (`true`), com comentário explicando que ela é o que mantém `pointer-events` ativo nos nós
- [x] 1.2 Manter `nodesDraggable={false}` e `nodesConnectable={false}` — arrastar nó pelo canvas e criar aresta continuam desligados
- [x] 1.3 Passar `nodesFocusable={false}` para tirar da ordem de tabulação o wrapper do nó, que hoje tem `tabindex="0"` e não executa ação
- [x] 1.4 Smoke imediato no navegador: clicar num cartão e confirmar que o painel abre — antes de seguir para a separação dos alvos
  - Evidência: `pointer-events` passou de `none` → `all`; `tabindex` do wrapper de `"0"` → ausente; `elementFromPoint` no centro do cartão passou de `react-flow__pane` → elemento do próprio cartão; clique de mouse real aceito (antes recusado por 5s com *"pane intercepts pointer events"*) e painel aberto.

## 2. Fase 1 — um clique, uma ação

Arquivo: `apps/web/src/features/org-chart/org-chart-node.tsx`.

- [x] 2.1 Nos nós de ramo que representam pessoa (`leader`), separar os alvos: corpo do cartão aciona `onFocus`, seta aciona `onToggle`; hoje `handleClick` faz as duas coisas
  - `handleClick` foi substituído por `handleBody` + `handleToggle`, com `isPersonNode` decidindo o comportamento do corpo
- [x] 2.2 Nos nós que não são pessoa (raiz, grupo, equipe, família, cidade), manter o cartão inteiro alternando a expansão
- [x] 2.3 Transformar corpo e seta em controles semanticamente acionáveis, irmãos entre si (não aninhar botão em botão), preservando o layout atual
  - Raiz virou `<button>` inteiro; folha e ramo passaram a ter o corpo como `<button>` irmão da alça/seta; chips do bloco viraram `<button>`
- [x] 2.4 Pôr `aria-expanded` na seta refletindo o estado de expansão, e rótulo acessível
  - Seta de nó de pessoa: `<button aria-expanded aria-label="Expandir|Recolher <nome>">`. Em grupo/cidade quem carrega o `aria-expanded` é o corpo, e a seta fica `aria-hidden` (é indicação visual, não um segundo alvo)
- [x] 2.5 Verificar que a alça de arraste continua irmã dos controles e que o `draggable` HTML5 segue funcionando
  - Alça permanece irmã do corpo na folha; chips mantêm `draggable`/`onDragStart`/`onDragEnd` ao virar `<button>`. Funcionamento confirmado no smoke 7.4
- [x] 2.6 Conferir que o header do bloco (cluster) e o botão "Carregar mais" seguem a mesma separação
  - Header do bloco separado em corpo + seta; "Carregar mais" é ação única, mantido como botão (ganhou `type="button"`)

## 3. Fase 1 — guarda contra regressão

Arquivo: `apps/web/src/features/org-chart/` (teste novo, Vitest).

- [x] 3.1 Teste que assere a configuração interativa entregue ao `<ReactFlow>`: nós não podem ficar simultaneamente não-selecionáveis, não-arrastáveis e sem handler de nó — é a combinação que zera `pointer-events`
  - `org-chart-interaction.test.tsx`, mockando `@xyflow/react` para capturar as props
- [x] 3.2 Teste que assere a separação dos alvos: acionar o corpo de um nó de liderança foca sem alternar expansão; acionar a seta alterna sem focar
- [x] 3.3 Comentar no teste **por que** ele não simula hit-testing: JSDOM ignora `pointer-events`, então "clicar e esperar o painel" passaria verde com o bug presente
- [x] 3.4 Rodar `pnpm --filter web exec vitest run <arquivo novo>` e anexar a saída
  - `Test Files 1 passed (1) · Tests 9 passed (9)`
- [x] 3.5 **Provar que o guarda falha com o defeito presente** (teste que não fica vermelho não guarda nada)
  - Reintroduzi `elementsSelectable={false}` temporariamente: `1 failed | 8 passed`, com `AssertionError: expected true to be false` em *"não deixa os nós inertes ao ponteiro"*. Restaurado em seguida e de volta a 9/9.

## 4. Fase 2 — identificar o Legendário nos nós do TOP

Arquivo: `apps/api/src/modules/tops/tops.service.ts`.

- [x] 4.1 `buildTeamsChart`: `refId: s.legendaryId` nos nós de servo (`servant:${s.id}`), tanto no ramo com coordenador quanto no "Sem equipe"
- [x] 4.2 `buildTeamsChart`: `refId: topTeam.coordinatorLegendaryId` no nó do coordenador (`leader:${topTeam.id}`) e `refId: topTeam.deputyCoordinatorLegendaryId` no do vice (`deputy:${topTeam.id}`)
- [x] 4.3 `buildFamiliesChart`: `refId: m.topParticipant?.legendaryId` nos nós de membro (`familyMember:${m.id}`)
- [x] 4.4 `buildFamiliesChart`: `refId: family.representativeLegendaryId` no chefe de família (`leader:${family.id}`) e `refId: family.deputyRepresentativeLegendaryId` no vice (`deputy:${family.id}`)
- [x] 4.5 `buildCitiesChart`: `refId: participant.legendaryId` nos participantes (`participant:${participant.id}`), inclusive no grupo "Sem cidade"
- [x] 4.6 Conferir que nenhum nó de raiz, grupo, equipe, família ou cidade recebeu `refId`
  - Auditoria no arquivo: 18 chamadas de `orgNode`, 8 com `refId` — exatamente os 8 nós `person`/`leader`; os 10 estruturais ficaram sem

## 5. Fase 2 — teste de invariante

**Desvio do plano:** o arquivo previsto era `org-chart.spec.ts`, mas o harness de mock do organograma (prisma + `TopsService` + `describe('TopsService org-chart')`) já existe em `tops.service.spec.ts`. Duplicá-lo seria desperdício, então o invariante foi para lá.

Arquivo: `apps/api/src/modules/tops/tops.service.spec.ts`.

- [x] 5.1 Helper que percorre a árvore e coleta todos os nós `person`/`leader`
- [x] 5.2 Teste por visão (`teams`, `families`, `cities`): todo nó `person`/`leader` cujo registro de origem tem Legendário vinculado traz `refId` igual ao id daquele Legendário
- [x] 5.3 Teste: nós de raiz, grupo, equipe, família e cidade não trazem `refId`
- [x] 5.4 Teste: nó de pessoa cujo registro está sem Legendário vinculado é montado sem `refId` e sem lançar erro
- [x] 5.5 Rodar a suíte e anexar a saída
  - `pnpm --filter api exec jest tops.service.spec` → `Tests: 37 passed, 37 total`, incluindo os 8 novos do bloco *"toda pessoa da árvore é identificável (refId)"*
- [x] 5.6 Teste extra: o `refId` é o id do Legendário, não o id do vínculo — é a confusão que quebraria a busca do painel

## 6. Verificação automatizada

- [x] 6.1 `pnpm --filter api test` verde
  - `Test Suites: 47 passed, 47 total · Tests: 574 passed, 574 total`
- [x] 6.2 `pnpm --filter web test` verde
  - `Test Files 34 passed (34) · Tests 176 passed (176)`
- [x] 6.3 `pnpm lint` na raiz verde (é o comando completo — cobre `prisma/`; `pnpm -r lint` não substitui)
  - exit 0; `packages/shared`, `apps/api` (eslint + tsc), `apps/web` (tsc) e `tsc -p prisma/tsconfig.json`

## 7. Smoke no navegador — é aqui que a Fase 1 se prova

Cada item registra o que foi visto. O que não puder ser exercitado por falta de dado local deve ser declarado como não coberto, não presumido.

- [x] 7.1 Aba Equipes: clicar numa pessoa abre o painel; clicar na seta de um ramo expande/recolhe **sem** abrir painel
  - Clique no nome → painel abre. Clique na seta `aria-label="Recolher Grupo 1/2"` → o bloco recolheu (virou o ramo compacto "Grupo 1/2") e o painel permaneceu em "Vitor Hugo Batista Afonso", inalterado. Separação confirmada nos dois sentidos.
- [x] 7.2 Aba Equipes: hover no cartão muda o estado visual e o cursor indica ação
  - `cursor: pointer`; `background` de `rgb(23,23,27)` → `rgb(28,28,34)` com `el.matches(':hover') === true`
- [x] 7.3 Aba Equipes: clicar num chip de membro dentro de um bloco seleciona aquele membro
  - Painel abriu com o nome do chip clicado
- [x] 7.4 Aba Cidades: painel abre; movimentação de uma pessoa para outro gestor funciona
  - Destravado com hierarquia semeada no banco local (2 gestores em Caldas Novas).
  - **Movimentação confirmada fim-a-fim** pelo menu do painel (mesmo endpoint do arraste): selecionado o outro gestor e acionado "Mover", a árvore foi de `Aderso 3/10 · Admilson 2/10` para `Admilson 3/10 · Aderso 2/10`.
  - **Arraste exercitado por eventos sintéticos.** O `dragTo` do Playwright não gera o gesto nativo (instrumentei `dragstart`/`dragover`/`drop`/`dragend`: nada dispara, em duas técnicas). Disparando `DragEvent` com `DataTransfer` real sobre a alça e o alvo, o fluxo completo respondeu: dica *"Solte sobre um gestor destacado para mover"*, **exatamente 1 alvo** com anel verde de destino válido, drop → `"Pessoa movida."` + Desfazer, e a árvore refletiu a mudança (`Admilson 3 → 2`).
  - **O que isso prova:** os handlers do app, o cálculo de alvo válido, a chamada de API e o undo. **O que não prova:** o gesto nativo de arraste do sistema operacional — esse continua só verificável à mão.
  - **DEFEITO NOVO ENCONTRADO E CORRIGIDO — ver seção 9.**
- [x] 7.5 Nó "Carregar mais": clicar revela o restante do nível
  - Destravado semeando 25 gestores em Caldas Novas (o nível da cidade passou de 20 filhos). O rótulo real é **"+N a mais"**, não "Carregar mais".
  - Clique de mouse real no nó `city:caldas novas::more` ("+7 a mais"): `elementFromPoint` no alvo devolveu o próprio botão, e a árvore foi de **22 → 28 nós** (o nó "mais" sumiu e os 7 líderes restantes apareceram).
  - Os 25 gestores extras foram revertidos depois do teste; sobraram os 2 originais.
- [x] 7.6 Aba TOPs / visão Equipes do TOP: clicar num servo e num coordenador abre o painel
  - **Este é o resultado central da Fase 2.** Antes desta change, o mesmo clique não produzia nada em nó nenhum do TOP.
  - Os **três** tipos de nó exercitados, cada um abrindo o painel com o nome correto: coordenador ("Adenir Dias Campos"), vice-coordenador ("Adriano Vieira Lopes") e servo ("Marlos Fraga").
- [x] 7.7 Aba TOPs / visão Chefes de Família: clicar num membro e num chefe de família abre o painel
  - Destravado com a "Família Teste Leão" semeada. Árvore: `Coordenação de Famílias → Família Teste Leão → Chefe de família 4/10 + Vice-representante`.
  - Painel abriu para o **chefe de família** ("Arlei Marques Silva") e para um **membro de família** ("BRUNO BONFIM DA SILVA").
- [x] 7.8 Aba TOPs / visão Cidades: clicar num participante abre o painel
  - Destravado com 7 participantes semeados. A visão agrupou por cidade (Caldas Novas, Goiatuba, Itumbiara, Mairipotaba, Morrinhos, Piracanjuba) e o clique num participante abriu o painel. Sem seção "Mover", como esperado no TOP.
- [x] 7.13 Aba Equipes: hierarquia de sub-coordenador e o aviso de mudança crítica
  - Destravado semeando coordenador, vice e um sub-coordenador com 3 geridos na Hakunas.
  - Árvore: `Coordenador 10/10 → bloco "Diretos 9/10" + "Uagton … Membro 3/10"`. O painel do sub-coordenador ofereceu "Mover para outro gestor" **e** exibiu o aviso *"lidera outros — movê-la reestrutura o grupo (mudança crítica)"* — o caminho de governança da Fase 4, exercitado pela primeira vez.
- [x] 7.9 Aba TOPs: confirmar que o painel **não** oferece "Mover para outro gestor"
  - Verificado sem diferenciar caixa (o rótulo é `uppercase` e o `innerText` do Chromium aplica `text-transform`): ausente no painel aberto pelo TOP, presente no aberto pela aba Cidades — o contraste confirma que a checagem é válida
- [x] 7.10 Teclado: tabular até o controle de um cartão e acionar com Enter e com Espaço; confirmar que não há paradas em nós inertes
  - Foco cai num `BUTTON` do cartão ("Marlos Fraga"), não no wrapper. Com o painel fechado, **Enter abriu o painel**. **Espaço na seta** produziu a mesma transição observada no clique de mouse (o bloco recolheu e o botão rotulado deixou de existir). Wrapper do nó sem `tabindex` — sem paradas inertes.
- [x] 7.11 Confirmar que reativar a seleção não trouxe efeito visual estranho nos nós
  - `.react-flow__node.selected`: **0 nós** — o clique é consumido pelos botões do cartão e nunca chega à seleção do React Flow. `box-shadow: none`, `outline-style: none`. Efeito visual nulo, como previsto no design.
- [x] 7.12 Busca por nome continua focando e abrindo o painel como antes
  - Buscar "Marlos" + Enter → painel abre. O atalho que era o único caminho vivo segue funcionando.

## 8. Fechamento

- [x] 8.1 Registrar as evidências no `tasks.md`: saída dos testes e o que foi visto em cada smoke, incluindo o que não pôde ser coberto
  - Três smokes ficaram marcados `[~]` (parcial/não coberto): 7.4, 7.5, 7.7 e 7.8 — todos por falta de dado no banco local, não por defeito observado
- [x] 8.2 Anotar como dívida a ausência de teste de navegador no repositório — é a única cobertura que pegaria a Fase 1 de verdade

  **Dívidas registradas por esta change:**
  1. **Sem teste de navegador no repositório.** O defeito da Fase 1 (`pointer-events: none`) é invisível para Vitest/JSDOM. O guarda atual assere a configuração do `<ReactFlow>` e pega a regressão mais provável, mas só um teste de navegador provaria que o clique alcança o cartão. Introduzir essa infraestrutura é decisão maior que esta correção.
  2. **Banco local sem hierarquia de gestor de cidade** (`cityLeaderId` nulo em 100% dos legendários) e **TOP local sem famílias nem participantes.** Isso deixa fora do alcance de qualquer smoke: drag-and-drop de pessoas, "Carregar mais" e duas das três visões do TOP. Um seed de desenvolvimento com hierarquia resolveria de uma vez.
  3. **Os dois montadores de organograma continuam duplicados** (`OrgChartService` e `TopsService.getOrgChart`). Foi essa divergência que produziu a Fase 2; o invariante da task 5.2 reduz o custo de ela voltar, mas não a elimina.
- [x] 8.3 Pedir aval do Davi antes de qualquer ação de git (branch, commit, PR) — regra crítica do projeto
  - Aval dado em 05/08/2026. Branch `fix/organograma-clique-e-refid-top` → PR **#48** → merge `89075bb`.
  - **Deployado em produção em 05/08/2026 ~14:31–14:36 UTC.** Health `ok/up/up`, site 200, 0 erros nos logs, backup `backup_20260805-142948.sql` (1.526.363 bytes) validado antes, rollback em `pre-89075bb`. Zero migrations pendentes — rollback binário seguro nesta release.
  - Imagem servida contém o fix: `refId` 8× em `dist/modules/tops/tops.service.js` (era 0) e `nodesFocusable` em 2 chunks do web.

## 9. Fase 3 — recarregar o dado não descarta a navegação

Achado durante os smokes da Fase 1 e corrigido a pedido do Davi. Defeito pré-existente da Fase 3 do organograma, só observável depois que o clique passou a funcionar.

**Sintoma:** ao mover uma pessoa pelo painel, o painel fechava e levava junto o "Desfazer" que acabara de aparecer. A movimentação funcionava; a chance de reverter, não.

**Causa (duas peças, a mesma ideia errada em dois lugares — "dado novo = o usuário trocou de visão"):**
1. `OrganogramaSection` fazia `setLoading(true)` em qualquer refetch, inclusive o disparado por `onDataChanged`. A árvore era substituída pelo "Carregando organograma…", ou seja, **desmontava** — e todo o estado do `OrgChartTree` morria junto.
2. `OrgChartCanvas` resetava foco, expansão e busca num `useEffect([root])`. Um refetch produz um `root` novo com a **mesma raiz**, e o reset disparava mesmo assim.

- [x] 9.1 `organograma-section.tsx`: distinguir troca de visão de refresh por `viewKey` (`escopo|equipe|modo|cidade`); só a troca de visão limpa a tela e mostra o "Carregando"
- [x] 9.2 `org-chart-tree.tsx`: chavear o reset em `root.id` (a árvore) em vez de `root` (o objeto), lendo o root corrente por ref
- [x] 9.3 Testes de regressão em `org-chart-interaction.test.tsx`: root novo com a mesma raiz **preserva** o foco; raiz diferente **volta** ao overview
- [x] 9.4 Provar que o guarda falha com o defeito presente
  - Revertido `[root.id]` → `[root]`: `1 failed | 10 passed`, com `AssertionError: expected [] to deeply equal [ 'leader:legendary:l1' ]`. Restaurado e de volta a 11/11.
- [x] 9.5 Smoke: mover uma pessoa e usar o "Desfazer"
  - Movimento: painel seguiu aberto na mesma pessoa, apareceu "Pessoa movida." e o botão **Desfazer visível**; árvore foi de `Aderso 1/ · Admilson 3/` para `Aderso 2/ · Admilson 2/`.
  - Desfazer: árvore voltou para `Aderso 1/ · Admilson 3/`, painel seguiu aberto e o botão sumiu depois de usado.
- [x] 9.6 Smoke de não-regressão: trocar de visão continua resetando
  - Trocar de cidade fechou o painel e reabriu no overview de Morrinhos; trocar de escopo voltou para "Selecione uma equipe…"
- [x] 9.7 Verificação: `pnpm --filter web test` 178/178 · `pnpm --filter api test` 574/574 · `pnpm lint` na raiz exit 0
- [x] 8.4 Após mesclado e validado, arquivar a change (`openspec-archive-change`), sincronizando os deltas em `openspec/specs/organogram-navigation/` e `openspec/specs/organogram-person-panel/`
