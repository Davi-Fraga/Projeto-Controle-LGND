## Context

### Resumo executivo

O Organograma da Central da Manada precisa deixar de ser um **desenho de árvore** e virar um **sistema de navegação hierárquica escalável, explorável, seguro e editável**. Hoje o backend monta a subárvore de um escopo e o front a desenha inteira; com o crescimento (cidades com dezenas de legendários, hierarquia de gestão com teto de 10 por gestor) isso gera zoom excessivo, perda de contexto e exploração confusa. A refatoração adota **overview + detail**: visão macro resumida, foco no nó selecionado, filhos sob demanda, painel lateral para detalhe/edição, e mudanças estruturais controladas — com **drag-and-drop apenas em subdivisões pequenas (≤10)** e **ações explícitas, validadas, confirmadas e auditadas** na macro. Tudo assentado no que já existe: hierarquia persistida + teto de 10 (`org-hierarchy-limits`), escopo de dados (`AccessPolicyService`) e o modelo de permissões (`user-access-control`).

### Estado atual (diagnóstico ancorado no código)

- **Leitura pesada, tudo de uma vez.** [`org-chart.service.ts`](apps/api/src/modules/org-chart/org-chart.service.ts) retorna a árvore completa do escopo (`getTeamChart`, `getCitiesChart`, `getCoordinatorsChart`) num único `OrgChartNode` com todos os filhos aninhados. O front ([`org-chart-tree.tsx`](apps/web/src/features/org-chart/org-chart-tree.tsx), `layout.ts`) renderiza esse blob. Não há lazy, nem limite de nós, nem foco.
- **Somente leitura.** [`org-chart.controller.ts`](apps/api/src/modules/org-chart/org-chart.controller.ts) só expõe GETs. Mover/redistribuir hoje acontece fora do organograma (update de `cityLeaderId`/`managerMembershipId`), sem interface direta, sem undo, sem auditoria própria da ação estrutural.
- **Escopo já é levado a sério.** O service chama `assertTeamAllowed`/`assertCityAllowed` (barreiras de IDOR) e usa `buildLegendaryWhere`/`buildTeamWhere` — bom alicerce a preservar.
- **Permissões atuais são emprestadas.** Os endpoints usam `teams.read`, `legendarios.read`, `tops.read` — não há namespace `organogram.*`. Não há separação entre "ver" e "mover".
- **Hierarquia e teto já existem** (`org-hierarchy-limits`): vínculos persistidos e teto de 10 no backend, admin isento. A refatoração **consome** isso, não o reinventa.

### Constraints

- Reusar `AccessPolicyService`, `PermissionsGuard`/`@Permissions`, o padrão de módulo `social-actions` (controller fino + service + DTOs + audit) e a util `org-chart.util`.
- Não alterar as regras do teto de 10 nem o modelo de RBAC/escopo — essas vivem em `org-hierarchy-limits` e `user-access-control`.
- Backend é a barreira real; front só reflete. Menor privilégio, fail-closed.

## Goals / Non-Goals

**Goals:**

- Navegação escalável (overview+detail, foco, lazy, limite de nós, breadcrumb, minimap, busca) que evita a árvore gigante aberta.
- Edição de pessoa simples e amplamente acessível (a quem tiver a permissão), no painel lateral.
- Drag-and-drop seguro e contextual **só** em subdivisões ≤10; mudanças macro como ações explícitas, validadas, confirmadas e auditadas, com undo.
- Autorização granular por nível de tela + escopo de dados (abas incluídas) + toggles de ação, com separação visibilidade × interação × persistência, validada no backend.
- Web desktop-first, sem ignorar touch/mobile, acessibilidade por teclado e leitores de tela nas ações principais.

**Non-Goals:**

