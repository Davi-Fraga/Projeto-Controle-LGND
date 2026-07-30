# access-control-screen-catalog Specification

## Purpose
Paridade canônica entre as abas primárias do dashboard, o catálogo do Controle de Acessos e as permissions efetivas: cobertura das telas concedíveis, a permission independente de Líderes Espirituais, níveis, escopos, compatibilidade de migração, invariantes de paridade e a exclusão intencional de superfícies administrativas perigosas.

## Requirements

### Requirement: Catálogo canônico cobre todas as abas primárias
O sistema SHALL manter uma identidade estável para cada aba navegável de primeiro nível do dashboard. As 11 abas concedíveis atuais — Painel, Legendários, Equipes, Líderes Espirituais, Mapa, TOPs, Organograma, Ações Sociais, Comunicação, Relatórios e Igrejas — SHALL corresponder, cada uma, a exatamente uma entrada do catálogo do Controle de Acessos. Usuários SHALL ser uma exceção administrativa explícita, fora do catálogo concedível e protegida por `COORDINATION_ADMIN`. `families` e outras telas sem superfície navegável SHALL NOT permanecer como entradas fantasmas.

#### Scenario: Administrador abre o Controle de Acessos
- **WHEN** o administrador consulta o Controle de Acessos de um usuário
- **THEN** todas as 11 abas primárias concedíveis possuem uma entrada correspondente no catálogo retornado, incluindo Líderes Espirituais
- **AND** Usuários e Famílias não aparecem como telas concedíveis

#### Scenario: Identidades não são duplicadas
- **WHEN** o catálogo e o manifesto de navegação são validados
- **THEN** cada `screenId` e cada rota primária são únicos e apontam para uma única definição de tela

#### Scenario: Exceção administrativa não vira grant
- **WHEN** o manifesto e o catálogo são comparados
- **THEN** Usuários está declarada como rota administrativa e não como entrada concedível
- **AND** `users.read` ou `users.update` residual não torna a tela disponível a não-admin

#### Scenario: Tela fantasma é rejeitada
- **WHEN** uma entrada sem superfície navegável, como Famílias, é adicionada ao catálogo concedível
- **THEN** a verificação de paridade falha

### Requirement: Líderes Espirituais é uma tela independente e somente leitura
O catálogo SHALL declarar a tela `spiritual-leaders`, com rótulo “Líderes Espirituais”, `view = [spiritual-leaders.read]`, nenhum conjunto `edit` e `scopeTypes = [CHURCH]`. A tela SHALL oferecer apenas os níveis Sem acesso e Ver. Alterar seu nível SHALL manipular somente a permission dedicada e SHALL NOT alterar o nível da tela Igrejas.

#### Scenario: Linha aparece no painel
- **WHEN** o administrador abre o Controle de Acessos de qualquer usuário
- **THEN** vê “Líderes Espirituais” com opções Sem acesso e Ver e com seletor de escopo Igreja quando o nível Ver estiver ativo

#### Scenario: Conceder Líderes não concede Igrejas
- **WHEN** o administrador define Líderes Espirituais como Ver para um usuário que não possui Igrejas
- **THEN** `spiritual-leaders.read` torna-se efetiva e `churches.read`/`churches.update` permanecem não efetivas

#### Scenario: Conceder Igrejas não concede Líderes
- **WHEN** o administrador define Igrejas como Ver ou Ver e editar
- **THEN** as permissions `churches.*` correspondentes são atualizadas e `spiritual-leaders.read` não é alterada

#### Scenario: EDIT enviado para tela somente leitura
- **WHEN** um cliente envia nível EDIT para `spiritual-leaders`
- **THEN** o backend normaliza o estado para VIEW e não cria permission de mutação implícita

### Requirement: Endpoint de Líderes exige a permission dedicada
`GET /churches/spiritual-leaders` SHALL exigir `spiritual-leaders.read` por meio de `JwtAuthGuard` e `PermissionsGuard`. Os demais endpoints de Igrejas SHALL continuar exigindo suas permissions `churches.*`. A API SHALL avaliar permissions efetivas por requisição e SHALL NOT usar papel ou visibilidade do menu como substituto.

#### Scenario: Permission dedicada autoriza a view
- **WHEN** um usuário autenticado com `spiritual-leaders.read` consulta `GET /churches/spiritual-leaders`
- **THEN** o guard permite a operação e o service retorna somente dados dentro do escopo efetivo

#### Scenario: churches.read isolada não autoriza a view
- **WHEN** um usuário possui `churches.read`, mas não `spiritual-leaders.read`, e chama o endpoint de Líderes Espirituais
- **THEN** a API responde 403

#### Scenario: Permission de Líderes não autoriza Igrejas
- **WHEN** um usuário possui `spiritual-leaders.read`, mas não `churches.read`, e chama `GET /churches` ou `GET /churches/:id`
- **THEN** a API responde 403

#### Scenario: Papel não substitui concessão
- **WHEN** um usuário possui a função `SPIRITUAL_LEADER`, mas não possui `spiritual-leaders.read`
- **THEN** a API responde 403 para a view, ainda que a função possa contribuir com escopo organizacional quando a tela for concedida

### Requirement: Líderes Espirituais respeita escopo de Igreja no backend
Depois da autorização por permission, a view SHALL resolver o escopo pelo `AccessPolicyService` e aplicar `buildChurchWhere` antes de pesquisar ou retornar Igrejas. Busca, ID direto ou manipulação do frontend SHALL NOT ampliar o conjunto autorizado. Administrador SHALL permanecer irrestrito; não-admin sem igreja efetiva SHALL receber conjunto vazio.

