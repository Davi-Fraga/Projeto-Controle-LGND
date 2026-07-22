## Context

O sistema já tem RBAC com ~80 permissions granulares, `PermissionsGuard`, `RolesGuard` e `AccessPolicyService` para escopo. Hoje as permissions vêm só do papel (fixo). Esta feature adiciona ajuste fino por usuário (concessões/revogações) e escopo interno 1-N, mantendo o RBAC como base. É área sensível (auth) e deve ser implementada isolada, com testes de regressão de login.

## Goals / Non-Goals

**Goals**
- Permissions efetivas por usuário (papel + concessões − revogações), reavaliadas por requisição.
- Escopo interno 1-N por usuário (cidade/equipe/igreja) aplicado no backend.
- Tela de Controle de Acessos com origem (herdada/concedida/revogada) e gestão de escopos.
- Gestor de Cidade como caso de uso, sem papel rígido novo.

**Non-Goals**
- Não substituir o RBAC por permissions 100% individuais (abordagem C, rejeitada).
- Não tratar identidade/convite (é a `convite-por-link-cadastro`/07) nem hierarquia/limites (é a 04).
- Não alterar auth/CORS/refresh/Prisma bootstrap fora do necessário e aprovado.

## Decisions

### Modelo: papel + exceções (abordagem B)
Novos modelos Prisma para concessão/revogação individual de permission por usuário (ex.: `UserPermissionOverride { userId, permissionId, effect: GRANT|REVOKE }`) e para escopo (ex.: `UserScope { userId, type: CITY|TEAM|CHURCH, value }`, 1-N). Preserva `Role`/`RolePermission` existentes. Migration nova (nunca alterar aplicada).

### Permissions efetivas reavaliadas por requisição
O `PermissionsGuard` resolve as efetivas a cada request (papel + grants − revokes). Para refletir mudança em sessão ativa sem relogar: ou consultar o estado atual por requisição (com cache curto/controlado), ou manter o access token de vida curta. **Decisão:** o backend é a fonte da verdade e checa o estado atual; não confiar em permissions congeladas no token. (Trade-off custo de consulta vs. imediatismo — avaliar cache por requisição.)

### Escopo 1-N no AccessPolicyService
`AccessPolicyService` passa a montar o `where` com base no **conjunto** de escopos (ex.: `city IN [...]`). O caso de escopo único é um conjunto de 1. Reusa a normalização de cidade já existente.

### Gestor de Cidade
Composição: papel base + grants (Organograma etc.) + `UserScope` de cidade. Sem role nova. O Organograma e demais telas aplicam o filtro de escopo no backend.

## Risks / Trade-offs

- **Sensibilidade (auth/RBAC)**: risco de regressão no login dos perfis existentes → testes de revalidação obrigatórios + rollout isolado.
- **Reavaliação por requisição**: custo de performance vs. imediatismo da revogação → mitigar com cache curto por requisição/consulta enxuta de efetivas.
- **IDOR**: o escopo precisa ser aplicado em TODA consulta/mutação relevante, não só nas listagens → cobertura por testes de IDOR (URL direta).
- **Combinação permission×escopo inválida**: validar para não autorizar escopo sem a permission correspondente.

## Migration Plan

Migration nova adicionando os modelos de override e de escopo (sem tocar nas tabelas RBAC existentes). Seed idempotente se novas permissions forem necessárias. Implementar atrás de testes: efetivas, 403 pós-revogação em sessão ativa, IDOR por cidade, múltiplos escopos. Revalidar logins existentes antes de concluir.

## Open Questions

- Cache das permissions efetivas: por requisição, TTL curto, ou consulta direta sempre? (medir custo)
- O access token deve parar de carregar permissions, ou mantê-las apenas como dica não-autoritativa com TTL curto?

## Reformulação: controle por TELA + ESCOPO (substitui a UI por permission)