- Redesenhar RBAC/escopo (é `user-access-control`) ou as regras do teto (é `org-hierarchy-limits`).
- Reescrever outros módulos de dados (Legendários, Equipes) além das rotas que o Organograma precisa.
- Editor visual livre de arrastar qualquer nó em qualquer lugar da árvore macro — explicitamente rejeitado (ver Trade-offs).

## Decisions

### D1 — Overview + detail com lazy por nível (a decisão-mãe)

**Escolha:** a raiz e o 1º nível vêm recolhidos; cada expansão busca os filhos daquele nó sob demanda (`GET .../children?parentId=&cursor=`), com **limite de nós por nível** e "carregar mais". O foco em um nó destaca o caminho ativo (pais/filhos/irmãos/grupo) e atenua o resto. Breadcrumb dá a trilha; minimap dá a orientação espacial; zoom/pan/recentralizar completam.
**Por quê:** resolve legibilidade, desempenho e orientação de uma vez; escala para hierarquias grandes sem despejar milhares de nós. É o núcleo do pedido "não renderizar a árvore inteira".
**Alternativa descartada:** manter árvore completa e só melhorar layout/zoom — não escala e mantém a sobrecarga cognitiva.

### D2 — Editar é amplo; mover é restrito (posição de produto)

**Escolha:** `organogram.person.edit` é uma permissão funcional ampla (quem cuida do cadastro edita). Mover/reordenar/mudança estrutural são permissões separadas e mais restritas (`organogram.group.reorder` < `organogram.group.move` < `organogram.structure.change`).
**Por quê (defesa no Trade-offs):** editar é **tarefa de precisão localizada** (baixo risco, alto valor cotidiano); mover é **mudança de estrutura** (alto risco de erro, efeitos em cascata, precisa de governança). Ver a seção Trade-offs.

### D3 — Drag-and-drop só em subdivisões ≤10

**Escolha:** DnD habilitado apenas dentro de uma subdivisão pequena (grupo de gestão ≤10), com **alça dedicada**, estado grabbed, preview, zonas válidas/inválidas, snapping, undo imediato e **alternativa por menu** (teclado/touch). Na macro, rearranjo é ação explícita.
**Por quê:** subdivisões pequenas são o único contexto onde arrastar é preciso, previsível e reversível. Na árvore macro, arrastar é ambíguo e propenso a erro. Bloqueado sem `organogram.group.reorder`.
**Alternativa descartada:** DnD global — rejeitado por risco e confusão (Trade-offs).

### D4 — Namespace `organogram.*` reconciliado com o SCREEN_CATALOG (revisado)

**Contexto da revisão:** a leitura do código mostrou que `user-access-control` está ~84% pronto e é o modelo real: acesso de não-admin = 100% concessões por **tela** (`SCREEN_CATALOG` com níveis NONE/VIEW/EDIT + `UserScope`); a tela `org-chart` já existe (`view: ['teams.read','legendarios.read','tops.read']`). Duas decisões de Davi rebasearam o namespace neste modelo:

- **(Q1) Granularidade via extensão do catálogo:** o modelo de tela ganha **toggles de ação** além de VIEW/EDIT. A tela `org-chart` passa a ser `view: ['organogram.read']`, `edit: ['organogram.person.edit']`, com toggles `organogram.group.reorder` < `organogram.group.move` < `organogram.structure.change`. Isso honra "editar sem mover" (requisito) que NONE/VIEW/EDIT sozinho não expressa. É uma extensão do modelo de `user-access-control` (área sensível) feita nesta change.
- **(Q2) Abas derivadas do `UserScope`:** a visibilidade de aba (Equipes/Cidades/TOPs/Coordenadores) vem do **escopo de dados** do usuário, não de permissão. Isso **elimina** `organogram.tab.*`.

