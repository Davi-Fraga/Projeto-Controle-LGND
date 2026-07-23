## ADDED Requirements

### Requirement: Acesso efetivo por tela é calculado no backend
O backend MUST calcular para cada tela concedível seu nível efetivo, sua usabilidade e o motivo de indisponibilidade usando permissions efetivas, `SCREEN_CATALOG` e policy efetiva de escopo.

#### Scenario: Permission ausente
- **GIVEN** um usuário sem todo o conjunto VIEW de uma tela
- **WHEN** seu acesso efetivo é calculado
- **THEN** o nível é `NONE`
- **AND** a tela não é utilizável por `MISSING_PERMISSION`

#### Scenario: Tela global concedida
- **GIVEN** uma tela sem dimensões de escopo e permission VIEW efetiva
- **WHEN** seu acesso é calculado
- **THEN** a tela é utilizável sem exigir scope

#### Scenario: Tela escopável sem dimensão satisfatória
- **GIVEN** uma tela em VIEW ou EDIT e todas as dimensões satisfatórias efetivamente `MISSING`
- **WHEN** seu acesso é calculado
- **THEN** a tela não é utilizável por `MISSING_SCOPE`

### Requirement: Usabilidade considera a policy efetiva
`SELECTED`, `ALL` e valores derivados MUST satisfazer a dimensão correspondente; dimensão suplementar sozinha MUST NOT satisfazer a tela.

#### Scenario: Seleção explícita satisfaz
- **GIVEN** uma tela concedida com uma dimensão satisfatória em `SELECTED`
- **WHEN** o acesso é calculado
- **THEN** a tela é utilizável

#### Scenario: Todos satisfaz
- **GIVEN** uma tela concedida com uma dimensão satisfatória em `ALL`
- **WHEN** o acesso é calculado
- **THEN** a tela é utilizável

#### Scenario: Vínculo derivado satisfaz
- **GIVEN** Equipes concedida e uma Equipe proveniente apenas da função organizacional
- **WHEN** o acesso é calculado
- **THEN** Equipes é utilizável

#### Scenario: Dimensão suplementar não satisfaz
- **GIVEN** Legendários concedida, `TEAM=SELECTED` e `CITY`/`CHURCH=MISSING`
- **WHEN** o acesso é calculado
- **THEN** Legendários não é utilizável

### Requirement: Contrato autenticado expõe acesso efetivo
Login, refresh e leitura do usuário corrente MUST retornar um contrato tipado de acesso efetivo suficiente para navegação e rotas, sem transformar esse contrato em autorização da API.

#### Scenario: Login bem-sucedido
- **WHEN** um usuário autentica
- **THEN** a resposta inclui o acesso efetivo às telas primárias

#### Scenario: Refresh após alteração de acesso
- **GIVEN** permissions ou scopes do usuário alterados
- **WHEN** a sessão é atualizada por refresh ou nova leitura de `/auth/me`
- **THEN** o contrato reflete o estado efetivo atual

#### Scenario: Cliente falsifica o contrato
- **WHEN** o cliente altera localmente uma tela para utilizável
- **THEN** guards e policies da API continuam negando qualquer operação não autorizada

### Requirement: Controle administrativo e sessão usam a mesma definição
O indicador administrativo `scopeMissing` e o contrato do próprio usuário MUST compartilhar a mesma avaliação de dimensões satisfatórias.

#### Scenario: Paridade de escopo ausente
- **GIVEN** uma tela concedida sem escopo satisfatório efetivo
- **WHEN** administrador e usuário consultam seus respectivos contratos
- **THEN** o painel marca `scopeMissing=true`
- **AND** a sessão marca a tela como não utilizável por `MISSING_SCOPE`

### Requirement: Exceções administrativas permanecem explícitas
A rota Usuários MUST continuar disponível somente para `COORDINATION_ADMIN` e MUST permanecer fora das telas concedíveis por permission.

#### Scenario: Permission residual de Usuários
- **GIVEN** um usuário não administrador com `users.read` ou `users.update` residual
- **WHEN** o acesso efetivo às rotas é calculado
- **THEN** Usuários não é utilizável
