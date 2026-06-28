# legendario-autocomplete Specification

## Purpose
TBD - created by archiving change autocomplete-legendario-vinculado. Update Purpose after archive.
## Requirements
### Requirement: Busca de Legendários no backend para o campo vinculado
O campo **Legendário vinculado** SHALL obter suas opções por busca no backend a partir do termo digitado. O frontend NÃO SHALL carregar todos os Legendários para filtrar localmente. O endpoint de busca SHALL retornar um conjunto enxuto por item (ao menos id, nome, cidade e número quando disponível) e SHALL limitar a quantidade de resultados por busca.

#### Scenario: Digitar filtra no backend
- **WHEN** o usuário digita parte de um nome no campo Legendário vinculado
- **THEN** uma requisição de busca é enviada ao backend e a lista exibida vem desse resultado

#### Scenario: Resultado limitado
- **WHEN** o termo digitado corresponde a muitos Legendários
- **THEN** o backend retorna no máximo o limite definido de resultados, sem trazer a base inteira

### Requirement: Busca tolerante a acento e caixa
A busca de Legendários do campo SHALL ser tolerante a acentos e a maiúsculas/minúsculas, conforme a estratégia de busca sem acento aprovada para o PostgreSQL.

#### Scenario: Indiferente a caixa e acento
- **WHEN** o usuário digita `joao`
- **THEN** Legendários como `João` aparecem nos resultados

### Requirement: Itens com nome, cidade e número para desambiguação
Cada item de resultado SHALL exibir nome, cidade e número (quando disponível) para desambiguar pessoas com nomes parecidos.

#### Scenario: Nomes parecidos desambiguados
- **WHEN** existem dois Legendários com nomes semelhantes
- **THEN** cada item mostra cidade e número (quando houver), permitindo distingui-los

### Requirement: Combobox com debounce e estados de loading/vazio
O campo SHALL ser um autocomplete/combobox com debounce na digitação e SHALL apresentar estados de carregando e de resultado vazio, sem travar a tela com muitos registros.

#### Scenario: Debounce
- **WHEN** o usuário digita rapidamente
- **THEN** a busca é disparada com debounce, sem uma requisição por tecla

#### Scenario: Estado vazio
- **WHEN** nenhum Legendário corresponde ao termo
- **THEN** o campo mostra um estado de "nenhum resultado"

### Requirement: Opção "Nenhum" como padrão
O campo SHALL manter a opção **"Nenhum"** como valor padrão, permitindo não vincular Legendário algum.

#### Scenario: Padrão Nenhum
- **WHEN** o formulário de usuário é aberto sem Legendário vinculado
- **THEN** o campo exibe "Nenhum" como seleção padrão e permite mantê-lo assim

### Requirement: Padrão de combobox reaproveitável
O padrão de autocomplete com busca no backend (debounce, limite, loading/vazio) SHALL ser reutilizável em outros dropdowns de lista cheia do sistema, não acoplado exclusivamente a este campo.

#### Scenario: Reuso em outro dropdown
- **WHEN** outro dropdown de lista cheia precisar de busca no backend
- **THEN** pode reaproveitar o mesmo componente/padrão de combobox, parametrizando a fonte de dados

