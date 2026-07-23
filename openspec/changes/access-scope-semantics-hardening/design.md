## Context

O controle de acesso tem dois eixos: **permissão de tela** (`SCREEN_CATALOG` + níveis NONE/VIEW/EDIT, materializados em permissions via `UserPermissionOverride`) e **escopo de dados** (`UserScope` de tipo CITY/TEAM/CHURCH/TOP + papéis derivados: SPIRITUAL_LEADER→igrejas, TEAM_COORDINATOR→equipes). Só `COORDINATION_ADMIN` é irrestrito ([access.constants.ts](../../../apps/api/src/common/access/access.constants.ts)).

Estado atual (auditoria de 22/07/2026), com duas semânticas de "escopo vazio" que **se contradizem**:
- `build*Where` (listas/dashboard/detalhe de legendário) → **fail-closed**: lista vazia vira `{ id: { in: [] } }`.
- `assert*Allowed` (TopScopeGuard, org-chart, management) → **fail-open**: `isXRestricted` só é `true` se há escopo do tipo; sem escopo, o `assert` é no-op.

Consequências reais: IDOR em `GET/PATCH /churches/:id` (sem escopo nenhum), `GET /tops/:id` liberado a quem não tem escopo de TOP, `GET /org-chart/coordinators` global; e o Painel deployado (`8d8e610`) roda `summary()` sem escopo → **todos** os contadores globais para qualquer `dashboard.read`. A concessão de tela e a atribuição de escopo são desacopladas: dá para conceder tela sem escopo e o usuário fica "vendo nada" sem aviso. Além disso, `/access-control` é guardado por `users.update` (permission), permitindo escalonamento.

## Goals / Non-Goals

**Goals:**
- Uma **semântica única e fail-closed** de escopo vazio, aplicada em `build*Where` e `assert*Allowed`.
- Fechar os buracos de segurança **já em produção**: escalonamento via `users.update`, IDOR de Igrejas, fail-open de TOPs/organograma.
- Dashboard que respeita permissão de tela por contador + escopo; sem vazamento de contagem global.
- UI de Controle de Acessos que **exige escopo** ao conceder tela escopável; higienizar telas fantasma/incoerentes.
- Suíte de testes de escopo/IDOR por tela.

**Non-Goals:**
- **Cross-type de Igrejas** ("igrejas da minha cidade"): decisão em aberto, feature à parte (ver Open Questions).
- Redesenho da UI do Controle de Acessos além do necessário para exigir escopo.
- Mudança do modelo de dados de acesso (roles/permissions/UserScope permanecem).
- Alterar o comportamento do admin (permanece irrestrito) ou das telas globais.

## Decisions

### D1 — Escopo vazio = fail-closed, unificado (opção **b**, aprovada)

Não-admin **sem escopo do tipo aplicável → vê nada**, tanto em lista quanto em detalhe por-id. Concretamente:
- Corrigir `isCityRestricted`/`isTeamRestricted`/`isChurchRestricted`/`isTopRestricted` (ou os `assert*Allowed`) para que um não-admin seja tratado como **restrito mesmo sem escopo daquele tipo** → o `assert` passa a negar. Isso alinha os guards ao `build*Where`.
- `build*Where` já é fail-closed; permanece.

**Alternativas consideradas:**
- **(a) Escopo vazio = vê tudo dentro da permissão (fail-open).** Rejeitada: inverte o default para inseguro numa base com PII (LGND); reabre exatamente o vazamento inter-cidades que já havia sido corrigido. O problema real não é "fail-closed é errado" — é o sistema permitir criar um estado sem escopo sem avisar.
- **(c) Por tipo de entidade (obrigatório em Legendários, opcional em Igrejas).** Rejeitada agora: é a semântica mais difícil de raciocinar/testar, cria um terceiro conjunto de regras onde já há dois em conflito, e o caso "igrejas da minha cidade" exige matching cross-type inexistente (vira D-aberta). Fica documentada como evolução possível.

### D2 — Telas globais isentas de escopo

Derivado de `scopeTypes: []` no `SCREEN_CATALOG`, o conjunto **global isento** é: **Painel/dashboard**, **Comunicação/communications**, **Usuários/users**. Todas as demais (legendarios, teams, churches, tops, org-chart, social-actions, reports, map) são escopáveis e sujeitas à exigência de escopo. A exigência de escopo (UI + `addScope`) SHALL consultar `screen.scopeTypes.length > 0`.