> Motivação: a 1ª versão expôs ~80 permissions técnicas com toggle individual — nível de máquina,
> não usável pelo admin. As permissions continuam existindo e protegendo o backend, mas ficam
> **escondidas**, agrupadas sob cada tela. O admin pensa em "a quais TELAS" e "de qual PARTE".

### Eixo 1 — Acesso por tela (mapa Tela→Permissions no backend)
Catálogo canônico no backend (`common/access/screen-catalog.ts`): cada tela tem `id`, `label`,
`scopeTypes[]` e dois conjuntos de permissions — `view` (leitura) e `edit` (mutação). Nível por tela:
**NONE / VIEW / EDIT**. VIEW concede `view`; EDIT concede `view ∪ edit`.

| Tela | view (leitura) | edit (mutação) | escopo |
|---|---|---|---|
| Painel | dashboard.read | — | — |
| Legendários | legendarios.read, legendarios.history.read, professions.read, expertises.read | legendarios.create/update/delete/restore, legendarios.history.create | CITY/TEAM/CHURCH |
| Equipes | teams.read, teams.members.read | teams.create/update/delete/restore, teams.members.add/update/remove | TEAM |
| Igrejas | churches.read | churches.create/update/delete | CHURCH |
| TOPs | tops.read, tops.participants/servants/teams/families(.members)/preregistrations.read | tops.* (create/update/delete/restore + add/update/remove/approve/reject/transfer) | TOP |
| Organograma | teams.read, legendarios.read, tops.read | — | CITY/TEAM |
| Famílias | families.read | families.create/update | TOP |
| Ações Sociais | social-actions.read, social-actions.participants.read | social-actions.* (create/update/delete/restore + participants.add/update/remove) | CITY |
| Comunicação | communications.read, communications.recipients.read | communications.create/update/send/delete, communications.recipients.update | — |
| Relatórios | reports.read | reports.export, reports.contacts.export | CITY |
| Mapa | map.read | — | CITY |
| Usuários | users.read, audit.read | users.create/update/deactivate | — |

O acesso efetivo por tela é **derivado**: a tela está em EDIT se as efetivas contêm `view ∪ edit`,
em VIEW se contêm `view`, senão NONE. Definir o nível aplica overrides (GRANT/REVOKE) sobre o
**conjunto** da tela — nunca permission a permission na UI. (Caminho B da nota 02 preservado.)

### Eixo 2 — Escopo por tela (a barreira real)
Reusa `UserScope` (1-N) e adiciona o tipo **TOP** ao enum `UserScopeType` (migration nova; nunca
alterar aplicada). `AccessPolicyService` ganha `buildTopWhere`/aplicação de escopo de TOP além de
cidade/equipe/igreja, aplicado em **consultas e mutações** do módulo correspondente. IDOR coberto
por teste (URL direta a equipe/cidade/igreja/TOP fora do escopo → recusado).

Mapa tela→tipos de escopo aplicáveis vem do próprio catálogo (`scopeTypes`). Validação
tela×escopo: só aceita escopo cujo tipo é aplicável à tela e cuja permission de leitura o usuário
tem (generaliza a validação permission×escopo já existente).

### Backend — o que muda
- `screen-catalog.ts`: novo, fonte da verdade Tela→Permissions + scopeTypes.
- `AccessControlService`: troca os endpoints de override-cru por **endpoints por tela**
  (GET estado por tela+nível+escopos; PUT nível de uma tela; POST/DELETE escopo por tela). Continua
  gravando em `UserPermissionOverride`/`UserScope` por baixo. `setPermissionOverride` cru deixa de
  ser exposto na UI (pode virar interno).
- `AccessPolicyService`: + escopo TOP; helpers de assert por equipe/igreja/TOP (espelhando o de cidade).
- Migration: `UserScopeType` += `TOP`.
- `PermissionsGuard`/efetivas: inalterados (continuam a barreira por permission).

