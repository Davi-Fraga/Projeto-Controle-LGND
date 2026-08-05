## Context

O organograma é desenhado com `@xyflow/react` 12.11.0. `OrgChartTree` monta o `<ReactFlow>` e registra um `nodeType` customizado (`OrgChartNodeCard`), que desenha os cartões e carrega os `onClick` internamente. A árvore vem de dois montadores no backend com o mesmo formato (`OrgChartNode` do `packages/shared`): `OrgChartService` (`/org-chart/*`, escopos Equipes/Coordenadores/Cidades) e `TopsService.getOrgChart` (`/tops/:id/org-chart`, visões teams/families/cities).

Dois defeitos independentes, ambos verificados no navegador em 05/08/2026 com o app local e usuário Coordenador:

**1. Nós inertes ao ponteiro (todas as abas).** `@xyflow/react` decide se o wrapper do nó recebe eventos:

```js
const hasPointerEvents = isSelectable || isDraggable || onClick || onMouseEnter || onMouseMove || onMouseLeave;
pointerEvents: hasPointerEvents ? 'all' : 'none',
```

`OrgChartTree` passa `nodesDraggable={false}`, `nodesConnectable={false}`, `elementsSelectable={false}` e nenhum handler de nó no nível do `<ReactFlow>` — os `onClick` estão dentro do cartão, invisíveis para a biblioteca. Medições: `pointer-events: none` em 100% dos nós e em todos os descendentes (chips, botões, nomes); `elementFromPoint` no centro do cartão devolve `react-flow__pane`; clique de mouse real na coordenada do cartão não produz efeito; Playwright recusa o clique com *"react-flow__pane intercepts pointer events"*. `elementsSelectable={false}` está presente desde `c72d916`, o primeiro commit do organograma — nunca funcionou.

Sobrevive o que está fora do canvas, numa camada com `pointer-events: auto`: busca, breadcrumb e controles de zoom. Buscar o nome e apertar Enter foca o nó e abre o painel — confirmado funcionando. É o único caminho vivo.

**2. Nós do TOP sem `refId` (aba TOPs).** O painel só abre quando o nó identifica o Legendário (`panelRefId = selectedNode?.refId ?? null`). `TopsService` não preenche `refId` em nó nenhum, ao contrário de `OrgChartService`. Mesmo com o ponteiro restaurado, a aba TOPs continuaria muda.

A ordem importa: sem a Fase 1 não há como verificar a Fase 2 por interação real.

## Goals / Non-Goals

**Goals:**
- Clicar num cartão faz o que o cartão promete, em todas as abas.
- Um clique executa uma ação só: abrir o detalhe e expandir/recolher deixam de se acumular.
- A árvore é utilizável por teclado, e a tabulação não passa por elementos inertes.
- A aba TOPs abre o painel da pessoa como as demais.
- Regressão travada por teste no que é testável, e por smoke no que não é.

**Non-Goals:**
- Redesenhar o visual dos cartões ou a estética do canvas.
- Enriquecer o conteúdo do painel (equipe atual, TOPs anteriores, histórico).
- Transformar o nome em link direto para a ficha.
- Habilitar mover pessoa na hierarquia do TOP.
- Unificar os dois montadores de organograma do backend.
- Introduzir suíte de testes de navegador no repositório.

## Decisions

**1. Restaurar o ponteiro removendo `elementsSelectable={false}`, não com CSS.**
O padrão da prop é `true`; deixá-la no padrão faz `hasPointerEvents` virar verdadeiro pela via que a própria biblioteca prevê. Verifiquei que o stylesheet do React Flow **não contém nenhuma regra `.selected`**, então reativar seleção não introduz efeito visual — o anel de foco continua vindo do nosso `data.focused`.
*Alternativa descartada:* sobrescrever com `.react-flow__node { pointer-events: auto !important }`. O estilo é inline da biblioteca, exigiria `!important`, e brigaria com a lógica interna a cada atualização.
*Alternativa descartada:* passar `onNodeClick={() => {}}` só para ligar o flag. Funciona, mas é um handler vazio cuja razão de existir some na primeira leitura.

**2. `nodesDraggable` e `nodesConnectable` continuam `false`.**
São sobre arrastar o nó pelo canvas e criar arestas — nenhum dos dois é desejado. O drag-and-drop de pessoas do projeto é HTML5 (`draggable` no elemento), independente disso, e volta a funcionar assim que o cartão recebe eventos.