**Conjunto enxuto resultante:** `organogram.read` (VIEW), `organogram.person.edit` (EDIT), toggles `organogram.group.reorder`/`organogram.group.move`/`organogram.structure.change`. Removidos: `tab.*` (Q2), `person.view` (dobra em VIEW), `permissions.manage` (administrar acesso = tela Controle de Acessos existente).
**Por quê:** granularidade real (ver ≠ editar ≠ mover) **dentro** do modelo existente, sem mecanismo paralelo e sem duplicar o escopo já testado contra IDOR.
**Alternativa descartada:** telas separadas por aba (`org-chart-cidades`, …) — multiplica telas no catálogo e na UI de Controle de Acessos sem ganho, já que o escopo já decide as abas.

### D5 — Estado visual separado do estado persistido; validação antes do drop/confirm

**Escolha:** o front mantém estado visual (foco, expansão, ordem em edição, "optimistic move") separado do persistido. Nenhuma movimentação é dada como concluída antes de a API validar (teto, loop, escopo, integridade) e confirmar. Undo guarda o vínculo anterior (snapshot da última ação) e revalida na reversão.
**Por quê:** garante consistência e feedback rápido sem confiar no cliente. O backend é a fonte da verdade.

### D6 — Reuso de biblioteca de árvore/grafo com collapse + lazy + DnD

**Escolha:** front React com biblioteca que suporte renderização incremental, colapso, lazy e DnD acessível (com alça e teclado), OU camada própria sobre o layout atual se a lib não atender acessibilidade. Decisão final de lib na Fase 1, com critério de acessibilidade e performance.
**Por quê:** evitar reinventar layout/zoom/minimap; priorizar acessibilidade e volume.

### D7 — Governança do rollout de autorização (compat com prazo, não eterna)

Aprovado com quatro critérios **obrigatórios** para a compatibilidade legado↔novo namespace não virar dívida permanente:

1. **Fallback compatível com legado (Fase 1→4):** durante o rollout, os endpoints do Organograma aceitam **legado + novo** — `teams.read`/`legendarios.read`/`tops.read` **OU** `organogram.read`/toggles. A migração se dá **editando o `view`/`edit` da tela `org-chart` no `SCREEN_CATALOG`** (re-mapeia todos de uma vez), não perfil a perfil. A porta legado é temporária, não default.
2. **Logs de decisão de autorização:** cada checagem que passa pela via legado registra um log estruturado (`authz.decision`: usuário, rota, permissão exigida, via = `legacy`|`new`, resultado). Serve para medir dependência do legado e planejar a retirada.
3. **Telemetria de mismatch (shadow/parity check):** quando ambas as vias podem ser avaliadas, o backend computa a decisão **antiga** e a **nova** em paralelo e emite telemetria quando **divergem** (`authz.parity_mismatch`: rota, decisão legada, decisão nova). Enquanto `user-access-control` não fecha, o resultado efetivo segue o legado; a nova via roda em **shadow** só para detectar divergência — nunca nega/permite sozinha antes do corte.
4. **Prazo e plano de retirada:** a remoção da via legado é **tarefa explícita da Fase 4** (task 4.4), condicionada a `user-access-control` fechado + parity check sem divergências por um período observado. O corte remove a aceitação do legado e passa a exigir só `organogram.*`.

**Por quê:** o próprio pedido de aprovação condiciona seguir a "fallback compatível, logs de decisão, telemetria de mismatch e plano claro de retirada". Sem prazo e sem parity check, a compat vira permanente e o namespace novo nunca assume de fato.
**Alternativa descartada:** trocar direto para `organogram.*` na Fase 1 — quebraria perfis atuais e a dependência ainda-aberta de `user-access-control`.

## Authorization architecture — "Autorização, permissões e governança de acesso"

Esta seção é o núcleo de segurança da spec e é normatizada na capability `organogram-authorization`.

### Três planos, sempre separados

1. **Visibilidade (UI):** o que aparece — item de menu, aba, filtro, botão no card/sidebar/menu contextual. Derivado das permissões efetivas do usuário.
2. **Capacidade de interação (UI):** o que a UI deixa tentar — alça de DnD ativa, botão habilitado.
3. **Autorização real de persistência (backend):** o que é gravado — validado por guard + policy em **toda** rota de mutação. Ocultar botão **não** é segurança.

