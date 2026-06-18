## ADDED Requirements

### Requirement: Endpoint de organograma do TOP
O sistema SHALL expor `GET /tops/:id/org-chart?view=teams|families|cities`, protegido por `JwtAuthGuard` + `PermissionsGuard` exigindo `tops.read`, retornando `{ data: OrgChartNode }` com a árvore da visão pedida para o `topEventId`. A operação SHALL ser somente leitura (não altera nenhum dado).

#### Scenario: Requisição autorizada retorna a árvore
- **WHEN** um usuário com `tops.read` chama o endpoint com um `view` válido e um TOP existente
- **THEN** recebe `{ data }` com um nó raiz do TOP e seus descendentes da visão

#### Scenario: Sem permissão
- **WHEN** um usuário sem `tops.read` chama o endpoint
- **THEN** a requisição é negada pelo `PermissionsGuard` (403)

#### Scenario: View inválida
- **WHEN** o parâmetro `view` não é `teams`, `families` nem `cities`
- **THEN** a requisição é rejeitada com erro de validação (400)

### Requirement: Contrato normalizado da árvore
Todas as visões SHALL retornar o mesmo shape `OrgChartNode` com `id`, `kind`, `label`, `count`, `children[]` e, quando aplicável, `subtitle` e `leaderId`. Cada `id` de nó SHALL ser estável e único dentro da árvore.

#### Scenario: Shape consistente entre visões
- **WHEN** o cliente troca de visão (teams → families → cities)
- **THEN** a resposta segue o mesmo contrato `OrgChartNode`, permitindo um único renderizador

### Requirement: Visão Equipes
A visão `teams` SHALL montar a árvore TOP → coordenação geral → equipes (`TopTeam`) → servos (`TopServant`), com a equipe carregando seu coordenador como `leaderId`. Servos sem equipe SHALL aparecer sob um grupo "Sem equipe".

#### Scenario: Equipe com servos
- **WHEN** um TOP tem uma `TopTeam` com coordenador e servos vinculados
- **THEN** a árvore tem um nó da equipe (com `leaderId` = coordenador) e um nó-pessoa por servo daquela equipe

#### Scenario: Servo sem equipe
- **WHEN** existe um `TopServant` sem `teamId`
- **THEN** ele aparece sob um nó de grupo "Sem equipe"

### Requirement: Visão Chefes de Família
A visão `families` SHALL montar a árvore TOP → coordenação de famílias → famílias (`TopFamily`) → membros (`TopFamilyMember`), com a família carregando o representante (chefe) como `leaderId`.

#### Scenario: Família com membros
- **WHEN** um TOP tem uma `TopFamily` com representante e membros
- **THEN** a árvore tem um nó da família (com `leaderId` = representante) e um nó-pessoa por membro

#### Scenario: Família sem chefe
- **WHEN** uma `TopFamily` não tem representante
- **THEN** o nó da família é renderizado sem `leaderId` (líder ausente), tornando o buraco visível

### Requirement: Visão Cidades
A visão `cities` SHALL agrupar os `TopParticipant` do TOP pela cidade do `Legendary` (normalizada), produzindo TOP → cidade → pessoas. Participantes sem cidade SHALL aparecer sob "Sem cidade".

#### Scenario: Agrupamento por cidade
- **WHEN** participantes do TOP têm cidades em grafias equivalentes
- **THEN** eles são agrupados sob um único nó de cidade canônico

#### Scenario: Participante sem cidade
- **WHEN** um participante não tem cidade no cadastro do legendário
- **THEN** ele aparece sob o nó "Sem cidade"

### Requirement: Contador de pessoas por nó
Cada nó SHALL expor `count` igual ao número de descendentes do tipo pessoa sob ele, calculado no backend, e a UI SHALL exibir esse contador na "bolinha" do nó.

#### Scenario: Contador agregado
- **WHEN** um nó de equipe tem 5 servos
- **THEN** `count` do nó da equipe é 5 e a bolinha exibe 5

### Requirement: Cor por líder
A UI SHALL colorir um nó e sua subárvore de forma determinística a partir de `leaderId`, de modo que a mesma liderança tenha sempre a mesma cor. Nós sem `leaderId` SHALL usar uma cor neutra.

#### Scenario: Cor estável por líder
- **WHEN** dois nós compartilham o mesmo `leaderId`
- **THEN** ambos recebem a mesma cor

### Requirement: Navegação somente-leitura (zoom, pan, expandir/recolher)
A UI SHALL renderizar a árvore top-down e permitir zoom, pan e expandir/recolher subárvores, sem oferecer nenhuma ação de edição sobre os dados.

#### Scenario: Recolher subárvore
- **WHEN** o usuário recolhe um nó com filhos
- **THEN** os descendentes ficam ocultos e o nó indica que está recolhido (o `count` continua visível)

#### Scenario: Zoom e pan
- **WHEN** o usuário usa zoom/pan no canvas
- **THEN** a árvore é ampliada/movida sem alterar nenhum dado
