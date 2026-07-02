## ADDED Requirements

### Requirement: Função na Manada não concede acesso (papéis desacoplados)
O papel do usuário (`SystemRole`) SHALL representar a **Função na Manada** — um rótulo organizacional — e NÃO SHALL, por si só, conceder acesso a telas/permissions. A ÚNICA exceção é o papel **Administrador** (`COORDINATION_ADMIN`), que SHALL manter acesso total automático (todas as permissions) e escopo irrestrito. Todo o acesso dos demais usuários SHALL vir exclusivamente da tela Controle de Acessos (concessões por tela).

#### Scenario: Atribuir função não dá acesso
- **WHEN** o admin define a Função na Manada de um usuário (ex.: Representante de TOP) sem conceder telas
- **THEN** o usuário NÃO ganha acesso a nenhuma tela por causa da função

#### Scenario: Administrador é atalho total
- **WHEN** um usuário tem a função Administrador
- **THEN** tem acesso total automático, sem precisar configurar telas

### Requirement: Permissions efetivas por usuário
O sistema SHALL calcular as permissions efetivas como `(base do papel − revogações) ∪ concessões por tela`, onde a **base do papel é o conjunto de permissions do papel APENAS quando o papel é `COORDINATION_ADMIN`**; para as demais funções a base é vazia. Assim, para não-admin, efetivas = `concessões por tela − revogações`. As permissions são um **detalhe interno**: o administrador opera por tela, não por permission crua.

#### Scenario: Concessão por tela (não-admin)
- **WHEN** o admin concede uma tela a um usuário não-admin
- **THEN** as permissions daquela tela passam a constar nas efetivas do usuário

#### Scenario: Revogação
- **WHEN** o admin remove o acesso de uma tela
- **THEN** as permissions daquela tela deixam de constar nas efetivas do usuário

### Requirement: Autorização reavaliada por requisição
O `PermissionsGuard` SHALL verificar as permissions efetivas atuais do usuário **a cada requisição**, não apenas no login. O sistema NÃO SHALL confiar em permissions congeladas no access token como fonte da verdade; alterações de acesso SHALL refletir sem exigir novo login.

#### Scenario: Revogação reflete em sessão ativa
- **WHEN** o admin remove o acesso de uma tela de um usuário que está logado
- **THEN** a próxima requisição desse usuário ao recurso correspondente é negada com 403, sem ele precisar deslogar

#### Scenario: Concessão reflete em sessão ativa
- **WHEN** o admin concede o acesso de uma tela a um usuário logado
- **THEN** o usuário passa a acessar o recurso correspondente sem relogar

### Requirement: Controle de acesso por tela (não por permission individual)
A tela administrativa SHALL apresentar o acesso em termos de **TELAS/MÓDULOS** (lista curta, ~10-12), **nunca** as permissions individuais. Cada tela SHALL ter um controle de acesso simples — no mínimo **ligado/desligado**, opcionalmente um nível **Sem acesso / Ver / Ver e editar**. Ligar/elevar uma tela SHALL ativar, no backend, o **conjunto de permissions mapeado** àquela tela. As permissions cruas SHALL permanecer **escondidas** do administrador.

#### Scenario: Lista de telas, não de permissions
- **WHEN** o admin abre o Controle de Acessos de um usuário
- **THEN** vê ~10-12 telas com seu acesso, e não ~80 permissions técnicas

#### Scenario: Conceder acesso a uma tela
- **WHEN** o admin liga a tela "Equipes" (nível Ver) para um usuário
- **THEN** o usuário passa a ter as permissions efetivas daquela tela, sem o admin ver/escolher permissions cruas

#### Scenario: Nível por tela
- **WHEN** o admin define a tela "Legendários" como "Ver e editar"
- **THEN** o usuário recebe as permissions de leitura **e** de mutação da tela; em "Ver", apenas as de leitura

### Requirement: Mapeamento Tela→Permissions no backend
O backend SHALL definir um **mapa canônico** de cada tela/módulo para seu conjunto de permissions (separando leitura de mutação para suportar níveis), usado para traduzir a escolha por tela do admin nas permissions efetivas que o `PermissionsGuard` avalia. Esse mapa SHALL ser a fonte da verdade; a UI NÃO SHALL enviar chaves de permission cruas — apenas tela + nível.

#### Scenario: Tradução tela→permissions
- **WHEN** a UI envia "tela=Equipes, nível=Ver e editar"
- **THEN** o backend resolve o conjunto de permissions daquela tela e nível e aplica como concessões efetivas