### Camadas de autorização (responsabilidades separadas)

A autorização é modelada **dentro do `SCREEN_CATALOG`**, em camadas cumulativas. As camadas de tela/toggle são **permissões**; a de escopo **não é permissão** — é `UserScope`/`AccessPolicyService`, e é ela que também decide **quais abas** aparecem (decisão Q2).

| # | Camada | Mecanismo | Exemplo | Nega quando |
|---|---|---|---|---|
| 1 | **Nível de tela** (entrar/ver/editar) | permissão via catálogo | VIEW=`organogram.read`, EDIT=`organogram.person.edit` | tela não concedida → some do menu / 403 |
| 2 | **Escopo de dados + abas visíveis** | `UserScope` + `AccessPolicyService` (**não** é permissão) | escopo de cidade → aba Cidades + só aquelas cidades | fora do escopo não retorna / `assert*Allowed` 403 (IDOR) |
| 3 | **Toggles de ação** | permissão via catálogo (além do EDIT) | `organogram.group.reorder` / `.move` / `organogram.structure.change` | ação oculta/desabilitada / mutação 403 |

**Disambiguação (obrigatória):** não existe permissão de "aba" — abas vêm da camada 2 (escopo). "Escopo de dados" é **sempre** `UserScope`/`AccessPolicyService` e **nunca** vira permissão. As camadas são **cumulativas**: uma ação só ocorre se passar por todas as aplicáveis (tela concedida → dentro do escopo → toggle da ação, quando for ação).

**Mapa da tela `org-chart` no catálogo (revisado):**

| Slot no catálogo | Permissão | Controla |
|---|---|---|
| `view` | `organogram.read` | abrir o módulo, navegar, ver detalhe da pessoa |
| `edit` | `organogram.person.edit` | salvar dados cadastrais |
| toggle | `organogram.group.reorder` | DnD/reordenar dentro de subdivisão ≤10 |
| toggle | `organogram.group.move` | trocar vínculo/gestor entre grupos |
| toggle | `organogram.structure.change` | mudanças macro que exigem confirmação |
| `scopeTypes` | `UserScope` CITY/TEAM/(TOP) | quais cidades/equipes/TOPs **e** quais abas |

**Escopo nunca é superado por toggle.** Ter `organogram.group.move` não permite mover para fora do escopo: é 403 mesmo com o toggle.

### Enforcement no backend

- Todo endpoint (GET e mutação) sob `@UseGuards(JwtAuthGuard, PermissionsGuard)` + `@Permissions('organogram....')`.
- Toda mutação chama `assert*Allowed` para o alvo **e** o destino antes de validar regra de negócio.
- Permissões efetivas reavaliadas por requisição (via `user-access-control`) — conceder/revogar reflete sem relogar.
- Auditoria em `audit` para mover/transferir/promover/estrutural/undo e **tentativas negadas**.

### Como as permissões moldam a UX

- **Menu lateral:** o item Organograma some sem a tela concedida (`organogram.read`).
- **Abas:** derivadas do `UserScope` — só aparece a aba do escopo que o usuário tem (cidade→Cidades, equipe→Equipes); API das demais responde 403 pelo escopo.
- **Filtros/escopos:** o seletor de cidade/equipe/TOP lista apenas o que está no `UserScope`.
- **Botões (card / sidebar / menu contextual):** editar aparece com `person.edit`; mover/transferir com `group.move`; reordenar/alça de DnD com `group.reorder`; confirmar estrutural com `structure.change`.
- **DnD:** alça só ativa com `group.reorder` e dentro de subdivisão ≤10.
- **Comunicação de restrição:** três estados distintos — **sem acesso** (não abre), **somente-leitura** (vê, não age), **ação bloqueada** (poderia, mas não agora: destino cheio/fora do escopo). Tooltip explica o motivo sem vazar dados fora do escopo.

