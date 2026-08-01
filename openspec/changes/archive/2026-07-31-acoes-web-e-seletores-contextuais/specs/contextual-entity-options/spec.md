## ADDED Requirements

### Requirement: Operação contextual não exige leitura da tela global
Quando uma operação autorizada precisar selecionar uma entidade de outro domínio, o sistema MUST fornecer um contrato contextual protegido pela permission da operação de destino, sem exigir automaticamente a permission de leitura da tela global da entidade.

#### Scenario: Adicionar membro sem tela Legendários
- **GIVEN** um usuário com `teams.members.add`, acesso efetivo à Equipe e sem `legendarios.read`
- **WHEN** ele busca candidatos para adicionar à Equipe
- **THEN** o endpoint contextual pode retornar opções mínimas elegíveis
- **AND** o usuário continua impedido de abrir a tela ou detalhe de Legendários

#### Scenario: Permission da operação ausente
- **GIVEN** um usuário sem a permission de adicionar ou atualizar o sub-recurso
- **WHEN** ele chama o endpoint contextual
- **THEN** a API retorna `403`

### Requirement: Recurso-pai é validado antes das opções
Todo endpoint contextual MUST validar o recurso-pai e seu escopo antes de consultar candidatos.

#### Scenario: TOP fora do escopo
- **GIVEN** um usuário com permission de participantes e um TOP fora de seu escopo
- **WHEN** ele busca candidatos usando o `topId`
- **THEN** a API retorna `404`
- **AND** nenhuma opção é retornada

#### Scenario: Ação Social permitida
- **GIVEN** uma Ação Social dentro da geografia efetiva e permission para adicionar participante
- **WHEN** o usuário busca candidatos
- **THEN** a busca é executada no contexto autorizado da ação

### Requirement: Opções contextuais são mínimas e pesquisáveis
Respostas contextuais MUST ser paginadas ou limitadas, MUST exigir busca conforme o volume do diretório e MUST retornar somente ID, rótulo e metadados indispensáveis à decisão.

#### Scenario: Resposta de Legendário
- **WHEN** uma opção contextual de Legendário é retornada
- **THEN** ela pode conter ID, nome, número LGND e estado necessário
- **AND** não contém email, telefone, nascimento, endereço, notas ou objeto Prisma completo

#### Scenario: Busca limitada
- **WHEN** o cliente pesquisa candidatos
- **THEN** o servidor aplica limite máximo e ordenação determinística
- **AND** não carrega a coleção completa no browser

### Requirement: Elegibilidade segue o contexto de negócio
O conjunto candidato MUST ser limitado pela regra da operação e MUST excluir registros inativos, já vinculados ou incompatíveis quando aplicável.

A geografia do recurso-pai MUST NOT restringir candidatos: participação em TOP e em Ação Social independe da cidade do Legendário. Cidade MAY ser oferecida como filtro explícito do cliente.

#### Scenario: Candidato de TOP ou Ação Social
- **GIVEN** um TOP ou Ação Social com cidade definida
- **WHEN** candidatos Legendários são pesquisados sem filtro explícito de cidade
- **THEN** candidatos de qualquer cidade dentro do escopo do usuário são retornados
- **AND** a cidade do pai não é aplicada como filtro

#### Scenario: Filtro de cidade pedido pelo cliente
- **GIVEN** um cliente que envia `city` na busca de candidatos
- **WHEN** a consulta é executada
- **THEN** somente candidatos dessa cidade são retornados

#### Scenario: Membro de Equipe
- **GIVEN** um usuário autorizado a adicionar membros à Equipe
- **WHEN** ele pesquisa no diretório mínimo de Legendários ativos
- **THEN** candidatos já ativos na Equipe são excluídos
- **AND** a resposta mínima não concede acesso ao perfil

#### Scenario: Equipe candidata para TOP
- **WHEN** uma equipe é pesquisada para vinculação a TOP
- **THEN** somente os campos mínimos da Equipe necessários à vinculação são retornados

### Requirement: Contratos compatíveis são reutilizados
Antes de criar um endpoint contextual, a implementação MUST inventariar endpoints existentes e MUST reutilizá-los quando permission, escopo, elegibilidade e projeção já forem compatíveis.

#### Scenario: Endpoint existente compatível
- **GIVEN** um endpoint existente que satisfaz integralmente o contexto
- **WHEN** o formulário é migrado
- **THEN** nenhum endpoint duplicado é criado

#### Scenario: Endpoint global incompatível
- **GIVEN** um endpoint que exige `legendarios.read` ou expõe dados mais amplos que a operação
- **WHEN** o formulário depende apenas de uma permission contextual
- **THEN** o endpoint global não é usado como atalho

### Requirement: Componentes canônicos de autocomplete são preservados
Formulários contextuais MUST usar `LegendarioCombobox` ou `AsyncCombobox` conforme o tipo e MUST NOT introduzir carregamento integral ou entrada manual de UUID.

#### Scenario: Seletor contextual
- **WHEN** um endpoint contextual é conectado ao formulário
- **THEN** o componente mantém debounce, loading, estado vazio e proteção contra respostas fora de ordem

### Requirement: User e Legendary permanecem tipos distintos
Seletores de `User` MUST NOT ser substituídos por opções de `Legendary`, e campos de `Legendary` MUST NOT persistir identificadores de `User`.

#### Scenario: Líder espiritual de login
- **GIVEN** o campo `spiritualLeaderUserId`
- **WHEN** o formulário de Igreja carrega opções
- **THEN** utiliza usuários elegíveis
- **AND** não trata o campo como `legendaryId`
