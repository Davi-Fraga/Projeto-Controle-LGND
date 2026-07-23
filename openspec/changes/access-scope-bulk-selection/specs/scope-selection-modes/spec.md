## ADDED Requirements

### Requirement: Estado de seleção explícito por dimensão
O sistema MUST representar, para cada par usuário/tipo de escopo, exatamente um
dos estados `MISSING`, `SELECTED` ou `ALL`, sem usar identificadores sentinela.

#### Scenario: Ausência permanece fail-closed
- **WHEN** um usuário não administrador não possui política explícita, valores explícitos nem valores derivados para um tipo
- **THEN** o estado efetivo desse tipo MUST ser `MISSING`
- **AND** os recursos dependentes exclusivamente desse tipo MUST ser negados

#### Scenario: Seleção explícita possui ao menos um valor
- **WHEN** o estado configurado de um tipo é `SELECTED`
- **THEN** MUST existir ao menos um valor válido e único para o mesmo usuário e tipo

#### Scenario: Todos não armazena IDs sentinela
- **WHEN** o estado configurado de um tipo é `ALL`
- **THEN** o sistema MUST persistir a intenção em uma política própria
- **AND** MUST NOT criar `UserScope` com valor especial, curinga ou sentinela
- **AND** MUST NOT manter valores explícitos do mesmo tipo

### Requirement: Todos inclui registros futuros
O estado `ALL` MUST abranger qualquer entidade válida da dimensão no momento da
autorização, incluindo entidades criadas depois da configuração.

#### Scenario: Entidade criada após a concessão
- **GIVEN** um usuário com `CHURCH=ALL` e permissão para visualizar Igrejas
- **WHEN** uma nova igreja é cadastrada após a concessão
- **THEN** o usuário MUST conseguir visualizá-la sem nova alteração no Controle de Acesso

#### Scenario: Todos não depende do endpoint de opções
- **WHEN** uma dimensão é configurada como `ALL`
- **THEN** a API MUST NOT materializar a lista retornada pelo endpoint paginado de opções

### Requirement: Escopo não concede permissão
O modo de escopo MUST controlar somente o conjunto de dados de uma dimensão e
MUST permanecer subordinado à permissão da tela e da ação.

#### Scenario: Todos sem permissão de tela
- **GIVEN** um usuário com `TEAM=ALL` sem a permissão de leitura da tela Equipes
- **WHEN** ele chama a API de Equipes
- **THEN** a API MUST responder `403`

#### Scenario: Todos não eleva o papel
- **WHEN** um usuário `MEMBER` recebe `CITY=ALL`
- **THEN** seu papel MUST continuar `MEMBER`
- **AND** ele MUST continuar impedido de acessar `/access-control`
- **AND** ele MUST NOT adquirir `users.update` nem capacidade de gerar link de redefinição de senha

#### Scenario: Todos não concede escrita implicitamente
- **GIVEN** um usuário com `CHURCH=ALL` e apenas permissão de leitura de Igrejas
- **WHEN** ele tenta alterar uma igreja
- **THEN** a API MUST responder `403`

### Requirement: Composição com escopos derivados do papel
O sistema MUST calcular o estado efetivo pela composição da política explícita
com os vínculos derivados do papel, sem permitir que a edição explícita remova
um vínculo derivado.

#### Scenario: Derivado satisfaz configuração ausente
- **GIVEN** um usuário sem escopo explícito de Equipe e com uma equipe derivada de seu papel
- **WHEN** sua política efetiva é carregada
- **THEN** `configuredMode` MUST ser `MISSING`
- **AND** `effectiveMode` MUST ser `SELECTED`
- **AND** a equipe derivada MUST aparecer em `effectiveValues` com origem `ROLE_DERIVED`

#### Scenario: Selecionados explícitos e derivados formam união
- **GIVEN** um usuário com uma equipe explícita e outra equipe derivada
- **WHEN** sua política efetiva é carregada
- **THEN** ambas MUST aparecer uma única vez em `effectiveValues`
- **AND** suas origens MUST ser identificáveis

#### Scenario: Todos explícito domina a dimensão
- **GIVEN** um usuário com `TEAM=ALL` e vínculos derivados de equipe
- **WHEN** sua política efetiva é carregada
- **THEN** `effectiveMode` MUST ser `ALL`
- **AND** os vínculos derivados MUST NOT restringir a dimensão

### Requirement: Semântica única entre filtros e asserts
Para cada dimensão, builders de consulta, contadores e asserts por identificador MUST consumir a mesma política efetiva.

#### Scenario: Dimensão ausente
- **GIVEN** um usuário não administrador com estado efetivo `MISSING`
- **WHEN** uma listagem e uma consulta direta da dimensão são executadas
- **THEN** a listagem MUST retornar nenhum dado
- **AND** a consulta direta MUST negar o recurso conforme o contrato seguro daquele endpoint

#### Scenario: Dimensão selecionada
- **GIVEN** um usuário com estado efetivo `SELECTED`
- **WHEN** ele lista dados e consulta identificadores da dimensão
- **THEN** somente os IDs efetivos MUST ser retornados ou permitidos
- **AND** um identificador fora do escopo MUST resultar em `404` nos endpoints endurecidos contra IDOR