## User journey

1. **Abrir por escopo** — usuário abre o Organograma; as abas visíveis derivam do seu `UserScope` e, dentro delas, só os dados do escopo. Estrutura resumida, recolhida.
2. **Explorar** — busca/expande sob demanda; foca um nó; breadcrumb + minimap dão orientação.
3. **Detalhar/editar** — clica numa pessoa; painel lateral mostra dados + ações permitidas; edita cadastral se tiver `person.edit`.
4. **Reorganizar subdivisão** — dentro de um grupo ≤10, arrasta pela alça (ou usa menu) para reordenar/mover interno, com `group.reorder`.
5. **Mudança macro** — usa ação explícita (mover/transferir/promover) com `group.move`/`structure.change`; valida destino; confirma; audita.
6. **Desfazer** — undo da última ação estrutural, revalidado.

## Detailed flows

- **Abrir organograma por escopo:** GET raiz do escopo (1º nível recolhido) filtrado por `AccessPolicyService`; abas derivadas do `UserScope`.
- **Selecionar e focar nó:** front muda foco (estado visual), destaca caminho ativo, atualiza breadcrumb/minimap; sem round-trip se filhos já em cache.
- **Expandir filhos sob demanda:** GET `children(parentId, cursor)`; anexa; respeita limite de nós e escopo.
- **Editar pessoa:** abre painel → edita → salva → API revalida `person.edit` + escopo → persiste → painel/nó refletem.
- **Mover na subdivisão (DnD):** pega pela alça (grabbed) → preview/zonas → solta em alvo válido → API valida teto/loop/escopo → confirma → undo disponível.
- **Mover para outro grupo (macro):** ação explícita → escolhe destino → valida capacidade/loop/escopo → confirma (crítica) → persiste → audita → undo.
- **Reordenar no mesmo grupo:** só ordem, sem trocar vínculo (diferenciado de mudança hierárquica).
- **Alterar responsável:** ação explícita com `group.move`/`structure.change`; valida teto do novo responsável.
- **Desfazer última alteração:** restaura vínculo anterior se não violar teto; registra.
- **Conflito destino cheio/inválido:** 422/erro tratado com mensagem de capacidade; nada é alterado.
- **Ação sem permissão:** UI oculta/desabilita; se forçado na API, 403 + auditoria da tentativa.
- **Somente-leitura:** painel abre sem edição nem ações destrutivas.
- **Aba sim, outra não:** conforme o `UserScope`, vê uma aba e a outra some; API da negada responde 403 pelo escopo.
- **Mudança crítica:** modal de confirmação + auditoria; só com `structure.change`.

## Interaction rules — quando usar cada interação

| Interação | Quando usar |
|---|---|
| **Clique simples** | selecionar/focar nó; abrir painel de detalhe |
| **Duplo clique** | atalho opcional para expandir/recolher subárvore (não obrigatório; nunca única forma) |
| **Painel lateral** | ver e **editar** dados da pessoa; histórico; ações permitidas |
| **Menu contextual** | ações estruturais na macro e **alternativa** ao DnD (mover/reordenar) |
| **Drag-and-drop** | **só** reordenar/mover dentro de subdivisão ≤10, via alça |
| **Botão de ação explícita** | mover/transferir/promover/alterar responsável na macro |
| **Modal de confirmação** | mudança estrutural crítica |
| **Tooltip de restrição** | explicar por que uma ação está desabilitada |
| **Mensagem de ação bloqueada** | permissão ausente, destino cheio, fora do escopo |

## Error cases & edge cases

