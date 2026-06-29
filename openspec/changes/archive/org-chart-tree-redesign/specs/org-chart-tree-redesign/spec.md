## ADDED Requirements

### Requirement: Layout em árvore esquerda → direita (dagre)
O organograma SHALL posicionar os nós com um algoritmo de árvore (dagre) em orientação `rankdir: 'LR'` (raiz à esquerda, ramos abrindo à direita), com espaçamento configurável (`nodesep`/`ranksep`) que evite sobreposição. Os nós NÃO SHALL ser renderizados numa única fileira sem hierarquia.

#### Scenario: Árvore com vários níveis é posicionada hierarquicamente
- **WHEN** a árvore tem raiz, líderes e membros
- **THEN** a raiz aparece à esquerda, os líderes na coluna seguinte e os membros à direita, sem sobreposição

#### Scenario: Handles coerentes com a orientação
- **WHEN** uma aresta liga um nó-pai a um filho
- **THEN** ela sai pela direita do pai e entra pela esquerda do filho

### Requirement: Nível de líder explícito nas visões de equipe e família
As visões de **equipe** (global e por TOP) e de **família** (por TOP) SHALL ter um nível de líder explícito entre o grupo e os membros: o coordenador/representante SHALL ser um nó-líder que segura os membros, e o vice (deputy) SHALL ser um nó-líder irmão sem membros. Quando não houver coordenador/representante, os membros SHALL ficar diretamente sob o nó do grupo.

#### Scenario: Equipe com coordenador e vice
- **WHEN** uma equipe tem coordenador, vice e membros
- **THEN** a árvore é grupo(equipe) → coordenador(líder) → membros, com o vice como nó-líder irmão sem membros

#### Scenario: Família com representante
- **WHEN** uma família tem representante e membros
- **THEN** a árvore é grupo(família) → representante(líder) → membros (vice como líder irmão, se houver)

#### Scenario: Grupo sem líder
- **WHEN** uma equipe/família não tem coordenador/representante
- **THEN** os membros ficam diretamente sob o nó do grupo, sem nível de líder

### Requirement: Design dos nós por tipo
O renderizador SHALL desenhar os nós conforme o tipo: a **raiz** como pílula colorida destacada; o **líder** como cartão colorido (cor por ramo) com um badge exibindo o número de membros abaixo dele; o **membro** como cartão escuro arredondado com nome e subtítulo pequeno (equipe/função). As arestas SHALL ser suaves (`smoothstep`) na cor do ramo.

#### Scenario: Badge de contagem no líder
- **WHEN** um nó-líder tem N membros sob ele
- **THEN** o cartão do líder exibe um badge com N

#### Scenario: Cartão de membro
- **WHEN** um nó é um membro/pessoa
- **THEN** ele é desenhado como cartão escuro arredondado com o nome e, quando houver, um subtítulo

### Requirement: Cor consistente por ramo/líder
O renderizador SHALL colorir cada líder e sua subárvore de forma determinística a partir do líder (paleta fixa), herdando a cor na subárvore; nós sem líder SHALL usar cor neutra. As arestas SHALL acompanhar a cor do ramo.

#### Scenario: Mesma cor na subárvore do líder
- **WHEN** membros pertencem ao mesmo líder
- **THEN** o líder, seus membros e as arestas entre eles compartilham a mesma cor

### Requirement: Navegação e enquadramento
O organograma SHALL oferecer zoom, pan, controles e **minimapa**, e SHALL aplicar `fitView` ao carregar para enquadrar a árvore inteira. A operação SHALL permanecer somente leitura.

#### Scenario: Enquadrar ao carregar
- **WHEN** uma árvore é carregada
- **THEN** a viewport é ajustada para mostrar a árvore inteira

#### Scenario: Minimapa visível
- **WHEN** o organograma é exibido
- **THEN** um minimapa da árvore fica disponível junto dos controles

### Requirement: Expandir/recolher ramo pelo nó-líder
O usuário SHALL poder recolher e expandir um ramo **clicando no nó-líder** (com filhos); recolher SHALL ocultar os descendantes mantendo o contador visível, e o layout SHALL ser recalculado e reenquadrado.

#### Scenario: Recolher pelo clique no líder
- **WHEN** o usuário clica num nó-líder que tem filhos
- **THEN** os descendentes ficam ocultos, o badge de contagem continua visível e a árvore é reposicionada

#### Scenario: Expandir de novo
- **WHEN** o usuário clica num nó-líder recolhido
- **THEN** os filhos voltam a aparecer e o layout é recalculado
