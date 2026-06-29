## ADDED Requirements

### Requirement: Hierarquia de gestão persistida
O sistema SHALL persistir no banco os vínculos de gestão — quem gerencia quem — nos níveis de equipes (Coordenador→Sub-coordenadores→Integrantes) e de cidades (Gestor da Cidade→Líderes→Legendários). A hierarquia NÃO SHALL existir apenas na visualização do Organograma; o Organograma SHALL ser derivado desses vínculos persistidos.

#### Scenario: Vínculo registrado e refletido
- **WHEN** o admin define que um Integrante é gerido por um Sub-coordenador
- **THEN** o vínculo é persistido e o Organograma passa a refleti-lo

#### Scenario: Organograma derivado
- **WHEN** o Organograma é renderizado
- **THEN** sua estrutura vem dos vínculos persistidos, não de inferência só de visualização

### Requirement: Teto de 10 por gestor (admin isento)
O backend SHALL impedir que qualquer gestor seja responsável por mais de 10 pessoas. O limite de 10 SHALL ser um **teto máximo**, não um valor fixo. O **administrador** SHALL ser a única exceção (sem limite). Aplica-se a Sub-coordenador→Integrantes (≤10), Coordenador→Sub-coordenadores (≤10) e Líder→Legendários (≤10).

#### Scenario: Bloqueio ao exceder o teto
- **WHEN** uma atribuição faria um gestor passar de 10 pessoas
- **THEN** o backend recusa a operação

#### Scenario: Abaixo do teto é permitido
- **WHEN** um gestor tem menos de 10 pessoas e recebe mais uma
- **THEN** a atribuição é aceita

#### Scenario: Cidade com mais de 10 exige mais Líderes
- **WHEN** uma cidade tem 23 Legendários
- **THEN** é necessário ao menos 3 Líderes (ex.: 10 + 10 + 3), nenhum ultrapassando 10

### Requirement: Redistribuição manual entre gestores
O sistema SHALL permitir ao administrador **mover** manualmente pessoas entre gestores: reatribuir um Integrante de um Sub-coordenador para outro, e reatribuir um Legendário de um Líder para outro dentro da cidade. O backend SHALL impedir qualquer movimentação que ultrapasse o teto de 10, e a redistribuição NÃO SHALL deixar vínculos duplicados ou inconsistentes.

#### Scenario: Mover respeitando o teto
- **WHEN** o admin move um Legendário para um Líder que ainda tem espaço (≤10)
- **THEN** o vínculo anterior é substituído pelo novo, sem duplicar

#### Scenario: Mover violando o teto é bloqueado
- **WHEN** o admin tenta mover uma pessoa para um gestor que já tem 10
- **THEN** a operação é recusada

### Requirement: Modelo preservado e sem novas roles
A modelagem SHALL preservar os campos atuais `coordinatorLegendaryId` e `deputyCoordinatorLegendaryId` sem fundi-los. O sistema NÃO SHALL criar role separada para Sub-coordenador nem para Líder de cidade. O acesso ao Organograma SHALL respeitar o escopo por cidade do Gestor de Cidade (definido em `user-access-control`).

#### Scenario: Campos de coordenação preservados
- **WHEN** a hierarquia é modelada/migrada
- **THEN** `coordinatorLegendaryId` e `deputyCoordinatorLegendaryId` continuam existindo e distintos

#### Scenario: Escopo de cidade no Organograma
- **WHEN** um Gestor de Cidade abre o Organograma
- **THEN** vê apenas a hierarquia da(s) sua(s) cidade(s), conforme o escopo

### Requirement: Estado "sem gestor" e transições
O sistema SHALL tratar pessoas temporariamente **sem gestor** (durante cadastro ou redistribuição) de forma sinalizada, sem travar o cadastro. Na saída, troca de cidade ou indisponibilidade de um gestor, as pessoas sob ele SHALL voltar para o estado "sem gestor" para o admin redistribuir. (Decisões finais a confirmar no design.)

#### Scenario: Cadastro sem gestor não trava
- **WHEN** um Legendário é cadastrado antes de ter um Líder atribuído
- **THEN** ele fica sinalizado como "sem gestor" e o cadastro conclui normalmente

#### Scenario: Saída de gestor libera os geridos
- **WHEN** um Líder sai ou fica indisponível
- **THEN** seus Legendários voltam para "sem gestor" e ficam disponíveis para redistribuição
