## ADDED Requirements

### Requirement: Navegação mobile identificável e reversível
A navegação mobile SHALL expor um controle com nome acessível e estado expandido, permitir abertura e fechamento pelo mesmo controle e oferecer fechamento adicional pelo backdrop sem bloquear o controle visível.

#### Scenario: Abrir menu mobile
- **WHEN** o usuário ativa o controle chamado "Abrir menu"
- **THEN** a navegação entra no viewport, o controle passa a se chamar "Fechar menu" e `aria-expanded` se torna verdadeiro

#### Scenario: Fechar pelo mesmo controle
- **WHEN** a navegação está aberta e o usuário ativa "Fechar menu"
- **THEN** a navegação sai do viewport e `aria-expanded` se torna falso

#### Scenario: Fechar pelo backdrop
- **WHEN** a navegação está aberta e o usuário ativa a área externa ao painel
- **THEN** a navegação fecha sem alterar a rota atual

### Requirement: Alvos de interação adequados
Controles acionáveis SHALL possuir área de alvo de pelo menos 24 por 24 CSS pixels ou espaçamento equivalente, e ações mobile primárias SHALL buscar uma área mínima de 40 por 40 CSS pixels.

#### Scenario: Ações compactas em tabela
- **WHEN** ícones de ação são exibidos próximos uns dos outros
- **THEN** cada ação atende ao tamanho mínimo ou possui espaçamento suficiente para evitar ativação acidental

#### Scenario: Controle mobile principal
- **WHEN** um botão de navegação ou ação principal é exibido em viewport mobile
- **THEN** sua área acionável possui pelo menos 40 CSS pixels na menor dimensão

### Requirement: Reflow sem perda de funcionalidade
As telas prioritárias SHALL permanecer utilizáveis em 390 por 844 CSS pixels e em 1600 por 900 CSS pixels, sem overflow horizontal do documento nem controles essenciais recortados.

#### Scenario: Dashboard mobile
- **WHEN** o dashboard é aberto em 390 por 844 CSS pixels
- **THEN** título, ação principal, resumo inicial e navegação mobile permanecem acessíveis sem rolagem horizontal do documento

#### Scenario: Tela densa desktop
- **WHEN** uma lista, mapa, relatório ou organograma é aberto em 1600 por 900 CSS pixels
- **THEN** o conteúdo essencial, controles e estados atuais cabem no shell ou em regiões de rolagem deliberadamente identificadas

### Requirement: Filtros e dados densos adaptáveis
Listas com muitos filtros ou colunas SHALL oferecer uma composição mobile que priorize busca, ação principal, filtros ativos e acesso aos resultados sem exigir varredura excessiva antes do primeiro item.

#### Scenario: Filtros extensos no mobile
- **WHEN** uma lista possui mais de três filtros secundários em viewport mobile
- **THEN** os filtros secundários podem ser recolhidos, enquanto busca, ação principal e resumo dos filtros ativos permanecem visíveis

#### Scenario: Tabela larga no mobile
- **WHEN** uma tabela não cabe na largura disponível
- **THEN** a tela usa cartões responsivos ou rolagem interna explicitamente delimitada, preservando identificação do registro e acesso às ações

### Requirement: Controles com nome, papel e estado
Botões apenas com ícone, toggles, menus, diálogos e controles customizados SHALL expor nome, papel e estado coerentes para tecnologias assistivas.

#### Scenario: Botão apenas com ícone
- **WHEN** um botão não contém texto visível
- **THEN** ele possui nome acessível que descreve a ação atual

#### Scenario: Menu contextual
- **WHEN** um menu contextual é aberto
- **THEN** o acionador comunica seu estado e os itens do menu permanecem navegáveis e identificáveis por teclado

### Requirement: Navegação primária organizada em grupos

A navegação primária SHALL agrupar as abas por afinidade de domínio, com rótulo por grupo, em vez de apresentar uma lista plana. O agrupamento SHALL ser declarado no manifesto compartilhado de navegação, que permanece a fonte única das abas.

O agrupamento é **apresentação, nunca fronteira de permissão**: o conjunto de abas exibidas SHALL ser exatamente o mesmo que a avaliação item a item das regras de entrada produziria. Um grupo NÃO SHALL ampliar nem restringir o que o usuário enxerga.

Um grupo sem nenhuma aba visível para o usuário NÃO SHALL renderizar — nem o cabeçalho. A ordem de exibição dos grupos SHALL ser determinística e independente da ordem interna do manifesto, que continua governando a preferência de primeira rota permitida.

Cada grupo SHALL ser identificável por tecnologias assistivas e a navegação SHALL permanecer utilizável por teclado e no drawer mobile.

#### Scenario: Abas agrupadas por afinidade

- **WHEN** um usuário com acesso amplo abre a navegação
- **THEN** as abas aparecem distribuídas em grupos rotulados por afinidade de domínio, e não como lista plana única

#### Scenario: Agrupar não altera o que é visível

- **WHEN** a navegação agrupada é montada para qualquer usuário
- **THEN** o conjunto de abas exibidas é idêntico ao que a avaliação individual das regras de entrada produz — nenhuma aba é escondida nem acrescentada pelo agrupamento

#### Scenario: Grupo vazio não deixa cabeçalho órfão

- **WHEN** nenhum item de um grupo é visível para o usuário
- **THEN** aquele grupo não aparece, incluindo seu rótulo

#### Scenario: Item sem grupo fica em evidência

- **WHEN** uma aba não declara grupo
- **THEN** ela aparece antes dos grupos rotulados, numa seção sem cabeçalho

#### Scenario: Grupos são anunciados

- **WHEN** um usuário de leitor de tela percorre a navegação
- **THEN** cada grupo é anunciado com seu rótulo e os itens permanecem alcançáveis por teclado, inclusive no drawer mobile
