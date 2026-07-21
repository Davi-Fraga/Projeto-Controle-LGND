## Why

O módulo de Organograma hoje é tratado como **desenho de árvore**, não como **sistema de navegação hierárquica**. A implementação atual ([`apps/web/src/features/org-chart/`](apps/web/src/features/org-chart/) + [`org-chart.service.ts`](apps/api/src/modules/org-chart/org-chart.service.ts)) monta a subárvore de um escopo (equipe, cidade, TOP, coordenadores) e a entrega **inteira** para o front renderizar de uma vez. Com o volume crescente (cidades com dezenas de legendários, hierarquia de gestão persistida com teto de 10 por gestor — spec `org-hierarchy-limits`) isso produz baixa legibilidade, excesso de zoom, perda de contexto e exploração confusa.

Ao mesmo tempo, três coisas **já existem e devem ser reusadas, não reinventadas**:

1. **Hierarquia persistida + teto de 10** (`org-hierarchy-limits`): os vínculos `cityLeaderId` (cidade → Líder → legendários) e `managerMembershipId` (equipe → sub-coordenador → integrantes) já são a fonte da verdade; o teto de 10 já é imposto no backend (admin isento).
2. **Escopo de dados** ([`AccessPolicyService`](apps/api/src/common/access/access-policy.service.ts)): `resolveScope` + `build*Where` + `assert*Allowed` já barram IDOR por cidade/equipe/TOP; o org-chart já chama `assertTeamAllowed`/`assertCityAllowed`.
3. **Modelo de acesso por tela** — `SCREEN_CATALOG` (níveis NONE/VIEW/EDIT) + `EffectivePermissionsService` (permissões efetivas por requisição, base só p/ admin) + `UserScope` 1-N, da change `user-access-control` (`controle-acessos-por-usuario`, ~84% pronta). A tela `org-chart` já existe no catálogo (`view: ['teams.read','legendarios.read','tops.read']`).

Esta change **refatora o Organograma para navegação escalável (overview + detail), edição de pessoa em painel lateral, mudanças estruturais controladas (drag-and-drop só em subdivisões ≤10) e autorização granular por tela/aba/escopo/ação**, tudo assentado nesses três pilares já existentes.

**Posição de produto adotada (defendida no design):** *editar pessoa deve ser amplamente acessível a quem tem a permissão funcional; drag-and-drop deve existir só em contextos pequenos e seguros — as subdivisões de até 10 pessoas. Na árvore macro, mudança hierárquica é ação explícita, validada, confirmada e auditada.*

## What Changes

- **Visualização overview + detail** — o Organograma NÃO renderiza mais a árvore inteira aberta. Nós vêm recolhidos por padrão, filhos carregam **sob demanda** (lazy), há limite de nós visíveis, foco no nó selecionado, breadcrumb da trilha, minimap/visão resumida, zoom/pan/recentralizar, e destaque do caminho ativo (pais, filhos, irmãos, grupo).
- **Painel lateral de pessoa** — clicar num nó de pessoa abre painel com dados, vínculo hierárquico, grupo atual, ações permitidas e histórico resumido. Edição de dados cadastrais ali, respeitando permissão. Modos **somente-leitura** e **edição parcial** por permissão.
- **Mudanças estruturais controladas** — mover/transferir/promover/alterar responsável/reordenar são **ações explícitas** com validação de destino, checagem de teto de 10, prevenção de loop, confirmação (nas críticas), **undo** e **auditoria**. **Drag-and-drop** habilitado **apenas dentro de subdivisões pequenas (≤10)** com alça de arraste, preview de destino, zonas válidas/inválidas, snapping, undo imediato e **alternativa por menu** (teclado/touch/acessibilidade).
- **Autorização granular do módulo** — reconcilia com o modelo de acesso por **tela** existente (`SCREEN_CATALOG` + níveis + `UserScope`): a tela `org-chart` mapeia `organogram.read` (VIEW) e `organogram.person.edit` (EDIT), e o modelo de tela é **estendido com toggles de ação** (`group.reorder`/`group.move`/`structure.change`) para distinguir editar de mover. As **abas derivam do `UserScope`** (não são permissões). Separa **visibilidade da UI** de **capacidade de interagir** de **autorização real de persistência** — o backend valida **toda** operação; ocultar botão no front nunca é a segurança.
- **API de escrita do Organograma** — novos endpoints de mutação estrutural (mover/reordenar/transferir/promover/undo) com guards, validação de regra de negócio antes de persistir e trilha de auditoria; os GETs de leitura ganham lazy/paginação por nível.

