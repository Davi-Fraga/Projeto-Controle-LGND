## ADDED Requirements

### Requirement: Conceder tela escopável sem escopo é sinalizado como estado inválido

Uma tela **escopável** (`scopeTypes` não-vazio) concedida em VIEW/EDIT **sem nenhum escopo** é um estado inválido (fail-closed faz o usuário "não ver nada"). O backend SHALL expor essa condição por tela (flag `scopeMissing`), e a UI SHALL destacar a tela e orientar a adicionar um escopo. Telas globais (dashboard, communications, users; `scopeTypes` vazio) NÃO SHALL ser marcadas.

Nota de design: a concessão do nível e a atribuição de escopo são operações distintas e **ordenadas** — `addScope` exige que a permissão de leitura da tela já esteja concedida (não é possível atribuir escopo antes de conceder a tela). Por isso a exigência é aplicada como **sinalização proeminente + orientação** (não um bloqueio do próprio ato de conceder, que tornaria impossível depois adicionar o escopo).

#### Scenario: Tela escopável concedida sem escopo é sinalizada

- **WHEN** o admin abre o Controle de Acessos de um usuário com uma tela escopável (ex.: Igrejas) concedida em VIEW/EDIT e sem nenhum escopo
- **THEN** o backend SHALL retornar `scopeMissing: true` para essa tela e a UI SHALL destacá-la e orientar a adicionar um escopo (avisando que, sem escopo, o usuário não verá dados)

#### Scenario: Tela escopável com escopo não é sinalizada

- **WHEN** a mesma tela passa a ter ao menos um escopo atribuído
- **THEN** `scopeMissing` SHALL ser `false` e o destaque SHALL desaparecer

#### Scenario: Tela global não exige escopo

- **WHEN** o admin concede a tela Comunicação (ou Painel/Usuários) sem escopo
- **THEN** `scopeMissing` SHALL ser `false` e o sistema NÃO SHALL sinalizar erro

### Requirement: Administração de acessos exige papel administrativo

Os endpoints de administração de acesso (`/access-control/**`) e a gestão de usuários (`/users/**`, exceto `/users/me`) SHALL exigir o papel `COORDINATION_ADMIN`, e NÃO SHALL ser alcançáveis apenas pela permissão `users.update`. Conceder telas/escopos a outro usuário SHALL ser privilégio exclusivo do administrador.

#### Scenario: Não-admin com users.update não administra acessos

- **WHEN** um não-admin que recebeu a permissão `users.update` chama qualquer rota `/access-control/**`
- **THEN** o backend SHALL negar com 403

#### Scenario: Não há auto-escalonamento

- **WHEN** um não-admin tenta conceder a si mesmo uma tela ou escopo via `/access-control`
- **THEN** o backend SHALL negar com 403

#### Scenario: Administrador administra normalmente

- **WHEN** um `COORDINATION_ADMIN` usa `/access-control` e `/users`
- **THEN** o backend SHALL permitir

### Requirement: Catálogo de telas reflete o enforcement real

O `SCREEN_CATALOG` SHALL conter apenas telas cujo acesso é efetivamente aplicado pelo backend com as permissões declaradas. A tela "Usuários" SHALL refletir sua guarda real (papel administrativo) e não induzir que `users.*` concedidas destravam a tela. Telas sem enforcement de backend SHALL ser removidas ou corrigidas.

#### Scenario: Conceder "Usuários" a não-admin não dá acesso

- **WHEN** um admin concede a tela "Usuários" (VIEW/EDIT) a um não-admin
- **THEN** o não-admin NÃO SHALL obter acesso a `/users` nem a `/access-control` (a guarda real é o papel admin), e a UI NÃO SHALL sugerir o contrário

### Requirement: Remoção da tela fantasma "Famílias"

A tela "Famílias" do catálogo (permissões `families.read`/`families.update`) SHALL ser removida ou remapeada, pois nenhum endpoint a aplica — o domínio real de famílias é `tops.families.*`, sob a tela TOPs. Conceder/negar essa tela NÃO SHALL ter efeito silencioso.

**Reason**: `families.read`/`families.update` são semeadas e concedíveis, mas nenhum controller as consome; o domínio real vive em `tops.families.*`.
**Migration**: Remover a entrada `families` do `SCREEN_CATALOG`; avaliar limpeza aditiva das permissions `families.*` no seed (sem quebrar concessões existentes). O acesso a famílias de TOP permanece via tela TOPs.

#### Scenario: Catálogo não expõe a tela fantasma

- **WHEN** o admin abre o Controle de Acessos
- **THEN** a lista de telas NÃO SHALL conter "Famílias" como tela independente (o gerenciamento de famílias SHALL estar sob TOPs)
