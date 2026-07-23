## ADDED Requirements

### Requirement: Relatórios usam a geografia declarada da tela
Todos os conjuntos da tela Relatórios MUST ser subordinados à permission de relatório e ao escopo efetivo `CITY`, sem exigir `TEAM`, `CHURCH` ou `TOP` para produzir o recorte geográfico.

#### Scenario: Relatório por cidade selecionada
- **GIVEN** um usuário com `reports.read` e `CITY=SELECTED`
- **WHEN** ele consulta qualquer relatório operacional
- **THEN** somente registros relacionados às cidades efetivas contribuem para a resposta

#### Scenario: Geografia ausente
- **GIVEN** um usuário não administrador com `reports.read` e `CITY=MISSING`
- **WHEN** ele consulta relatórios
- **THEN** nenhum dado operacional é retornado

#### Scenario: Todas as cidades
- **GIVEN** um usuário com `reports.read` e `CITY=ALL`
- **WHEN** ele consulta relatórios
- **THEN** a geografia não adiciona restrição por cidade

### Requirement: Agregações de Igreja e Equipe contam somente Legendários visíveis
Relatórios agrupados por Igreja ou Equipe MUST calcular contagens a partir dos Legendários permitidos pela geografia do usuário e MUST NOT depender de um escopo `CHURCH` ou `TEAM` separado.

#### Scenario: Igreja com registros visíveis
- **GIVEN** uma Igreja com Legendários dentro e fora das cidades permitidas
- **WHEN** o relatório por Igreja é calculado
- **THEN** somente os Legendários geograficamente visíveis entram na contagem

#### Scenario: Grupo sem qualquer registro visível
- **GIVEN** uma Equipe ou Igreja sem Legendário visível para o usuário
- **WHEN** o relatório agrupado é retornado
- **THEN** o grupo não revela seu nome apenas com contagem zero

### Requirement: Relatórios por entidade validam a cidade do pai
Relatórios de participantes, servos e famílias de TOP MUST validar `TopEvent.city`; relatórios de participantes de Ação Social MUST validar `SocialAction.city`.

#### Scenario: TOP fora da geografia
- **GIVEN** um TOP fora das cidades efetivas do usuário
- **WHEN** o usuário informa seu `topId` em visualização ou exportação
- **THEN** a API retorna `404`

#### Scenario: Ação Social dentro da geografia
- **GIVEN** uma Ação Social dentro da cidade efetiva do usuário
- **WHEN** ele consulta participantes com `reports.read`
- **THEN** somente os dados autorizados da ação são retornados

### Requirement: Pendências são integralmente escopadas
O relatório de pendências MUST filtrar Legendários, TOPs, famílias e membros por relações que terminem na geografia efetiva do usuário.

#### Scenario: Pendências mistas
- **GIVEN** pendências dentro e fora das cidades efetivas
- **WHEN** o usuário consulta `pending-review`
- **THEN** somente itens geograficamente autorizados são retornados

#### Scenario: Família de TOP externo
- **GIVEN** uma família pendente cujo TOP está fora da geografia
- **WHEN** o relatório é consultado
- **THEN** a família, seus representantes e membros não aparecem

### Requirement: Exportação reutiliza a consulta autorizada
Cada exportação MUST reutilizar a mesma regra de escopo e seleção de dados da visualização correspondente e MUST exigir a permission de exportação adequada.

#### Scenario: Leitura permitida sem exportação
- **GIVEN** um usuário com `reports.read` sem `reports.export`
- **WHEN** ele chama um endpoint de exportação
- **THEN** a API retorna `403`

#### Scenario: Paridade entre tela e CSV
- **GIVEN** um usuário autorizado a visualizar e exportar um relatório
- **WHEN** ele consulta a tela e exporta o mesmo conjunto
- **THEN** o CSV não contém entidade que a consulta autorizada não retornaria
