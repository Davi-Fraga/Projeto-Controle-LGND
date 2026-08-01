## ADDED Requirements

### Requirement: Tokens visuais semânticos
O frontend SHALL definir e reutilizar tokens semânticos para superfícies, texto, bordas, destaque, foco e estados de feedback, preservando o tema escuro e a cor laranja da marca sem depender de valores crus repetidos nos componentes compartilhados.

#### Scenario: Componente compartilhado usa tokens
- **WHEN** um componente de layout ou UI compartilhado define cores de fundo, texto, borda ou foco
- **THEN** essas cores são obtidas dos tokens semânticos documentados

#### Scenario: Visualização especializada preserva cores próprias
- **WHEN** mapa, organograma ou gráfico necessita de cor específica para representar dados
- **THEN** a cor específica pode permanecer local, mas superfícies, texto e controles ao redor continuam usando tokens semânticos

### Requirement: Escala tipográfica e ritmo responsivo
O frontend SHALL adotar uma escala tipográfica e de espaçamento consistente, com texto operacional legível em desktop e mobile e redução responsiva de espaço sem comprimir controles ou informações essenciais.

#### Scenario: Texto auxiliar legível
- **WHEN** metadados, rótulos ou textos auxiliares são exibidos
- **THEN** eles usam pelo menos 12 CSS pixels, contraste adequado e espaçamento entre linhas compatível com leitura

#### Scenario: Conteúdo operacional principal
- **WHEN** uma tela apresenta formulários, tabelas, cards ou instruções de uso
- **THEN** o texto operacional principal usa pelo menos 14 CSS pixels e segue a escala tipográfica compartilhada

### Requirement: Hierarquia consistente de superfícies e ações
O frontend SHALL distinguir canvas, superfícies, conteúdo agrupado e elementos interativos por uma combinação consistente de espaçamento, contraste e bordas, evitando caixas e divisórias sem função hierárquica.

#### Scenario: Seção com ação principal
- **WHEN** uma região possui múltiplas ações
- **THEN** no máximo uma ação é apresentada como primária sólida e as demais usam tratamento secundário ou menu contextual

#### Scenario: Conteúdo agrupado
- **WHEN** informações relacionadas são apresentadas em cards ou painéis
- **THEN** a separação visual prioriza espaçamento e nível de superfície, reservando bordas fortes para estados e componentes que precisam de delimitação

### Requirement: Estados interativos perceptíveis
Todo controle interativo compartilhado SHALL oferecer estados perceptíveis de repouso, hover quando aplicável, foco por teclado, ativação, seleção e desabilitado sem depender exclusivamente de cor.

#### Scenario: Navegação por teclado
- **WHEN** um usuário move o foco para um botão, link, campo ou item de menu usando teclado
- **THEN** um indicador visível com área equivalente a pelo menos um contorno de 2 CSS pixels identifica o controle focado

#### Scenario: Controle desabilitado
- **WHEN** uma ação está indisponível
- **THEN** o controle comunica o estado visualmente e semanticamente, preservando legibilidade suficiente para explicar sua existência
