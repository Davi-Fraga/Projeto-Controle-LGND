# entity-search-inventory Specification

## Purpose
TBD - created by archiving change busca-reutilizavel-entidades-e-listagens. Update Purpose after archive.
## Requirements
### Requirement: Inventário versionado de seletores de entidades
A mudança SHALL manter um inventário verificável dos pontos que selecionam Legendários ou entidades relacionadas. Cada entrada MUST registrar o path do consumidor, a entidade selecionada e se o fluxo usa busca remota, carrega lista limitada/completa, filtra localmente ou exige identificador manual.

#### Scenario: Seletor que carrega lista é registrado
- **WHEN** um consumidor carrega previamente uma lista de entidades para preencher `<select>`
- **THEN** seu path e sua estratégia atual constam no inventário

#### Scenario: Entrada manual de UUID é registrada
- **WHEN** um fluxo pede ao usuário o identificador de uma entidade
- **THEN** o inventário marca explicitamente o fluxo como identificador manual

#### Scenario: Ponto já migrado é distinguido
- **WHEN** um consumidor já usa combobox e busca remota escopada
- **THEN** o inventário o classifica como referência ou regressão, não como migração pendente

### Requirement: Migração é sequenciada por domínio
Os pontos pendentes SHALL ser agrupados em mudanças posteriores por domínio, em vez de serem migrados implicitamente nesta mudança. Cada grupo SHALL possuir uma ordem sugerida e SHALL preservar as regras de criação/edição próprias do domínio.

#### Scenario: Esta mudança encerra somente seu recorte
- **WHEN** esta mudança for considerada pronta
- **THEN** somente usuários/convite, a fundação reutilizável e as listagens de Igrejas são exigidos como migração de runtime

#### Scenario: Grupo posterior não amplia escopo
- **WHEN** um grupo inventariado for migrado em uma mudança posterior
- **THEN** essa mudança define e testa o endpoint de opções e a interseção com `AccessPolicyService` antes de substituir o seletor

### Requirement: Critérios mínimos para retirar um item do inventário pendente
Um item SHALL ser marcado como migrado somente quando usar busca remota limitada, preservar o valor atual em edição, não aceitar UUID livre como interface normal e possuir teste da regra crítica de seleção e escopo.

#### Scenario: Migração apenas visual é insuficiente
- **WHEN** um `<select>` é trocado por combobox mas o frontend continua carregando a lista completa
- **THEN** o item permanece pendente no inventário

#### Scenario: Migração completa
- **WHEN** o consumidor busca opções limitadas no backend, preserva o valor editado e o escopo é coberto por teste
- **THEN** o item pode ser reclassificado como migrado

### Requirement: Inventário é revisado contra o código
Antes de encerrar a implementação desta mudança, o inventário MUST ser confrontado novamente com buscas no repositório por componentes de seleção, chamadas de listagem de Legendários e campos de identificador manual. Novos pontos encontrados MUST ser adicionados ao inventário sem expandir automaticamente o escopo de runtime.

#### Scenario: Novo consumidor encontrado na revisão
- **WHEN** a revisão final encontra outro seletor de entidade fora do recorte
- **THEN** ele é registrado no grupo posterior apropriado e não é migrado sem uma spec aprovada