#### Scenario: Dimensão todos
- **GIVEN** um usuário com estado efetivo `ALL` e a permissão necessária
- **WHEN** ele lista dados e consulta identificadores da dimensão
- **THEN** a dimensão MUST NOT adicionar predicado restritivo por IDs
- **AND** qualquer identificador existente da dimensão MUST passar pela verificação de escopo

### Requirement: Semântica de Todos os Legendários
O sistema MUST representar “Todos os Legendários” por geografia completa
(`CITY=ALL`) e MUST NOT introduzir um tipo de escopo `LEGENDARY`.

#### Scenario: Todos os Legendários
- **GIVEN** um usuário com permissão para visualizar Legendários
- **WHEN** `CITY` é configurado como `ALL`
- **THEN** a listagem de Legendários MUST incluir todos os registros permitidos pela dimensão geográfica
- **AND** novos Legendários MUST ser incluídos sem reconfiguração

#### Scenario: Geografia compartilhada não concede novas telas
- **GIVEN** um usuário com `CITY=ALL` e sem permissão de Mapa
- **WHEN** ele tenta acessar a API de Mapa
- **THEN** a API MUST responder `403`

#### Scenario: Equipe é suplementar para Legendários
- **GIVEN** um usuário cuja única dimensão efetiva é `TEAM=SELECTED`
- **WHEN** o sistema calcula se a tela Legendários possui escopo principal
- **THEN** `TEAM` MUST NOT satisfazer sozinho o requisito geográfico da listagem

### Requirement: Escopo completo é específico da dimensão
Cada modo `ALL` MUST afetar apenas seu próprio `UserScopeType`, sem inferência
cross-type não especificada.

#### Scenario: Todas as igrejas
- **GIVEN** um usuário com `CHURCH=ALL` e permissão de Igrejas
- **WHEN** ele usa a listagem ou consulta uma igreja existente por ID
- **THEN** todas as igrejas MUST ser autorizadas pela dimensão Igreja

#### Scenario: Todas as equipes
- **GIVEN** um usuário com `TEAM=ALL` e permissão de Equipes
- **WHEN** ele usa a listagem ou consulta uma equipe existente por ID
- **THEN** todas as equipes MUST ser autorizadas pela dimensão Equipe

#### Scenario: Todos os TOPs
- **GIVEN** um usuário com `TOP=ALL` e permissão de TOPs
- **WHEN** ele usa a listagem ou consulta um TOP existente por ID
- **THEN** todos os TOPs MUST ser autorizados pela dimensão TOP

#### Scenario: Cidade não libera Igrejas implicitamente
- **GIVEN** um usuário com `CITY=ALL` e `CHURCH=MISSING`
- **WHEN** ele acessa a listagem de Igrejas
- **THEN** a dimensão Igreja MUST continuar fail-closed

### Requirement: scopeMissing usa escopo efetivo e satisfatório
O indicador `scopeMissing` MUST considerar as dimensões que satisfazem a tela e
o estado efetivo, incluindo escopos derivados do papel.

#### Scenario: Tela sem dimensão satisfatória
- **GIVEN** uma tela concedida e todas as suas dimensões satisfatórias em estado efetivo `MISSING`
- **WHEN** o contrato do Controle de Acesso é montado
- **THEN** `scopeMissing` MUST ser `true`

#### Scenario: Escopo derivado satisfaz a tela
- **GIVEN** uma tela concedida e uma dimensão satisfatória provida somente pelo papel
- **WHEN** o contrato do Controle de Acesso é montado
- **THEN** `scopeMissing` MUST ser `false`

#### Scenario: Todos satisfaz a tela
- **GIVEN** uma tela concedida e uma de suas dimensões satisfatórias em `ALL`
- **WHEN** o contrato do Controle de Acesso é montado
- **THEN** `scopeMissing` MUST ser `false`

#### Scenario: Escopo suplementar não mascara ausência
- **GIVEN** a tela Legendários concedida, `TEAM=SELECTED` e `CITY`/`CHURCH` efetivamente ausentes
- **WHEN** o contrato do Controle de Acesso é montado
- **THEN** `scopeMissing` MUST ser `true`

### Requirement: Migração preserva a semântica atual
A migração MUST converter escopos explícitos existentes para `SELECTED` sem
ampliar ou remover acesso.

#### Scenario: Backfill de valores existentes
- **GIVEN** um usuário com um ou mais `UserScope` existentes para um tipo
- **WHEN** a migração é aplicada
- **THEN** MUST existir uma única política `SELECTED` para o par usuário/tipo
- **AND** todos os valores existentes MUST ser preservados

#### Scenario: Usuário sem valores
- **GIVEN** um usuário sem `UserScope` para um tipo
- **WHEN** a migração é aplicada
- **THEN** nenhuma política `ALL` ou `SELECTED` MUST ser criada para esse tipo
- **AND** o estado MUST continuar `MISSING`

#### Scenario: Backfill idempotente
- **WHEN** a rotina segura de backfill é executada novamente
- **THEN** ela MUST NOT criar políticas duplicadas nem alterar os valores
