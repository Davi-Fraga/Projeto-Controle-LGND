## Why

O organograma **não responde a cliques de mouse em nenhum nó, em nenhuma aba, desde o primeiro commit** (`c72d916`). Não é dificuldade de descoberta: o clique fisicamente não chega ao cartão.

Causa, medida no navegador em 05/08/2026 com o app local: `@xyflow/react` aplica `pointer-events: none` no wrapper de todo nó quando conclui que ele não é interativo — `hasPointerEvents = isSelectable || isDraggable || onClick || onMouseEnter || onMouseMove || onMouseLeave`. `OrgChartTree` passa `nodesDraggable={false}`, `nodesConnectable={false}` e `elementsSelectable={false}`, e registra os `onClick` **dentro** dos cartões, onde a biblioteca não os vê. Com isso `elementFromPoint` no centro de qualquer cartão devolve o `react-flow__pane`, e um clique real de mouse não produz efeito nenhum.

O que morre junto: abrir o painel da pessoa, expandir/recolher ramo, clicar no chip de membro de um bloco, o botão "Carregar mais", **todo o drag-and-drop de pessoas** e até os estados de `hover`/`cursor-pointer` — por isso nada *parece* clicável. Sobrevive só o que está fora do canvas: a busca (digitar o nome + Enter abre o painel), o breadcrumb e os controles de zoom. Ou seja, existe um caminho que funciona e ninguém o encontra.

Somado a isso, um segundo defeito independente: na aba **TOPs**, mesmo com o ponteiro funcionando, o painel não abriria — `TopsService` monta as três visões do TOP sem `refId` nos nós, e o painel só abre quando o nó identifica o Legendário. Os dois precisam ser corrigidos para que a aba TOPs funcione, e a correção do ponteiro é pré-requisito para verificar a do `refId`.

## What Changes

**Fase 1 — devolver a interatividade ao canvas (`apps/web`)**

- `OrgChartTree` deixa de passar `elementsSelectable={false}`, restaurando `pointer-events` nos nós. `nodesDraggable`/`nodesConnectable` permanecem `false` — dizem respeito a arrastar o nó pelo canvas e criar arestas, que continuam indesejados.
- Separar as duas ações que hoje se acumulam num clique só: nos nós de liderança (pessoa **com** subordinados) um clique abre o painel **e** recolhe o ramo ao mesmo tempo. Passa a valer: corpo do cartão abre o painel; a seta expande/recolhe.
- Tornar os alvos de clique elementos semanticamente acionáveis, com ativação por Enter/Espaço e `aria-expanded` na seta. Hoje os nós já entram na ordem de tabulação (`tabindex="0"` posto pelo React Flow) e não fazem nada — a tabulação passa a ir para os controles reais do cartão.

**Fase 2 — identificar o Legendário nos nós do TOP (`apps/api`)**

- `TopsService.buildTeamsChart` preenche `refId` nos nós de servo, coordenador e vice-coordenador.
- `TopsService.buildFamiliesChart` preenche `refId` nos nós de membro de família, chefe de família e vice-representante.
- `TopsService.buildCitiesChart` preenche `refId` nos nós de participante.
- Teste de invariante: todo nó `person`/`leader` das três visões do TOP carrega `refId`.
- Sem mudança de contrato — `refId` já existe como campo opcional em `OrgChartNode`; a alteração é aditiva no payload.

## Capabilities

### New Capabilities

Nenhuma. Os comportamentos desejados já estão especificados; o que falta é cumpri-los e travá-los contra regressão.

### Modified Capabilities

- `organogram-navigation`: fixa que a árvore SHALL ser operável por ponteiro e por teclado, e que expandir/recolher e abrir o detalhe são ações distintas com alvos distintos. Hoje a spec descreve focar e expandir como se funcionassem, sem nenhum requisito que a implementação atual violasse de forma detectável.
- `organogram-person-panel`: torna explícito que o requisito de abrir o painel vale para **todas** as visões, incluindo as três do escopo TOPs, e fixa a pré-condição de que o nó identifique o Legendário.

## Impact

- **Front:** `apps/web/src/features/org-chart/org-chart-tree.tsx` (props do `<ReactFlow>`), `apps/web/src/features/org-chart/org-chart-node.tsx` (separação dos alvos de clique e semântica dos controles).
- **Back:** `apps/api/src/modules/tops/tops.service.ts` (três builders), `apps/api/src/modules/tops/org-chart.spec.ts` (invariante).
- **API:** `GET /tops/:id/org-chart` passa a devolver `refId` nos nós de pessoa/líder. Aditivo.
- **Funcionalidades que voltam a existir** com a Fase 1, sem código novo: expandir/recolher por clique, chips de membro, "Carregar mais", drag-and-drop de pessoas entre gestores, e os estados de hover dos cartões.
- **Escopo/PII:** inalterado. O painel continua buscando dados em `GET /legendarios/:id`, escopado pelo `AccessPolicyService`. O `refId` é um UUID de Legendário — o mesmo dado que as outras visões já devolvem.
- **Banco / migrations:** nenhum.

## Nota de verificação

Um teste de Vitest/JSDOM **não pega** o defeito da Fase 1: o JSDOM não faz hit-testing por `pointer-events`, então um `click()` de Testing Library passa verde mesmo com o bug presente. O guarda contra regressão precisa ser uma asserção sobre a configuração interativa entregue ao `<ReactFlow>`, e a confirmação final é smoke no navegador. Isso está refletido nas tasks.