**3. Separar expandir/recolher de abrir o detalhe, só onde há ambiguidade.**
Hoje `handleClick` faz `onFocus(id)` e, se o nó tem filhos, também `onToggle(id)`. Num nó de liderança isso abre o painel e recolhe o ramo no mesmo clique. Passa a valer: corpo do cartão abre o detalhe, seta expande/recolhe. Em nós que não são pessoa (raiz, grupo, equipe, família, cidade) não há detalhe a abrir, então o cartão inteiro continua alternando a expansão — menos alvos pequenos, mesmo resultado.
*Alternativa descartada:* duplo clique para o painel. Invisível para o usuário e ruim no toque.

**4. Alvos acionáveis viram elementos semânticos.**
O corpo do cartão e a seta passam a ser controles de verdade, com Enter/Espaço de graça e `aria-expanded` na seta. Como não se aninha botão dentro de botão, os dois ficam irmãos dentro do cartão, e a alça de arraste continua irmã dos dois.

**5. Tirar o wrapper do nó da ordem de tabulação (`nodesFocusable={false}`).**
Hoje cada nó tem `tabindex="0"` posto pelo React Flow e não executa ação nenhuma — o teclado tabula por tudo e nada acontece. Com os controles reais dentro do cartão, o wrapper vira parada duplicada e inútil. `nodesFocusable` não participa do cálculo de `hasPointerEvents`, então desligá-lo não reintroduz o defeito.

**6. `refId` é o id do Legendário, não o id do vínculo.**
`OrgChartService` já usa essa convenção e o `PersonPanel` chama `GET /legendarios/:refId`. No TOP: `TopServant.legendaryId`, `TopTeam.coordinatorLegendaryId`, `TopTeam.deputyCoordinatorLegendaryId`, `TopFamily.representativeLegendaryId`, `TopFamily.deputyRepresentativeLegendaryId`, `TopFamilyMember.topParticipant.legendaryId`, `TopParticipant.legendaryId`. O id do vínculo continua sendo o `id` do nó, usado para navegar.

**7. Não duplicar regra de escopo no montador da árvore.**
O `refId` é um UUID de Legendário — mesmo dado que as outras visões já devolvem, para quem já enxerga os nomes na árvore. O controle real está em `GET /legendarios/:id`, escopado pelo `AccessPolicyService`. Quem está fora de escopo vê a mensagem de indisponibilidade do painel, como já acontece nas outras abas.
*Alternativa descartada:* filtrar `refId` por escopo no builder — espalharia a regra de escopo por um segundo lugar, contra a decisão do projeto de concentrá-la no `AccessPolicyService`.

**8. O guarda da Fase 1 é asserção de configuração, não simulação de clique.**
JSDOM não faz hit-testing por `pointer-events`: um `click()` de Testing Library atravessa o elemento inerte e o teste passa verde com o bug presente. Um teste que "clica e espera o painel" daria falsa segurança exatamente aqui. O que se pode afirmar em teste é a configuração interativa entregue ao `<ReactFlow>` e a separação dos alvos dentro do cartão; o resto é smoke no navegador, registrado como evidência.
*Alternativa descartada:* adicionar Playwright ao repositório para cobrir isso de verdade. É a cobertura correta, mas é decisão de infraestrutura de teste maior que esta correção — fica anotado como dívida.

## Risks / Trade-offs

- **Reativar seleção liga comportamentos do React Flow que hoje estão dormentes** (classe `.selected`, seleção múltipla com Shift) → sem regra CSS para `.selected` no stylesheet, o efeito visual é nulo; o smoke confirma que nada estranho aparece.
- **Funcionalidades mortas voltando à vida de uma vez** — drag-and-drop, "Carregar mais", chips de bloco nunca foram exercitados por usuário real e podem ter defeitos próprios escondidos atrás deste → os smokes cobrem cada um explicitamente, e um defeito encontrado ali é achado novo, não regressão desta change.
- **Mudar o alvo do clique altera um hábito** → hoje não há hábito a preservar: nada respondia a clique.
- **JSDOM não cobre a Fase 1** → aceito e declarado; a asserção de configuração pega a regressão mais provável (alguém repor `elementsSelectable={false}`), e o smoke fecha o resto.
- **Nó de pessoa sem Legendário vinculado** → `refId` indefinido, clique não abre painel, sem erro; o teste de invariante precisa tolerar esse caso em vez de exigir `refId` cegamente.
- **Os dois montadores de organograma continuam duplicados** → fora de escopo; o invariante reduz o custo da divergência voltar.

## Migration Plan

Sem migration de banco e sem mudança de contrato. A Fase 2 é aditiva no JSON de `GET /tops/:id/org-chart`. Rollback = reverter o commit.

## Open Questions

Nenhuma.
