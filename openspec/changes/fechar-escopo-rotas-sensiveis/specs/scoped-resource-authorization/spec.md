## ADDED Requirements

### Requirement: Filtros e asserts consomem a mesma política efetiva
Toda operação escopável MUST resolver a política efetiva pelo `AccessPolicyService` e MUST aplicar a mesma semântica de `MISSING`, `SELECTED`, `ALL` e valores derivados em listagem, detalhe, opção e mutação.

#### Scenario: Dimensão ausente
- **GIVEN** um usuário não administrador com a permission exigida e dimensão efetiva `MISSING`
- **WHEN** ele lista recursos e tenta consultar um identificador existente da dimensão
- **THEN** a listagem retorna nenhum recurso
- **AND** a consulta por identificador é negada sem revelar a existência do recurso

#### Scenario: Seleção explícita
- **GIVEN** um usuário com dimensão efetiva `SELECTED`
- **WHEN** ele acessa um ID selecionado e um ID não selecionado
- **THEN** o ID selecionado é permitido
- **AND** o ID não selecionado retorna `404`

#### Scenario: Dimensão completa
- **GIVEN** um usuário com dimensão efetiva `ALL` e a permission necessária
- **WHEN** ele consulta ou altera um recurso existente da dimensão
- **THEN** a policy não restringe a operação por lista de IDs

#### Scenario: Escopo derivado
- **GIVEN** um usuário cuja dimensão efetiva é satisfeita por vínculo derivado
- **WHEN** ele opera o recurso derivado
- **THEN** a operação segue a mesma regra aplicada a um valor explícito

### Requirement: Mutações de Equipes respeitam TEAM
Editar Equipe e adicionar, atualizar, inativar ou remover membresia MUST validar a Equipe pela dimensão `TEAM` antes de qualquer escrita. O ator de auditoria MUST ser obtido do mesmo `AuthenticatedUser`, sem substituir a validação de escopo.

#### Scenario: Editar equipe permitida
- **GIVEN** um usuário com `teams.update` e a Equipe no escopo efetivo
- **WHEN** ele altera a Equipe
- **THEN** a alteração é persistida e auditada

#### Scenario: Alterar membresia externa
- **GIVEN** um usuário com permissions de membros e uma Equipe fora do escopo
- **WHEN** ele tenta adicionar, atualizar, inativar ou remover uma membresia nessa Equipe
- **THEN** a API retorna `404`
- **AND** nenhuma membresia é alterada

#### Scenario: Todos os times na leitura de membros
- **GIVEN** um usuário não administrador com `TEAM=ALL` e `teams.members.read`
- **WHEN** ele lista membros de qualquer Equipe existente
- **THEN** a Equipe é aceita pela policy

### Requirement: Operações de Ações Sociais respeitam CITY
Ações Sociais, participantes e transições de estado MUST validar a cidade da ação pela policy efetiva antes de retornar ou alterar dados.

#### Scenario: Ação dentro da cidade
- **GIVEN** um usuário com a permission da operação e a cidade da Ação Social no escopo
- **WHEN** ele lê, altera, conclui, cancela ou administra um participante
- **THEN** a operação autorizada é executada

#### Scenario: Ação fora da cidade
- **GIVEN** um usuário com a permission da operação e uma Ação Social fora da geografia
- **WHEN** ele usa o ID conhecido da ação ou de seu participante
- **THEN** a API retorna `404`
- **AND** não revela dados da ação ou do participante

### Requirement: Sugestões de voluntários são escopadas e mínimas
O endpoint de sugestões MUST aplicar `buildLegendaryWhere` para o usuário corrente e MUST retornar somente os campos necessários à seleção.

#### Scenario: Sugestão geográfica
- **GIVEN** um usuário com `social-actions.read` e `CITY=SELECTED`
- **WHEN** ele busca sugestões de voluntários
- **THEN** somente Legendários permitidos pela geografia podem aparecer

#### Scenario: Contrato sem PII excedente
- **WHEN** uma sugestão é retornada
- **THEN** a resposta não contém email, telefone, nascimento, endereço, notas ou o objeto Prisma completo

### Requirement: Pré-inscrições herdam o escopo do TOP
Listagem, contagem, detalhe, aprovação, rejeição e exclusão de pré-inscrições MUST validar o TOP relacionado pela política efetiva.

#### Scenario: Listagem e contador escopados
- **GIVEN** um usuário com acesso a um subconjunto de TOPs
- **WHEN** ele lista pré-inscrições ou consulta contadores pendentes
- **THEN** somente os TOPs permitidos contribuem para a resposta

#### Scenario: Pré-inscrição externa por ID
- **GIVEN** uma pré-inscrição vinculada a TOP fora do escopo
- **WHEN** o usuário tenta consultar, aprovar, rejeitar ou excluir pelo ID
- **THEN** a API retorna `404`
- **AND** o estado permanece inalterado

### Requirement: Opções de TOP respeitam TOP
`GET /tops/options` MUST receber o usuário autenticado, aplicar a policy efetiva de TOP e retornar projeção mínima.

#### Scenario: Opções selecionadas
- **GIVEN** um usuário com `tops.read` e `TOP=SELECTED`
- **WHEN** ele busca opções de TOP
- **THEN** somente TOPs efetivamente selecionados são retornados

#### Scenario: Todos os TOPs
- **GIVEN** um usuário com `tops.read` e `TOP=ALL`
- **WHEN** ele busca opções
- **THEN** qualquer TOP compatível com a busca pode ser retornado
