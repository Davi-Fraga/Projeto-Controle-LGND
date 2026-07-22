## Why

Hoje as permissions são agrupadas em papéis fixos (RBAC), o que é rígido: para dar a uma pessoa acesso a uma tela extra (ou restringir o escopo de dados que ela vê), é preciso trocar o papel inteiro. O movimento precisa de ajuste fino **por usuário** — ex.: um "Gestor de Cidade" que só pode ver o Organograma da(s) sua(s) cidade(s) — sem criar um papel rígido novo para cada caso.

## What Changes

- Adiciona uma camada de **ajustes individuais por usuário** sobre o papel base (abordagem **B**: papel + concessões/revogações individuais). As **permissions efetivas** = `papel base + concedidas individualmente − revogadas individualmente`.
- O `PermissionsGuard` passa a usar as permissions **efetivas reavaliadas por requisição** (não congeladas no token), para que conceder/revogar acesso reflita **sem o usuário precisar relogar**.
- Adiciona **escopo interno por usuário** (Nível 2): além de "quais telas/ações", controla "quais dados" dentro da tela — por cidade, equipe ou igreja. A associação usuário→escopo é **1-N** (um usuário pode ter vários escopos, ex.: duas cidades). O `AccessPolicyService` monta o filtro considerando o **conjunto** de escopos.
- Nova tela administrativa **Controle de Acessos** por usuário: lista telas/ações, liga/desliga cada permission, **diferencia herdada / concedida / revogada**, e configura os escopos (incl. múltiplos).
- **Gestor de Cidade** vira caso de uso desta feature (papel base + permissions concedidas + escopo por cidade no `AccessPolicyService` sobre `Legendary.city` normalizado), **não** um papel rígido separado.
- Backend continua sendo a barreira real: escopo aplicado em **todas** as consultas e mutações relevantes; menus no front apenas refletem, sem ser segurança. Teste de **IDOR** para acesso direto fora do escopo.

## Capabilities

### New Capabilities
- `user-access-control`: ajuste fino de permissions por usuário (concessões/revogações sobre o papel base, com permissions efetivas reavaliadas por requisição) + escopo interno 1-N por usuário (cidade/equipe/igreja) aplicado no backend, com a tela administrativa de Controle de Acessos e o Gestor de Cidade como caso de uso.

### Modified Capabilities
<!-- Sem spec canônica de RBAC em openspec/specs/. O comportamento atual (papéis fixos) é estendido, não substituído; descrito como requisito da nova capability. -->

## Impact

- **Affected specs**: nova capability `user-access-control`.
- **Affected code**:
  - Prisma: novos modelos para concessão/revogação individual de permission por usuário e para associação usuário→escopos (1-N). Migration nova. Preserva o RBAC existente.
  - API: `common/access` (`AccessPolicyService` — incluir múltiplos escopos por cidade/equipe/igreja), `PermissionsGuard` (usar permissions efetivas por requisição), módulo `users`/novo módulo de acessos com endpoints da tela de Controle de Acessos; seed idempotente se surgirem novas permissions.
  - Web: nova tela **Controle de Acessos** (lista permissions herdada/concedida/revogada + gestão de escopos), adaptação de menus às permissions efetivas.
- **Dependências**: alinha-se com `convite-por-link-cadastro` (07) — o convite define papel/escopo iniciais usando este mesmo modelo. É pré-requisito de `hierarquia-limites-organograma` (04), que usa o escopo por cidade do Gestor de Cidade.
- **Risco**: **alto** — mexe em auth/RBAC/escopo (área sensível). Implementar isolado, com revalidação do login dos perfis existentes, testes de 403 pós-revogação em sessão ativa e IDOR. Não alterar auth/CORS/refresh/Prisma bootstrap fora do aprovado.