### D3 — Administração de acessos por papel admin (fecha escalonamento)

`/access-control/**` deixa de ser guardado por `@Permissions('users.update')` e passa a exigir o papel `COORDINATION_ADMIN` (mesmo guard de `/users`). Isso remove o vetor "conceder Usuários Ver e editar → auto-conceder tudo". Alinha "Usuários" à sua guarda real e elimina a incoerência do catálogo.

### D4 — Dashboard: permissão por contador + escopo total

Reescrever `DashboardService.summary(user)` para, por contador: (1) checar a permissão de tela da entidade (via permissions efetivas já disponíveis em `user.permissions` após o guard, ou resolvendo) e omitir/zerar quando ausente; (2) aplicar o `build*Where` correspondente (já fail-closed). Escopar `Expertises` (hoje `{ deletedAt: null }`) sob a permissão/escopo de Legendários (é atributo de legendário) ou sob a tela que a expõe. No front, gating de cada card por `hasPermission` (usabilidade; o backend é a barreira).

### D5 — Higiene do catálogo

Remover a tela fantasma `families` do `SCREEN_CATALOG` (e avaliar limpeza aditiva das permissions `families.*` no seed sem quebrar concessões existentes). Ajustar a representação de "Usuários" para refletir a guarda por papel.

## Risks / Trade-offs

- **[Tornar `assert*Allowed` fail-closed pode negar acessos hoje "funcionando" por acidente]** → Mitigação: mapear todos os chamadores; cobrir com testes por tela antes/depois; validar que admin e usuários com escopo correto não regridem. Rodar a suíte completa (`pnpm --filter api test`) e um smoke manual local com um MEMBRO configurado.
- **[Dashboard: distinguir "omitido" (sem permissão) de "zero" (escopo vazio) pode confundir o front]** → Mitigação: contrato claro no payload (campo ausente vs `0`); o front esconde card sem permissão e mostra `0` para escopo vazio.
- **[Mudança em produção sensível (auth/PII)]** → Mitigação: change isolada, testada 100% local (Jest + Vitest + lint) antes de qualquer deploy; sem migration destrutiva; deploy com `SEED_MODE=access` se permissions mudarem.
- **[Exigir escopo na UI pode travar fluxos de concessão em massa]** → Mitigação: permitir conceder a tela e adicionar escopo na mesma operação; telas globais isentas.
- **[Remover `families.*` do seed]** → Mitigação: remoção **aditiva** (não apagar dados de concessão); se houver override concedido, apenas deixa de ter efeito — nunca era enforced.

## Migration Plan

1. Implementar por fases (ver `tasks.md`), segurança primeiro.
2. Sem migration de schema esperada. Se o conjunto de permissions mudar (remoção de `families.*`), preparar seed aditivo idempotente e rodar `SEED_MODE=access` no deploy.
3. Verificação local obrigatória antes de "pronto": `pnpm --filter api test`, `pnpm --filter web test`, `pnpm -r lint`, `pnpm --filter api build`.
4. Rollback: change comportamental reversível por revert do PR; sem estado persistente novo.
5. Confirmar, antes do deploy, **qual build o teste do MEMBRO realmente exercitou** (os "zeros" indicam build pós-`8d8e610`, não a produção) — para validar a correção contra o cenário certo.

## Open Questions

- **Cross-type de Igrejas (feature futura, NÃO nesta change):** hoje Igreja só casa com escopo CHURCH; nunca por cidade. "Ver igrejas da minha cidade" exigiria matching novo (`Church.city` ↔ escopo CITY), que depende de `Church.city` preenchida (backfill incompleto) e de normalização de cidade. Registrar como proposta separada. Enquanto isso, a semântica permanece: **sem escopo CHURCH → nenhuma igreja**.
- **Expertises no dashboard:** confirmar sob qual tela/permissão o contador deve viver (Legendários vs. uma tela própria) — decidir no início da fase de dashboard.
- **Representação de "Usuários" no catálogo:** manter no catálogo como tela role-gated (informativa) ou removê-la do fluxo de permissões — decidir na fase de higiene.