- Destino cheio (teto 10) → recusa com mensagem de capacidade; sugere criar/escolher outro gestor.
- Loop hierárquico → recusa.
- Fora do escopo (alvo ou destino) → 403 + auditoria, mesmo via API direta (IDOR).
- Concorrência: dois moves simultâneos → última validação vence; o que violaria teto/consistência é recusado.
- Undo cuja reversão violaria o teto (estado mudou) → recusado com explicação.
- Expandir nó com falha de rede → nó marca erro e permite retry, sem derrubar a árvore.
- Pessoa "sem gestor" (estado de `org-hierarchy-limits`) → aparece em nó dedicado; pode ser destino/origem de redistribuição.
- Busca que casaria alguém fora do escopo → não revela.
- Sessão expira no meio da edição → 401 tratado (não-bug), reautentica sem perder o rascunho quando possível.

## Business rules

- Teto de 10 por gestor (admin isento) — imposto no backend (`org-hierarchy-limits`).
- Impedir movimentos inválidos e loops; validar capacidade e integridade **antes** de persistir.
- Diferenciar reordenação interna de mudança de vínculo.
- Confirmar movimentos críticos; auditar mudanças estruturais e tentativas sensíveis; prever undo.
- Nenhuma mudança fora do escopo autorizado.
- Regras distintas por natureza: leitura (ampla, escopada), edição simples (ampla com `person.edit`), reestruturação (restrita, validada, auditada).

## Risks / Trade-offs

### A decisão central, defendida: "editar amplo, DnD restrito a subdivisões ≤10"

- **Usabilidade:** editar é uma tarefa de **precisão** (mudar um telefone, um papel) — formulário no painel é o instrumento certo. Arrastar para editar seria pior. Já reorganizar poucos itens é natural por manipulação direta.
- **Risco de erro:** arrastar na macro erra fácil (solta no ramo errado, escala grande, alvo pequeno). Em subdivisão ≤10 o espaço é pequeno, os alvos são claros e o undo é imediato — erro barato e reversível.
- **Escalabilidade visual:** DnD global exigiria a árvore inteira aberta — exatamente o que estamos eliminando. DnD confinado a um grupo pequeno não briga com overview+detail.
- **Clareza mental:** o usuário raciocina "estou arrumando este time de até 10", não "estou reescrevendo a organização inteira". Fronteira cognitiva nítida.
- **Acessibilidade:** DnD é difícil por teclado/leitor de tela; confiná-lo e **sempre** oferecer alternativa por menu mantém o módulo acessível. Editar por formulário já é acessível por natureza.
- **Governança de mudanças:** mudança macro é decisão organizacional — merece ação explícita, confirmação e auditoria, não um gesto de arrastar. Editar cadastral é rotina, não precisa desse peso.
- **Segurança e autorização:** separar `person.edit` (amplo) de `group.reorder`/`group.move`/`structure.change` (restritos) permite dar edição a muitos e reestruturação a poucos — casando com menor privilégio e permissões granulares.
- **Compatibilidade com permissões granulares:** ações estruturais precisam ser restringidas **mais** que leitura/edição leve; a UX espelha exatamente essa hierarquia de risco.

### Outros riscos

- **[Migração de permissões dos GETs]** (de `teams.read`/`legendarios.read` para `organogram.*`) pode quebrar acesso de perfis atuais → aceitar ambas durante o rollout e migrar o seed/atribuições na Fase 4; testar perfis existentes.
- **[Dependência de `user-access-control`]** → está ~84% pronto (43/51) e **já fornece** o modelo (SCREEN_CATALOG + níveis + `UserScope` + permissões efetivas por requisição). Esta change **estende** esse modelo (toggles de ação) — mudança em área sensível; isolar, testar 403/IDOR e revalidar login dos perfis. O corte do legado (Fase 4) fica condicionado a ele estar fechado.
- **[Extensão do SCREEN_CATALOG (toggles)]** → mexe no núcleo do controle de acesso; risco de regressão nas telas existentes. Mitigar: extensão aditiva (telas sem toggles não mudam), testes do `EffectivePermissionsService`/catálogo, e escopo confinado à tela `org-chart`.
- **[Lib de árvore sem acessibilidade adequada]** → critério de escolha na Fase 1 inclui teclado/leitor de tela; fallback para camada própria.
- **[Undo persistente]** (se exigir snapshot no banco) → migration nova pequena; alternativamente undo em memória/sessão para a última ação, com trade-off de durabilidade.

