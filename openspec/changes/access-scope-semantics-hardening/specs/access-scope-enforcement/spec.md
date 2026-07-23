## ADDED Requirements

### Requirement: Semântica única de escopo vazio é fail-closed

O `AccessPolicyService` SHALL tratar "não-admin sem escopo do tipo aplicável" como **vê nada** (fail-closed) de forma **uniforme**, tanto nos filtros de lista (`build*Where`) quanto nas barreiras por-id (`assert*Allowed`). Um usuário restrito (não-admin) SHALL ser considerado restrito **mesmo quando não possui nenhum escopo daquele tipo** — a ausência de escopo NÃO SHALL significar acesso irrestrito. Só `COORDINATION_ADMIN` SHALL ter escopo irrestrito.

#### Scenario: Lista sem escopo retorna vazio

- **WHEN** um não-admin com a permissão de leitura de uma entidade, mas sem escopo do(s) tipo(s) aplicável(is), lista essa entidade
- **THEN** o backend SHALL retornar conjunto vazio (nenhum registro)

#### Scenario: Detalhe por id sem escopo é negado

- **WHEN** um não-admin sem escopo do tipo aplicável acessa o detalhe de um registro por id direto (URL/API)
- **THEN** o backend SHALL negar com 404/403 (não SHALL liberar o registro)

#### Scenario: Escopo que não casa retorna vazio

- **WHEN** um não-admin tem escopo daquele tipo mas nenhum registro casa com os valores do escopo
- **THEN** o backend SHALL retornar vazio na lista e negar no detalhe por id

#### Scenario: Administrador permanece irrestrito

- **WHEN** um usuário `COORDINATION_ADMIN` acessa qualquer lista ou detalhe
- **THEN** o backend SHALL retornar todos os registros, sem filtro de escopo

### Requirement: Barreira de IDOR por recurso é fail-closed no backend

Toda rota de detalhe/mutação por id de recurso escopável SHALL aplicar a barreira de escopo no **backend** (não só na UI), retornando 403/404 quando o id está fora do escopo do usuário. Isso SHALL incluir Igrejas (`findOne`/`update`), TOPs e sub-recursos (guard de escopo), e o Organograma. A barreira SHALL ser fail-closed conforme a semântica única.

#### Scenario: Detalhe de igreja fora do escopo é negado

- **WHEN** um não-admin com `churches.read` e sem escopo (ou com escopo que não inclui a igreja) faz `GET /churches/:id` de uma igreja qualquer
- **THEN** o backend SHALL negar com 404/403

#### Scenario: Edição de igreja fora do escopo é negada

- **WHEN** um não-admin com `churches.update` faz `PATCH /churches/:id` de uma igreja fora do seu escopo
- **THEN** o backend SHALL negar com 404/403 e não SHALL alterar o registro

#### Scenario: TOP por id sem escopo de TOP é negado

- **WHEN** um não-admin com `tops.read` e sem escopo de TOP faz `GET /tops/:id` (ou sub-recurso: famílias/participantes/servos) por id direto
- **THEN** o `TopScopeGuard` SHALL negar com 403 (não SHALL liberar por ausência de escopo)

#### Scenario: Legendário fora do escopo permanece negado

- **WHEN** um não-admin faz `GET /legendarios/:id` de um legendário fora do seu escopo
- **THEN** o backend SHALL retornar 404 (comportamento seguro já existente, mantido)

### Requirement: Autorização do dashboard por contador respeita permissão de tela e escopo

O `GET /dashboard/summary` SHALL resolver, para **cada contador**, tanto a **permissão de tela** da entidade correspondente quanto o **escopo** do usuário. Um contador de uma entidade cuja tela o usuário NÃO tem permissão de ver SHALL ser omitido ou zerado — NUNCA SHALL retornar a contagem global. Nenhum contador SHALL permanecer sem filtro de escopo para não-admin.

#### Scenario: Contador de entidade sem permissão de tela não vaza

- **WHEN** um usuário sem `tops.read` carrega o Painel
- **THEN** o contador de TOPs (e de Famílias de TOP) SHALL ser omitido/zerado, sem revelar a contagem global

#### Scenario: Expertises deixa de vazar globalmente

- **WHEN** um não-admin sem a permissão/escopo aplicável carrega o Painel
- **THEN** o contador de Expertises NÃO SHALL retornar a contagem global (SHALL ser escopado, omitido ou zerado conforme a regra da tela)

#### Scenario: Contador visível mas escopado a zero é distinguível de sem-acesso

- **WHEN** um usuário com `legendarios.read` e escopo que não casa carrega o Painel
- **THEN** o contador de Legendários SHALL aparecer com valor 0 (tem acesso, escopo vazio) — enquanto entidades sem permissão de tela SHALL ser omitidas

#### Scenario: Admin vê todos os contadores globais

- **WHEN** um `COORDINATION_ADMIN` carrega o Painel
- **THEN** todos os contadores SHALL refletir os totais globais

### Requirement: Telas legitimamente globais são isentas de escopo

O modelo de acesso SHALL declarar explicitamente o conjunto de telas **globais** (sem recorte de dados, `scopeTypes: []`) isentas da exigência de escopo: **Painel (dashboard)**, **Comunicação (communications)** e **Usuários (users)**. Todas as demais telas com `scopeTypes` não-vazio SHALL ser escopáveis e sujeitas à exigência de escopo ao serem concedidas.

#### Scenario: Conceder tela global sem escopo é válido

- **WHEN** um admin concede a um usuário a tela Comunicação em VIEW/EDIT sem atribuir escopo
- **THEN** o sistema SHALL aceitar, e o usuário SHALL ver os dados globais daquela tela

#### Scenario: Conceder tela escopável sem escopo é estado inválido

- **WHEN** um admin concede uma tela escopável (ex.: Legendários) sem nenhum escopo
- **THEN** o backend SHALL sinalizar o estado como inválido/incompleto (sem escopo o usuário vê nada), conforme a exigência de escopo do fluxo de concessão

### Requirement: Distinção VER/EDITAR e restrição de criar/excluir ao admin

A distinção entre VIEW e EDIT SHALL ser aplicada no backend por permissões distintas, e as ações de **criar/excluir** de topo (TOP, Equipe, Igreja, Ação Social, Comunicação) SHALL permanecer restritas ao `COORDINATION_ADMIN` (fora do nível EDIT das telas).

#### Scenario: "Ver e editar" não permite criar

- **WHEN** um não-admin com a tela TOPs em nível EDIT tenta `POST /tops`
- **THEN** o backend SHALL negar (`tops.create` é admin), retornando 403

#### Scenario: "Ver e editar" edita apenas dentro do escopo

- **WHEN** um não-admin com a tela em nível EDIT edita um registro dentro do seu escopo
- **THEN** o backend SHALL permitir; e SHALL negar a edição de um registro fora do escopo
