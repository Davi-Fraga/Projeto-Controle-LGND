## ADDED Requirements

### Requirement: Permissions efetivas por usuário (papel + exceções)
O sistema SHALL calcular as permissions efetivas de um usuário como `permissions do papel base + concessões individuais − revogações individuais`. As concessões e revogações individuais SHALL ser persistidas por usuário, sobre o papel base, sem alterar o papel.

#### Scenario: Concessão individual
- **WHEN** o admin concede individualmente uma permission que o papel base não tem
- **THEN** a permission passa a constar nas permissions efetivas do usuário

#### Scenario: Revogação individual
- **WHEN** o admin revoga individualmente uma permission herdada do papel base
- **THEN** a permission deixa de constar nas permissions efetivas do usuário

### Requirement: Autorização reavaliada por requisição
O `PermissionsGuard` SHALL verificar as permissions efetivas atuais do usuário **a cada requisição**, não apenas no login. O sistema NÃO SHALL confiar em permissions congeladas no access token como fonte da verdade; alterações de acesso SHALL refletir sem exigir novo login.

#### Scenario: Revogação reflete em sessão ativa
- **WHEN** o admin revoga uma permission de um usuário que está logado
- **THEN** a próxima requisição desse usuário ao recurso correspondente é negada com 403, sem ele precisar deslogar

#### Scenario: Concessão reflete em sessão ativa
- **WHEN** o admin concede uma permission a um usuário logado
- **THEN** o usuário passa a acessar o recurso correspondente sem relogar

### Requirement: Escopo interno por usuário (1-N)
O sistema SHALL permitir associar a um usuário um ou mais **escopos** de dados (por cidade, equipe ou igreja), numa relação **1-N**. O `AccessPolicyService` SHALL montar o filtro de dados considerando o **conjunto** de escopos do usuário, aplicado no backend em consultas e mutações relevantes. Uma combinação inválida de permission e escopo NÃO SHALL ser aceita.

#### Scenario: Usuário com múltiplos escopos de cidade
- **WHEN** um usuário tem escopo nas cidades Piracanjuba e Morrinhos
- **THEN** ele vê os dados dessas duas cidades e não vê os de uma terceira cidade

#### Scenario: Escopo único
- **WHEN** um usuário tem exatamente um escopo
- **THEN** o filtro funciona como um conjunto de um elemento, restringindo a esse escopo

#### Scenario: Escopo aplicado em mutação
- **WHEN** um usuário restrito tenta alterar um dado fora do seu conjunto de escopos
- **THEN** a operação é negada pelo backend

### Requirement: Tela administrativa de Controle de Acessos
O sistema SHALL prover uma tela administrativa que, por usuário, liste as telas/ações disponíveis, permita ligar/desligar cada permission e **diferencie visualmente** permission herdada do papel, concedida individualmente e revogada individualmente, além de configurar e consultar os escopos internos (incluindo múltiplos).

#### Scenario: Diferenciação de origem
- **WHEN** o admin abre o Controle de Acessos de um usuário
- **THEN** cada permission aparece marcada como herdada, concedida ou revogada

#### Scenario: Gestão de múltiplos escopos
- **WHEN** o admin adiciona/remove escopos de um usuário
- **THEN** a associação 1-N é atualizada e refletida nas permissions/dados efetivos

### Requirement: Gestor de Cidade como caso de uso
O **Gestor de Cidade** SHALL ser configurado como papel base + permissions concedidas (incl. acesso ao Organograma) + escopo por cidade aplicado no `AccessPolicyService` sobre o `city` normalizado de `Legendary`. NÃO SHALL existir um papel rígido separado só para Gestor de Cidade. A API SHALL recusar acesso a dados de cidade fora do escopo, mesmo por URL direta.

#### Scenario: Gestor de Piracanjuba no Organograma
- **WHEN** o Gestor da Cidade de Piracanjuba abre o Organograma
- **THEN** vê somente o organograma de Piracanjuba

#### Scenario: IDOR por URL direta
- **WHEN** um usuário restrito por cidade chama diretamente a API pedindo dados de outra cidade
- **THEN** a requisição é negada (sem vazar dados fora do escopo)

### Requirement: Menus do frontend refletem permissions efetivas
O frontend SHALL adaptar navegação e menus às permissions efetivas do usuário, **sem** que isso seja a barreira de segurança — a autorização real permanece no backend.

#### Scenario: Menu oculto não é segurança
- **WHEN** um usuário sem uma permission tenta acessar a rota correspondente diretamente
- **THEN** o backend nega a requisição, independentemente do menu estar oculto no front
