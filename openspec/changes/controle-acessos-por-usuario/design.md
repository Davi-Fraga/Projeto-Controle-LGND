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
- Onde os escopos válidos por tela são declarados (mapa tela→tipos de escopo aplicáveis)?
- O access token deve parar de carregar permissions, ou mantê-las apenas como dica não-autoritativa com TTL curto?
- Granularidade do escopo de equipe/igreja vs. cidade — todos 1-N do mesmo jeito?