#### Scenario: Usuário com uma Igreja
- **WHEN** um usuário com `spiritual-leaders.read` possui escopo efetivo somente na Igreja A
- **THEN** a view retorna a Igreja A e não retorna a Igreja B

#### Scenario: Busca não amplia escopo
- **WHEN** o mesmo usuário pesquisa pelo nome do líder ou da Igreja B
- **THEN** a Igreja B não é retornada, ainda que corresponda ao termo

#### Scenario: Líder com escopo derivado da função
- **WHEN** um usuário `SPIRITUAL_LEADER` recebe `spiritual-leaders.read` e está vinculado por `Church.spiritualLeaderUserId`
- **THEN** a view pode retornar sua Igreja vinculada mesmo sem `UserScope(CHURCH)` explícito

#### Scenario: Não-admin sem igreja efetiva
- **WHEN** um não-admin possui `spiritual-leaders.read`, mas não possui Igreja explícita nem derivada da função
- **THEN** a view retorna conjunto vazio e nunca todas as Igrejas

### Requirement: Elegibilidade de escopo deriva das telas concedidas
O backend SHALL aceitar um tipo de `UserScope` quando existir ao menos uma tela efetivamente concedida cujo `scopeTypes` contenha esse tipo. A validação SHALL ser derivada do catálogo e SHALL NOT depender de uma única permission hardcoded por tipo. O valor do escopo SHALL continuar sendo uma entidade real e válida do backend.

#### Scenario: Escopo CHURCH com apenas Líderes
- **WHEN** o administrador adiciona uma Igreja real a um usuário que possui `spiritual-leaders.read`, mas não `churches.read`
- **THEN** o backend aceita o escopo CHURCH

#### Scenario: Nenhuma tela compatível concedida
- **WHEN** o administrador tenta adicionar CHURCH a um usuário sem nenhuma tela concedida que suporte CHURCH
- **THEN** o backend responde 400 e não cria o escopo

#### Scenario: Igreja inexistente
- **WHEN** o administrador tenta adicionar um identificador de Igreja inexistente
- **THEN** o backend responde 400, ainda que uma tela compatível esteja concedida

#### Scenario: Nova tela reutiliza tipo existente
- **WHEN** uma futura tela declarada no catálogo suporta um tipo de escopo existente e seu conjunto VIEW está efetivo
- **THEN** a elegibilidade desse tipo funciona sem adicionar uma permission a outro mapa hardcoded

### Requirement: Escopos permanecem compartilhados por dimensão e são descritos honestamente
Os escopos SHALL continuar associados ao usuário por `type + value` e SHALL ser reutilizados por todas as telas concedidas que consumam a mesma dimensão. O painel SHALL NOT afirmar que ausência de escopo explícito concede acesso global a não-admin. Ele SHALL informar que o acesso efetivo depende também da função e da policy do backend.

#### Scenario: Igreja compartilhada entre telas
- **WHEN** um usuário possui Igrejas e Líderes Espirituais e recebe um `UserScope(CHURCH, igreja-a)`
- **THEN** o mesmo chip aparece nas linhas aplicáveis e a Igreja A restringe ambas as consultas conforme suas policies

#### Scenario: Nenhum escopo explícito
- **WHEN** uma tela escopável está concedida e `screen.scopes` está vazio
- **THEN** o painel exibe texto que não promete acesso irrestrito e o backend continua aplicando escopos derivados/fail-closed

### Requirement: Migração preserva acesso efetivo sem transformar função em acesso
A introdução de `spiritual-leaders.read` SHALL ser aditiva e idempotente. A permission SHALL existir antes do novo endpoint entrar em produção e SHALL integrar o acesso total de `COORDINATION_ADMIN`. Não-admin que possuía `GRANT churches.read` — e portanto podia consultar a view antiga — SHALL receber `GRANT spiritual-leaders.read`; papéis não-admin sem concessão efetiva SHALL NOT receber acesso automaticamente.

#### Scenario: Usuário não-admin com acesso antigo efetivo
- **WHEN** a migração encontra um não-admin com override GRANT de `churches.read`
- **THEN** cria, se ausente, um override GRANT de `spiritual-leaders.read` para preservar a view já utilizável

#### Scenario: Usuário via papel apenas
- **WHEN** a migração encontra um não-admin cujo papel listava `churches.read`, mas sem concessão efetiva por usuário
- **THEN** não cria acesso novo apenas por causa do papel

#### Scenario: Administrador
- **WHEN** a nova permission é semeada
- **THEN** o papel `COORDINATION_ADMIN` recebe seu vínculo idempotente e mantém acesso total

#### Scenario: Reexecução
- **WHEN** migration/seed/backfill são executados novamente
- **THEN** não surgem permissions, vínculos de papel ou overrides duplicados e nenhum nível já configurado é sobrescrito

### Requirement: Mudanças da nova tela permanecem auditáveis
As alterações de nível e escopo relacionadas a Líderes Espirituais SHALL reutilizar a auditoria genérica do Controle de Acessos, registrando ator, usuário alvo, tela/nível ou tipo/valor de escopo. A nova permission SHALL NOT criar um caminho de alteração fora do serviço canônico.

#### Scenario: Administrador concede a tela
- **WHEN** o administrador altera Líderes Espirituais de NONE para VIEW
- **THEN** o sistema registra `UserScreenAccess` com usuário alvo, `screen = spiritual-leaders`, nível efetivo e ator

#### Scenario: Administrador adiciona Igreja
- **WHEN** o administrador adiciona um escopo CHURCH válido
- **THEN** o sistema registra a alteração de `UserScope` pelo fluxo de auditoria existente
