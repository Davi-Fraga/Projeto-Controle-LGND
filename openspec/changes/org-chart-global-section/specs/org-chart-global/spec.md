## ADDED Requirements

### Requirement: Seção dedicada de organograma no menu lateral
O sistema SHALL expor o organograma como uma seção própria, acessível por um item **"Organograma"** no menu lateral, em uma rota dedicada (`/dashboard/organograma`). O organograma NÃO SHALL mais ser acessível de dentro da tela de detalhe de um TOP.

#### Scenario: Item no menu abre a seção
- **WHEN** um usuário autenticado clica em "Organograma" no menu lateral
- **THEN** é levado à rota dedicada do organograma, fora de qualquer TOP

#### Scenario: Detalhe do TOP não oferece mais o organograma
- **WHEN** o usuário abre a tela de detalhe de um TOP
- **THEN** não existe botão/link "Organograma" nessa tela, e a antiga rota `/dashboard/tops/[id]/organograma` não está disponível

### Requirement: Seletor de escopo do organograma
A seção SHALL apresentar um seletor de escopo com quatro visões — **Equipes**, **Coordenadores**, **Cidades** e **TOPs** — e todas SHALL ser renderizadas pelo mesmo componente de árvore sobre o contrato `OrgChartNode`, mantendo as interações read-only (zoom, pan, expandir/recolher), cor por líder e contador por nó.

#### Scenario: Troca de escopo
- **WHEN** o usuário troca o escopo selecionado (ex.: Equipes → Cidades)
- **THEN** a árvore correspondente é carregada e renderizada pelo mesmo renderizador, sem ações de edição

### Requirement: Visão global de Equipes (uma equipe por vez)
O escopo **Equipes** SHALL oferecer um seletor de equipe e, ao escolher uma `Team`, montar a árvore equipe → membros: a equipe carrega seu coordenador como `leaderId`, com o sub-coordenador e os membros ativos (`TeamMembership` ativo) como nós-pessoa. A operação SHALL ser somente leitura e exigir `teams.read`.

#### Scenario: Equipe com coordenador e membros
- **WHEN** o usuário seleciona uma equipe que tem coordenador e membros ativos
- **THEN** a árvore tem o nó da equipe (com `leaderId` = coordenador) e um nó-pessoa por membro ativo

#### Scenario: Equipe sem coordenador
- **WHEN** a equipe selecionada não tem coordenador
- **THEN** o nó da equipe é renderizado sem `leaderId` (cor neutra), tornando o buraco visível

#### Scenario: Sem permissão
- **WHEN** um usuário sem `teams.read` solicita a visão de equipes
- **THEN** a requisição é negada (403)

### Requirement: Visão global de Coordenadores
O escopo **Coordenadores** SHALL montar a cadeia de coordenação global: um nó raiz de direção (o "diretor") no topo e, abaixo, um nó por coordenador de cada equipe ativa (label = nome do coordenador, subtitle = nome da equipe). Equipes sem coordenador NÃO SHALL gerar nó-coordenador. A operação SHALL exigir `teams.read`.

#### Scenario: Diretor e coordenadores
- **WHEN** existem equipes ativas com coordenador definido
- **THEN** a árvore tem o nó de direção no topo e um nó-coordenador por equipe com coordenador, com a equipe como subtitle

#### Scenario: Equipe sem coordenador é omitida da cadeia
- **WHEN** uma equipe ativa não tem coordenador
- **THEN** ela não aparece como nó-coordenador na visão

### Requirement: Visão global de Cidades (uma cidade por vez, em dois modos)
O escopo **Cidades** SHALL oferecer um **seletor de cidade** (uma cidade por vez, à semelhança do escopo Equipes) e, para a cidade escolhida, dois modos alternáveis: (a) `cidade → legendário` e (b) `cidade → igreja → legendário`. As cidades SHALL ser apuradas por chave normalizada (acento/caixa-insensível); o seletor SHALL incluir uma opção "Sem cidade" quando houver legendários sem cidade, e no modo com igreja os legendários sem igreja SHALL cair em "Sem igreja". A operação SHALL exigir `legendarios.read`. NÃO SHALL existir uma árvore única com todas as cidades.

#### Scenario: Seleção de uma cidade
- **WHEN** o usuário escolhe uma cidade no seletor
- **THEN** a árvore mostra apenas aquela cidade como raiz e seus legendários (ou igrejas → legendários), sem as demais cidades

#### Scenario: Modo cidade → igreja → legendário
- **WHEN** o usuário, com uma cidade selecionada, escolhe o modo "igreja → legendário"
- **THEN** a cidade tem nós de igreja, e cada igreja seus legendários; legendários sem igreja aparecem sob "Sem igreja"

#### Scenario: Grafias equivalentes de cidade
- **WHEN** legendários têm cidades em grafias equivalentes (ex.: "Goiânia" e "goiania")
- **THEN** eles são contados sob uma única cidade canônica no seletor e na árvore

#### Scenario: Sem cidade
- **WHEN** o usuário escolhe a opção "Sem cidade" no seletor
- **THEN** a árvore mostra os legendários sem cidade cadastrada

### Requirement: Visão de TOP reaproveitada no escopo TOPs
O escopo **TOPs** SHALL oferecer um seletor de TOP e, ao escolher um TOP, reaproveitar as três visões já existentes do TOP (Equipes, Chefes de Família, Cidades) via o endpoint `GET /tops/:id/org-chart`, exigindo `tops.read`.

#### Scenario: Selecionar um TOP
- **WHEN** o usuário escolhe um TOP no escopo TOPs e uma de suas visões
- **THEN** a árvore daquele TOP é carregada pelo endpoint existente, sem duplicar a lógica de hierarquia
