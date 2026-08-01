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