## Migration Plan

Rollout incremental por fases (ver Roadmap). Backend e front evoluem atrás de flags/permissões; leitura antiga continua funcionando até a nova visualização substituir. Sem big-bang. Rollback por fase = reverter o front da fase e manter os GETs antigos.

## Success metrics

- ↓ nº de nós visíveis por padrão (meta: raiz + 1 nível vs. árvore inteira).
- ↓ tempo para localizar uma pessoa/grupo (busca + foco).
- ↓ erros de movimentação (moves revertidos por undo / recusados por destino inválido).
- ↓ abandono por confusão visual (sessões que abrem e saem sem interagir).
- ↑ sucesso em tarefas de edição de pessoa.
- ↑ sucesso em reorganização de subdivisões.
- ↓ tentativas inválidas por falta de clareza de permissão (ações bloqueadas clicadas).
- Rastreabilidade: % de mudanças estruturais com registro de auditoria (meta 100%).
- Performance percebida no carregamento progressivo (tempo de expansão/busca aceitável).

## Technical recommendation

- **Front:** React (App Router, já em uso), renderização incremental; biblioteca de árvore/grafo com collapse + lazy + DnD acessível **ou** camada própria; estado visual separado do persistido; alça de DnD + alternativa por menu; minimap/zoom/pan.
- **Back:** manter `OrgChartService` para leitura + novos métodos de escrita (mover/reordenar/transferir/promover/undo) no padrão `social-actions`; GETs com lazy por nível (`parentId`, cursor, limite); `PermissionsGuard` + `assert*Allowed`; validação de regra antes de persistir; `audit` em toda mutação e tentativa negada; policy layer reusando `AccessPolicyService`.
- **Shared:** tipos de nó com flags de capacidade/paginação e enums de permissão.
- **Segurança:** nunca confiar em ocultação de botão; testes de 403/IDOR por ação e por escopo.

## Roadmap (fases)

- **Fase 1 — Navegação:** overview+detail, foco contextual, colapso progressivo, lazy, limite de nós, minimap, breadcrumb, zoom/pan/recentralizar, busca integrada. (capability `organogram-navigation`)
- **Fase 2 — Painel de pessoa:** painel lateral de visualização e edição, estados read-only e edição parcial por permissão. (`organogram-person-panel`)
- **Fase 3 — DnD em subdivisões ≤10:** alça, grabbed, preview, zonas válidas/inválidas, snapping, validação, undo e alternativa por menu; acessibilidade por teclado/touch. (`organogram-structural-changes`, parte)
- **Fase 4 — Estruturais avançadas + governança:** mover/transferir/promover na macro com permissões granulares, confirmação, auditoria; consolidação do namespace `organogram.*` e migração das atribuições. (`organogram-structural-changes` + `organogram-authorization`)
- **Fase 5 — Escala e refino:** otimizações para muitos nós, observabilidade de erros/ações críticas, métricas e ajuste de UX com base em uso real.

## Open Questions

- Escolha final da biblioteca de árvore/grafo (critério: acessibilidade + performance + DnD com alça) — decidir na Fase 1.
- Undo: em memória/sessão (última ação) vs. persistido no banco (durável) — decidir na Fase 3 conforme requisito de durabilidade.
- Limite exato de nós visíveis por nível antes de "carregar mais" — calibrar com dados reais na Fase 1.
- Estratégia de compatibilidade durante a migração de `teams.read`/`legendarios.read` → `organogram.*` (aceitar ambas por quanto tempo) — definir na Fase 4.
