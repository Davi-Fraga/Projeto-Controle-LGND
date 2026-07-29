## Why

Uma auditoria read-only (22/07/2026) do controle de acesso encontrou que a semântica de "escopo de dados" nunca foi definida de forma única, produzindo defeitos **em produção agora** e regressões restritivas no branch de trabalho:

- **Vazamento em produção (`8d8e610`, deploy de 16/07/2026):** o Painel (`GET /dashboard/summary`) roda `async summary()` **sem usuário e sem escopo** — todos os 10 contadores são globais e entregues a qualquer usuário com `dashboard.read`, ignorando permissão de tela e escopo. Os "zeros" observados no teste (Legendários 0, Igrejas 0) **não vêm de `8d8e610`** (uma consulta global não retorna 0 numa tabela populada) — vêm de um build pós-`8d8e610` parcialmente escopado, que corrigiu legendários/igrejas/cidades mas deixou TOPs/Famílias/Expertises globais.
- **Duas semânticas contraditórias de "escopo vazio":** `build*Where` (listas) é **fail-closed** (`{ id: { in: [] } }`), enquanto `assert*Allowed` (TopScopeGuard, organograma, management) é **fail-open** (no-op quando o usuário não tem escopo daquele tipo). Isso gera **IDOR real**.
- **Escalonamento de privilégio (produção):** o `/access-control` é guardado por `@Permissions('users.update')`, mas a tela "Usuários" no catálogo é role-gated (`@Roles(COORDINATION_ADMIN)`). Conceder "Usuários = Ver e editar" a um não-admin dá acesso ao `/access-control` → ele pode conceder telas/escopos a si mesmo.

Decisão aprovada pelo Davi: **opção (b)** — escopo vazio = **fail-closed** (vê nada, menor privilégio), com a UI passando a **exigir escopo** ao conceder tela escopável, e **unificando** as duas semânticas em fail-closed (corrigir `assert*Allowed` para barrar também quando não há escopo do tipo). Change **isolada**, testada local antes de deploy — é auth/PII, o tipo mais sensível.

## What Changes

Ordenado por prioridade: **segurança primeiro** (está em produção), depois consistência.

**Segurança (prioridade máxima — vive em produção):**
- **BREAKING** Fechar o escalonamento de privilégio: separar a administração de acessos do permissionamento genérico. `/access-control` passa a exigir papel administrativo (não a permissão `users.update`), alinhando "Usuários" ao guard real.
- Fechar **IDOR em Igrejas**: `GET /churches/:id` e `PATCH /churches/:id` passam a aplicar escopo de igreja (404/403 fora do escopo), como já fazem Legendários/Equipes/Ações Sociais.
- Fechar **fail-open** em `assertTopAllowed` (e `assertCity/Team/ChurchAllowed`): barrar também quando o usuário não tem escopo daquele tipo (unificação fail-closed). Escopar `GET /org-chart/coordinators`.

**Consistência da semântica de escopo (opção b):**
- Definição única: **não-admin sem escopo daquele tipo → vê nada** (fail-closed), em `build*Where` **e** `assert*Allowed`.
- UI do Controle de Acessos passa a **exigir ≥1 escopo** ao salvar uma tela escopável em VIEW/EDIT; backend valida (fail-closed) e sinaliza telas escopáveis sem escopo como estado inválido.
- **Telas legitimamente globais ficam isentas** da exigência (não têm recorte de dados): **Painel (dashboard)**, **Comunicação (communications)**, **Usuários (users)**. (Ver `design.md` para a lista canônica derivada de `scopeTypes: []`.)

**Dashboard:**
- Cada contador passa a respeitar (1) a **permissão de tela** da entidade e (2) o **escopo** — contador de entidade sem permissão de tela é omitido/zerado, não vaza contagem global.
- Escopar `Expertises` (hoje sempre global) e qualquer contador remanescente global.

**Higiene do modelo de telas:**
- Resolver a **tela fantasma "Famílias"** (`families.read/update` semeadas mas sem nenhum endpoint) — remover do catálogo/seed ou apontar para o domínio real (`tops.families.*`).
- Corrigir a **"mentira" do catálogo em "Usuários"** — o catálogo anuncia `users.*` mas a guarda real é o papel admin.

**Testes:**
- Suíte de escopo/IDOR **por tela** (comportamento, não caminho feliz): sem escopo, escopo que não casa, id fora do escopo → 403/404, criar/excluir só admin, dashboard não vaza sem permissão de tela.

**Fora de escopo (documentado como decisão em aberto, NÃO implementar agora):**
- **Cross-type de Igrejas** — hoje igreja só casa com escopo CHURCH (nunca por cidade). "Igrejas da minha cidade" seria matching cross-type novo = feature à parte. Registrado em `design.md` como Open Question.

## Capabilities

### New Capabilities
- `access-scope-enforcement`: contrato de **enforcement em runtime** do acesso — semântica única de escopo (fail-closed em `build*Where` e `assert*Allowed`), matriz de enforcement por tela (permissão + escopo + VER/EDIT), barreiras de IDOR por recurso, autorização do dashboard por contador, e o conjunto de telas globais isentas de escopo.

### Modified Capabilities
- `user-access-control`: o fluxo de **concessão** passa a exigir escopo ao conceder tela escopável (UI + validação backend); administração de acessos deixa de ser alcançável por `users.update` (fecha escalonamento); resolução da tela fantasma "Famílias" e da incoerência do catálogo "Usuários".

## Impact

- **Backend (apps/api):**
  - `common/access/access-policy.service.ts` — unificar semântica fail-closed nos `assert*Allowed`.
  - `common/access/screen-catalog.ts` — telas globais isentas; resolver Famílias/Usuários.
  - `modules/churches/*` — escopo em `findOne`/`update`.
  - `modules/tops/guards/top-scope.guard.ts`, `modules/org-chart/*`, `modules/management/*` — fail-closed.
  - `modules/dashboard/*` — permissão por contador + escopo em Expertises.
  - `modules/access-control/access-control.controller.ts` + `modules/users/*` — guarda por papel admin; exigir escopo em `addScope`/`setScreenLevel`.
- **Frontend (apps/web):**
  - `features/access-control/*` — exigir escopo ao salvar tela escopável.
  - `app/dashboard/page.tsx` — gating de cards por permissão de tela.
- **Migrations:** nenhuma esperada (mudança comportamental); confirmar se remover permissions `families.*`/seed exige limpeza aditiva.
- **Produção:** corrige vazamento total do dashboard e o escalonamento hoje ativos em `8d8e610`. Deploy exige `SEED_MODE=access` se o conjunto de permissions mudar.
- **Sem regressão** para admin (COORDINATION_ADMIN permanece irrestrito) e para telas globais.