### UI — o que muda
- A lista de ~80 toggles some. Entra uma lista de **telas** (do catálogo) com seletor de nível
  (NONE/VIEW/EDIT) e, para telas com `scopeTypes`, um seletor de **escopo com busca/autocomplete**
  (reusa o padrão do "legendário vinculado"). Mostra o nível e os escopos atuais por tela.

### Decisões a confirmar (antes de codar)
1. Nível por tela = **NONE/VIEW/EDIT** (vs. só ligado/desligado). Recomendo NONE/VIEW/EDIT.
2. Incluir **escopo TOP** agora (enum + aplicação no módulo tops) — maior superfície — ou fase 2.
3. Catálogo de telas acima (12 telas) — ajustar mapeamentos (ex.: "Famílias" = `families.*` vs `tops.families.*`).

## Open Questions (reformulação)

- "Famílias" como tela própria ou parte de TOPs? (afeta o mapa e o escopo TOP)
- Telas só-leitura (Painel/Mapa/Organograma) — nível fixo VIEW (sem EDIT)?

## Função na Manada (papéis desacoplados do acesso)

> Decisão do cliente: os "Perfis de Acesso" do formulário de usuário deixam de conceder acesso —
> viram a **Função na Manada** (rótulo organizacional). Todo o acesso passa a ser definido na tela
> Controle de Acessos. Confirmado: (1) função = só rótulo; (2) Administrador = atalho total;
> (3) escopo automático por função permanece.

### Modelo
- **Papéis (`UserRole`/`SystemRole`) = função organizacional**, NÃO concedem permissions base
  (exceto admin). Seção do formulário renomeada para "Função na Manada".
- **Exceção admin**: `COORDINATION_ADMIN` ("Administrador") mantém acesso total automático (todas
  as permissions) + escopo irrestrito (`isAdmin`). É o único atalho. `COORDINATION_USER` passa a
  ser uma função comum (sem acesso automático; sem bypass de escopo).
- **Permissions efetivas** = `(base − revogações) ∪ concessões por tela`, onde **base = permissions
  do papel APENAS quando o papel é `COORDINATION_ADMIN`**; para as demais funções, base = ∅. Ou seja,
  para não-admin: efetivas = `concessões por tela (GRANT) − revogações (REVOKE)`.
- **Escopo por função permanece** (decisão 3): `AccessPolicyService` continua derivando igrejas do
  Líder Espiritual e equipes do Coordenador, somado aos `UserScope` explícitos. Sem mudança aqui.

### Impacto no código
- `common/access/access.constants.ts` (novo): `ADMIN_ROLE = 'COORDINATION_ADMIN'` como fonte única.
- `EffectivePermissionsService.resolveKeys`, `auth.service.toSafeUser`, `users.service.toSafeUser`,
  `AccessControlService` (roleKeys/computeEffective/setScreenLevel): base do papel só conta para admin.
- `AccessPolicyService.isAdmin`: passa a ser só `COORDINATION_ADMIN` (remove `COORDINATION_USER`).
- Front `user-form.tsx`: seção "Perfis de Acesso" → "Função na Manada" + texto que explica que não
  define acesso (isso é na tela Controle de Acessos). Segue multi-select das funções.
- **Migração de dados**: para não travar ninguém, converter o acesso atual (derivado de papel) de
  cada usuário **não-admin** em concessões explícitas (`UserPermissionOverride` GRANT) na virada.
  (Ambiente com poucos usuários; alternativa = reconfigurar do zero, se o cliente preferir.)

### Riscos
- **Sensível (auth)**: não-admin sem concessões fica sem acesso → a migração é obrigatória para
  não regredir. Admin preservado. Testes de revalidação de login/efetivas atualizados.
- Dados de `RolePermission` de funções não-admin ficam **latentes** (existem no banco mas não contam
  nas efetivas). Seed mantido; limpeza opcional depois.