## Capabilities

### New Capabilities
- `organogram-navigation`: navegação hierárquica escalável — overview+detail, foco contextual, colapso progressivo, lazy loading de filhos, limite de nós visíveis, breadcrumb, minimap, zoom/pan/recentralizar, busca integrada à visualização e representação clara de subdivisões dentro da estrutura maior.
- `organogram-person-panel`: painel lateral de detalhe/edição de pessoa com modos somente-leitura e edição parcial por permissão, exibindo dados, vínculo, grupo, ações permitidas e histórico resumido.
- `organogram-structural-changes`: mudanças estruturais (mover, transferir, promover, alterar responsável, reordenar) com drag-and-drop restrito a subdivisões ≤10, ações explícitas na macro, validação de destino/capacidade/loop, confirmação, undo e auditoria.
- `organogram-authorization`: autorização e governança do módulo — reconciliada com o `SCREEN_CATALOG` (nível de tela + escopo de dados/abas via `UserScope` + toggles de ação), separação visibilidade × interação × persistência, enforcement no backend, menor privilégio e auditoria de eventos críticos.

### Modified Capabilities
- `org-hierarchy-limits`: mantém contrato (hierarquia persistida + teto de 10 + redistribuição), acrescentando que a **redistribuição manual passa a ter interface** (drag-and-drop em subdivisão / ação explícita na macro) e **auditoria + undo** das movimentações — sem alterar as regras já existentes.

<!-- Nota: esta change estende o SCREEN_CATALOG (modelo de `user-access-control`) com toggles de ação. Como `user-access-control` ainda não está arquivado (sem spec canônica em openspec/specs/), a extensão é normatizada como requisito da capability `organogram-authorization`, não como delta de uma spec inexistente. Ver Impact. -->
- `user-access-control` (extensão **aditiva**, requisito em `organogram-authorization`): `SCREEN_CATALOG` ganha **toggles de ação** além de VIEW/EDIT (ex.: editar pessoa sem mover) na tela `org-chart`; telas sem toggles seguem inalteradas.

## Impact

- **Backend**
  - `apps/api/src/modules/org-chart/` — novos endpoints de escrita (mover/reordenar/transferir/promover/undo) no padrão controller-fino + service; GETs ganham lazy por nível (`?parentId`, `depth`, paginação de filhos). Reusa `OrgChartService` e a util `org-chart.util`.
  - `apps/api/src/common/access/` — **estende** o `SCREEN_CATALOG` (tela `org-chart` → `view: ['organogram.read']`, `edit: ['organogram.person.edit']`, + toggles de ação) e o `EffectivePermissionsService`/tipos para suportar toggles; **reusa** `assert*Allowed` e o `UserScope`. Camada de compat governada (legado OU novo) com logs de decisão + parity shadow.
  - `apps/api/src/modules/audit/` — registrar mover/transferir/promover/mudança estrutural/undo/tentativa negada.
  - `prisma/` — **sem** novo modelo de hierarquia (já existe); novas permissions `organogram.*` no seed idempotente (feito); possível persistência de toggles por concessão e de **undo** (snapshot da última ação). Migration nova só se toggles/undo exigirem persistência.
- **Frontend**
  - `apps/web/src/features/org-chart/` — refatoração para overview+detail, lazy, minimap, breadcrumb, foco; painel lateral; alça de drag-and-drop em subdivisões; menus contextuais e ações explícitas; estados sem-acesso/somente-leitura/ação-bloqueada.
  - `apps/web/src/app/dashboard/organograma/page.tsx` — abas derivadas do `UserScope`; ações conforme permissões efetivas.
  - Gating de UI: tela por `organogram.read`, abas por `UserScope`, botões por `person.edit`/toggles — espelhando o backend, nunca substituindo-o.
- **Compartilhado**
  - `packages/shared` — tipos de nó do organograma (paginação/lazy, flags de capacidade), enums de permissão do módulo.
- **Fora de escopo**: redesenhar o modelo de acesso por tela (é a `user-access-control` — esta change só o **estende** aditivamente com toggles); alterar as regras do teto de 10 (é `org-hierarchy-limits`); mudanças em outros módulos de dados. Esta change **consome** essas bases.
- **Dependência**: `user-access-control` está **~84% pronto (43/51)** e já fornece o modelo (`SCREEN_CATALOG` + níveis + `UserScope` + permissões efetivas por requisição). A extensão de toggles é aditiva; o **corte do legado (Fase 4)** fica condicionado a `user-access-control` fechado + parity check limpo.
