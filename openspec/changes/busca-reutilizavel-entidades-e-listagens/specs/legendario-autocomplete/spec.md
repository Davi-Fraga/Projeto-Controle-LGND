## MODIFIED Requirements

### Requirement: Busca de Legendários no backend para o campo vinculado
Campos de seleção de Legendário que adotarem esta capacidade SHALL obter suas opções por busca no backend a partir do termo digitado. O frontend NÃO SHALL carregar todos os Legendários para filtrar localmente. O endpoint SHALL buscar por nome normalizado e número LGND, SHALL retornar um conjunto enxuto por item (ao menos id, nome, cidade e número quando disponível) e SHALL limitar a quantidade de resultados por busca.

#### Scenario: Digitar nome filtra no backend
- **WHEN** o usuário digita parte de um nome no campo de Legendário
- **THEN** uma requisição de busca é enviada ao backend e a lista exibida vem desse resultado

#### Scenario: Digitar número LGND filtra no backend
- **WHEN** o usuário digita parte de um número LGND
- **THEN** o backend retorna os Legendários cujo número corresponde ao termo

#### Scenario: Resultado limitado
- **WHEN** o termo digitado corresponde a muitos Legendários
- **THEN** o backend retorna no máximo o limite definido de resultados, sem trazer a base inteira

### Requirement: Busca tolerante a acento e caixa
A busca de Legendários do campo SHALL ser tolerante a acentos e a maiúsculas/minúsculas, conforme a estratégia de `searchText` normalizado adotada no PostgreSQL.

#### Scenario: Indiferente a caixa e acento
- **WHEN** o usuário digita `joao`
- **THEN** Legendários como `João` aparecem nos resultados

#### Scenario: Termo textual não cria filtro de telefone vazio
- **WHEN** o usuário pesquisa somente texto sem qualquer dígito
- **THEN** o backend não adiciona uma cláusula vazia de telefone e não retorna todos os registros por engano

### Requirement: Itens com nome, cidade e número para desambiguação
Cada item de resultado SHALL exibir nome, cidade e número LGND quando disponíveis para desambiguar pessoas com nomes parecidos. A conversão do payload de opções para a apresentação do combobox SHALL existir em um único adaptador do domínio de Legendários.

#### Scenario: Nomes parecidos desambiguados
- **WHEN** existem dois Legendários com nomes semelhantes
- **THEN** cada item mostra cidade e número LGND quando houver, permitindo distingui-los

#### Scenario: Consumidores compartilham a apresentação
- **WHEN** edição de usuário e convite exibem o mesmo Legendário retornado pelo endpoint
- **THEN** ambos usam o adaptador canônico e apresentam o mesmo nome e sublabel

### Requirement: Combobox com debounce e estados de loading/vazio
O campo SHALL ser um autocomplete/combobox com debounce na digitação, proteção contra respostas obsoletas e estados distintos de carregando, resultado vazio e erro. Uma falha de rede NÃO SHALL ser apresentada como se a busca tivesse retornado zero opções.

#### Scenario: Debounce
- **WHEN** o usuário digita rapidamente
- **THEN** a busca é disparada com debounce, sem uma requisição por tecla

#### Scenario: Resposta obsoleta é ignorada
- **WHEN** uma busca antiga termina depois de uma busca mais recente
- **THEN** somente o resultado da busca mais recente é exibido

#### Scenario: Estado vazio
- **WHEN** a busca mais recente termina com sucesso e nenhuma opção corresponde ao termo
- **THEN** o campo mostra um estado de nenhum resultado

#### Scenario: Estado de erro
- **WHEN** a busca mais recente falha
- **THEN** o campo mostra um estado de erro distinto e não trata a falha como resultado vazio

### Requirement: Opção "Nenhum" como padrão
O combobox SHALL permitir que o consumidor configure se o valor pode ser limpo. Campos opcionais de Legendário SHALL manter a opção **"Nenhum"** como valor padrão; campos obrigatórios SHALL poder ocultar essa opção.

#### Scenario: Padrão Nenhum
- **WHEN** o formulário de usuário é aberto sem Legendário vinculado
- **THEN** o campo exibe "Nenhum" como seleção padrão e permite mantê-lo assim

#### Scenario: Campo obrigatório não oferece limpeza
- **WHEN** um consumidor configura o combobox como não limpável
- **THEN** a lista não apresenta a opção de valor vazio

### Requirement: Padrão de combobox reaproveitável
O padrão de autocomplete com busca no backend SHALL permanecer genérico e parametrizável pela fonte de dados, sem conhecer endpoints de domínio. Ele SHALL preservar o valor/rótulo atual mesmo quando esse item não estiver na página de resultados, e SHALL oferecer operação completa por teclado com relações ARIA de combobox, listbox e option.

#### Scenario: Reuso em outro dropdown
- **WHEN** outro dropdown de lista cheia precisar de busca no backend
- **THEN** pode reaproveitar o mesmo componente, parametrizando a fonte de dados e a política de limpeza

#### Scenario: Valor atual fora dos resultados
- **WHEN** um formulário de edição abre com valor e rótulo selecionados que não aparecem na busca atual
- **THEN** o gatilho continua exibindo esse rótulo até o usuário escolher ou limpar outro valor

#### Scenario: Navegação e seleção por teclado
- **WHEN** o usuário abre o combobox e usa `ArrowDown`, `ArrowUp` e `Enter`
- **THEN** o foco ativo percorre as opções e `Enter` confirma a opção ativa

#### Scenario: Fechar por teclado
- **WHEN** o usuário pressiona `Escape` com o popup aberto
- **THEN** o popup fecha e o foco retorna ao gatilho sem alterar o valor

### Requirement: Resultado de Legendários respeita o escopo de acesso
`GET /legendarios/options` MUST intersectar filtros de busca e status com o escopo resolvido pelo `AccessPolicyService`. Nenhum termo SHALL revelar um Legendário fora da visibilidade do usuário autenticado.

#### Scenario: Correspondência fora do escopo não aparece
- **WHEN** um usuário restrito pesquisa um nome ou número LGND que corresponde somente a Legendário fora do seu escopo
- **THEN** o endpoint retorna zero opções para essa correspondência

#### Scenario: Administrador mantém acesso irrestrito
- **WHEN** um administrador pesquisa um Legendário ativo existente
- **THEN** o resultado pode incluir a correspondência independentemente dos escopos restritos de outros usuários