#### Scenario: UI não envia permissions cruas
- **WHEN** uma requisição da tela administrativa tenta enviar uma permission key arbitrária fora do contrato tela+nível
- **THEN** o backend a ignora/recusa; o contrato é por tela e nível

### Requirement: Escopo por tela por usuário (1-N, com TOP)
O sistema SHALL permitir restringir, **por tela**, a qual fatia de dados o usuário tem acesso, associando ao usuário um ou mais **escopos** (por **cidade**, **equipe**, **igreja** ou **TOP**), numa relação **1-N**. O `AccessPolicyService` SHALL montar o filtro de dados considerando o **conjunto** de escopos do usuário, aplicado no backend em **consultas e mutações** relevantes. O escopo é a **barreira real**: a API SHALL recusar dados fora do escopo, mesmo por URL direta. Uma combinação inválida de tela e escopo NÃO SHALL ser aceita.

#### Scenario: Coordenador de uma equipe
- **WHEN** o Coordenador da equipe "Segurança" tem a tela Equipes e Organograma com escopo equipe=Segurança
- **THEN** vê somente a equipe Segurança e o organograma da Segurança, e não as demais equipes

#### Scenario: Usuário com múltiplos escopos
- **WHEN** um usuário tem escopo nas cidades Piracanjuba e Morrinhos
- **THEN** vê os dados dessas duas cidades e não vê os de uma terceira

#### Scenario: Escopo aplicado em mutação
- **WHEN** um usuário restrito tenta alterar um dado fora do seu conjunto de escopos
- **THEN** a operação é negada pelo backend

#### Scenario: IDOR por URL direta
- **WHEN** um usuário restrito chama diretamente a API pedindo um recurso fora do seu escopo (outra equipe/cidade/igreja/TOP)
- **THEN** a requisição é negada, sem vazar dados fora do escopo

#### Scenario: Valor de escopo precisa existir
- **WHEN** o admin tenta salvar um escopo (cidade/equipe/igreja/TOP) cujo valor NÃO corresponde a uma entidade real do banco
- **THEN** o backend recusa (não confia no front); só valores existentes são aceitos

### Requirement: Tela administrativa limpa com seletor de escopo por busca
A tela administrativa SHALL ser limpa: uma lista de **telas** com seu acesso e, ao lado (quando aplicável), um **seletor de escopo** (quais equipes/igrejas/cidades/TOPs). NÃO SHALL haver dezenas de toggles de permission. TODOS os seletores de escopo (cidade, equipe, igreja, TOP) SHALL se comportar de forma **consistente**: um dropdown com **busca/autocomplete** que lista as **entidades reais do backend** (não lista hardcoded, **não texto livre**), filtrando conforme se digita de forma **tolerante a acento e a maiúsc/minúsc**, com **subtítulo** desambiguador quando útil (ex.: igreja → cidade). O usuário SHALL conseguir adicionar ao escopo **apenas** itens existentes na lista; digitar algo fora da lista NÃO SHALL adicionar nada. Telas sem dados segmentáveis (ex.: Painel) NÃO SHALL exibir seletor de escopo. Cada seletor SHALL suportar **múltiplos** itens (chips removíveis, 1-N).

#### Scenario: Seleção de escopo por busca (todos os tipos)
- **WHEN** o admin restringe uma tela por equipe/cidade/igreja/TOP
- **THEN** usa um campo de busca com autocomplete que lista as entidades reais do backend e filtra conforme digita

#### Scenario: Busca tolerante a acento
- **WHEN** o admin digita "cald" no seletor de cidade
- **THEN** a opção "Caldas Novas" aparece (acento e caixa ignorados)

#### Scenario: Sem texto livre
- **WHEN** o admin digita um valor que não corresponde a nenhuma opção da lista
- **THEN** nada é adicionado ao escopo (não existe input de texto livre que aceite valor arbitrário)

#### Scenario: Estado claro por tela
- **WHEN** o admin abre o Controle de Acessos
- **THEN** cada tela mostra seu nível de acesso atual e os escopos configurados (chips removíveis)

### Requirement: Menus do frontend refletem permissions efetivas
O frontend SHALL adaptar navegação e menus às permissions efetivas do usuário, **sem** que isso seja a barreira de segurança — a autorização real permanece no backend.

#### Scenario: Menu oculto não é segurança
- **WHEN** um usuário sem acesso a uma tela tenta acessar a rota correspondente diretamente
- **THEN** o backend nega a requisição, independentemente do menu estar oculto no front
