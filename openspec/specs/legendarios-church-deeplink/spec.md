# legendarios-church-deeplink Specification

## Purpose
TBD - created by archiving change ver-legendarios-por-igreja. Update Purpose after archive.
## Requirements
### Requirement: Botão "Ver legendários" navega filtrando pela igreja

O botão **"Ver legendários"** de cada card de igreja (aba Líderes Espirituais) SHALL navegar para a lista de Legendários já filtrada por aquela igreja, transmitindo o identificador da igreja (`churchId`) via URL. O botão NÃO SHALL navegar para a listagem sem filtro quando houver uma igreja associada ao card. O identificador transmitido SHALL ser o `id` da própria igreja do card.

#### Scenario: Clique abre a lista já filtrada

- **WHEN** o usuário clica em "Ver legendários" no card de uma igreja (ex.: ADEG)
- **THEN** a aba de Legendários abre com o `churchId` daquela igreja na URL e a lista exibe apenas os legendários vinculados a ela

#### Scenario: Igrejas diferentes levam a filtros diferentes

- **WHEN** o usuário clica em "Ver legendários" no card de outra igreja (ex.: Aprisco)
- **THEN** a lista abre filtrada pela segunda igreja, e não pela primeira

### Requirement: A lista de Legendários hidrata o filtro de igreja a partir da URL

Ao ser aberta com um parâmetro de igreja na URL (`churchId`), a tela de Legendários SHALL iniciar com esse filtro já aplicado, reusando o mecanismo de listagem existente (filtro `churchId` enviado ao backend, escopo, paginação e guarda anti-race). Sem o parâmetro na URL, o comportamento SHALL permanecer idêntico ao atual (lista sem filtro por igreja). O filtro NÃO SHALL ser aplicado apenas localmente sobre a página já carregada.

#### Scenario: URL com churchId inicia filtrada

- **WHEN** a tela de Legendários é aberta com `?churchId=<id>` na URL
- **THEN** a primeira listagem já vai ao backend com esse `churchId` e a página mostra apenas os legendários daquela igreja

#### Scenario: URL sem churchId mantém comportamento atual

- **WHEN** a tela de Legendários é aberta sem parâmetro de igreja
- **THEN** a lista carrega sem filtro por igreja, como hoje

#### Scenario: Reusa o filtro existente, não um caminho paralelo

- **WHEN** o filtro por igreja é aplicado via deep-link
- **THEN** ele usa o mesmo parâmetro `churchId` da API e o mesmo estado de filtro da tela que o select de igreja já usa, sem lógica de filtragem duplicada

### Requirement: Indicação visual do filtro de igreja ativo e opção de limpar

Quando a lista estiver filtrada por uma igreja vinda do deep-link, a tela SHALL indicar visualmente qual igreja está filtrando e SHALL oferecer uma ação para limpar o filtro e voltar a "todas as igrejas". O rótulo da igreja SHALL ser exibível mesmo quando o dropdown global de igrejas não estiver populado (caso de usuário restrito), sem depender de esse catálogo ter carregado.

#### Scenario: Filtro ativo é visível

- **WHEN** a lista está filtrada por uma igreja via deep-link
- **THEN** a tela mostra o nome/indicador da igreja que está sendo filtrada

#### Scenario: Limpar o filtro volta para todas

- **WHEN** o usuário aciona a ação de limpar o filtro de igreja
- **THEN** a lista deixa de filtrar por igreja e passa a listar segundo os demais filtros ativos

#### Scenario: Rótulo aparece para usuário restrito

- **WHEN** um usuário restrito (cujo catálogo global de igrejas pode não carregar) abre a lista via deep-link de uma igreja do seu escopo
- **THEN** a tela ainda consegue exibir o indicador da igreja filtrada

### Requirement: Filtro por igreja respeita o escopo de acesso

A listagem filtrada por `churchId` SHALL continuar aplicando o escopo de acesso do usuário (`AccessPolicyService`). Um usuário restrito NÃO SHALL ver legendários fora do seu escopo mesmo que um `churchId` fora do escopo seja informado na URL. A checagem de escopo SHALL ocorrer no backend, não apenas na UI.

#### Scenario: churchId fora do escopo não vaza

- **WHEN** um usuário restrito abre a lista com um `churchId` de uma igreja fora do seu escopo
- **THEN** a listagem retorna vazia (ou apenas o que estiver no escopo), sem expor legendários fora do acesso do usuário

#### Scenario: Admin vê todos os vínculos da igreja

- **WHEN** um Administrador abre a lista filtrada por uma igreja
- **THEN** vê todos os legendários vinculados àquela igreja
