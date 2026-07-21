## Context

O projeto já tem a base de um padrão de busca remota: `AsyncCombobox`, `OptionsQueryDto` e `GET /legendarios/options`. O endpoint de Legendários já limita o payload, normaliza a busca e intersecta o resultado com o `AccessPolicyService`. Porém, o componente ainda depende de mouse, não diferencia erro de resultado vazio, sempre oferece limpeza e deixa cada consumidor repetir a adaptação do payload. Os formulários de edição de usuário e convite contêm hoje o mesmo mapeamento de opções.

As abas Igrejas e Líderes Espirituais carregam listas completas sem termo de busca. `GET /churches/spiritual-leaders` já restringe as igrejas pelo escopo do usuário, enquanto `GET /churches` ignora o usuário autenticado e retorna todas as igrejas não excluídas. Igrejas possuem aliases normalizados em `ChurchAlias.normalizedAlias`, mas o nome canônico ainda não tem uma representação persistida sem acento.

Além desse recorte, há seletores de Legendário, Igreja, Usuário, Equipe e TOP que carregam até 100 registros, filtram localmente ou aceitam UUID manual. Migrá-los todos de uma vez aumentaria o risco em fluxos com regras próprias; esta mudança registra o inventário e entrega apenas a fundação reutilizável, a consolidação dos dois consumidores já migrados e a busca das duas listagens de Igrejas.

## Goals / Non-Goals

**Goals:**

- tornar o combobox assíncrono acessível por teclado e explícito nos estados de carregamento, vazio e erro;
- oferecer um adaptador canônico de Legendários que preserve o contrato de busca, apresentação e escopo;
- eliminar a duplicação entre edição de usuário e convite;
- permitir busca remota nas abas Igrejas e Líderes Espirituais sem ampliar a visibilidade do usuário;
- localizar Igrejas por nome canônico ou alias, sem diferença de acento e caixa;
- manter um inventário verificável e uma ordem de migração para os demais seletores.

**Non-Goals:**

- migrar nesta mudança todos os seletores inventariados;
- criar um endpoint genérico que receba nomes arbitrários de entidades;
- introduzir busca fuzzy, ranking, Elasticsearch ou uma dependência externa de busca;
- paginar as duas listagens de Igrejas ou alterar o formato de suas respostas;
- alterar autenticação, permissões, CORS, refresh token ou o modelo geral de escopos;
- trocar o texto livre legado de líder espiritual por um cadastro obrigatório.

## Decisions

### 1. Manter um componente genérico e criar um adaptador por domínio

`AsyncCombobox` continuará conhecendo apenas `ComboboxOption`, estado de seleção e uma função `fetchOptions`. O domínio de Legendários fornecerá um adaptador/componente em `apps/web/src/features/legendarios` que chama `GET /legendarios/options` e converte `metadata` em `label` e `sublabel`. Edição de usuário e convite consumirão esse adaptador, sem declarar mapeamentos locais.

Isso preserva o reuso do componente para Equipes, Igrejas e outros domínios sem acoplar a UI genérica aos contratos da API. A alternativa de embutir chamadas de Legendários em `AsyncCombobox` foi rejeitada porque criaria dependência de domínio em `components/ui`.

### 2. Completar o padrão ARIA de combobox sem adicionar biblioteca

O gatilho, o campo de busca, a lista e as opções terão identificadores e relações ARIA estáveis. Ao abrir, a busca recebe foco; `ArrowDown`/`ArrowUp` movimentam a opção ativa, `Enter` seleciona, `Escape` fecha e devolve foco ao gatilho, e `Tab` encerra o popup sem capturar a navegação. A opção ativa será refletida por `aria-activedescendant` e visualmente destacada. Mouse, clique fora e estado desabilitado permanecem suportados.

O componente passará a expor limpeza configurável, preservando o comportamento atual como padrão para consumidores opcionais. Rejeitamos substituir o componente agora por uma biblioteca externa porque a interação necessária é pequena, não exige nova dependência e já possui base e testes locais.

### 3. Tratar requisições obsoletas e erros como estados distintos

O contador de requisições existente continuará sendo a barreira anti-race: somente a resposta, erro ou finalização associados à requisição mais recente poderão alterar a tela. Um erro de `fetchOptions` não será apresentado como lista vazia; o componente exibirá estado de erro e permitirá nova tentativa ao alterar o termo ou reabrir.

O valor selecionado e seu rótulo não dependerão de estar presentes na página atual de resultados. `value` e `selectedLabel` permanecem a fonte de verdade para edição, e o adaptador de Legendários centralizará a resolução/apresentação do rótulo quando necessária.

### 4. Evoluir os endpoints existentes com query opcional

`GET /churches` e `GET /churches/spiritual-leaders` receberão um DTO de query com `search?: string`. A ausência ou normalização vazia de `search` preservará o formato e a ordenação atuais. Não será criado um endpoint paralelo apenas para as abas.

Ambos os métodos resolverão o escopo com `AccessPolicyService`. Para usuário não administrador, a cláusula produzida por `buildChurchWhere(scope)` será combinada por `AND` com a cláusula de busca. A busca nunca substituirá nem relaxará o escopo. O controller de `GET /churches` passará o `CurrentUser` ao service; o endpoint de Líderes Espirituais manterá essa passagem.

### 5. Persistir `Church.normalizedName` e reutilizar a normalização compartilhada

Será adicionada a coluna obrigatória `Church.normalizedName`, preenchida com `normalizeName` de `@central-da-manada/shared` na criação e sempre que o nome mudar. Uma nova migration fará o backfill dos registros existentes antes de impor a obrigatoriedade e criará o índice previsto no schema. A busca normalizará o termo uma única vez e usará:

- `normalizedName contains termo` para o nome canônico;
- `aliases.some.normalizedAlias contains termo` para aliases;
- no endpoint de Líderes Espirituais, também nome do usuário vinculado e o nome livre legado do líder, com comparação case-insensitive.

A relação `aliases.some` retorna a Igreja canônica uma única vez mesmo quando mais de um alias corresponde. A alternativa de carregar todas as Igrejas e normalizar em memória foi rejeitada porque mantém o problema de lista cheia e torna o escopo/limite difíceis de garantir. A alternativa de instalar `unaccent`/trigram fica fora desta entrega; o campo normalizado mantém a semântica correta com a infraestrutura atual.

### 6. Buscar no backend nas duas páginas com debounce e barreira anti-race

Cada página manterá o termo digitado e usará o debounce já existente no projeto. Mudanças no termo chamarão seu endpoint com `search`; um identificador monotônico impedirá resposta anterior de sobrescrever a mais recente. Carregamento inicial, busca em andamento, resultado vazio e erro terão mensagens distintas. Na aba Líderes Espirituais, os cards-resumo refletirão o conjunto retornado para o filtro atual, evitando uma segunda consulta ou alteração do contrato da API.

### 7. Inventário e sequência de migração

O inventário auditado nesta mudança é:

| Grupo | Pontos atuais | Situação | Sequência sugerida |
| --- | --- | --- | --- |
| Usuários | `features/users/user-form.tsx`; `app/dashboard/usuarios/convidar/page.tsx` | já usa busca remota, mas duplica adaptador | nesta mudança |
| Equipes | `features/teams/team-form.tsx`; `team-member-form.tsx` | carrega 100 Legendários em `<select>` | change por domínio 1 |
| TOP - cadastro e pessoas | `features/tops/top-form.tsx`; `top-participant-form.tsx`; `top-servant-form.tsx`; `top-team-form.tsx` | carrega 100 Legendários e reutiliza `PersonSelect` local | change por domínio 2 |
| TOP - famílias/comunicação | `features/tops/top-families-section.tsx`; `features/communications/communication-form.tsx` | carrega opções com limite 100 | change por domínio 3 |
| Ações sociais | `app/dashboard/acoes-sociais/[id]/page.tsx` | exige `ID do Legendário` manual | change por domínio 4, prioritário por UX |
| Igrejas em Legendários | `features/legendarios/legendario-form.tsx`; `app/dashboard/legendarios/page.tsx` | carrega lista completa de Igrejas | change por domínio 5 |
| Usuário líder da Igreja | `features/churches/church-form.tsx` | carrega lista completa de Usuários | change por domínio 6, após contrato de opções de Usuário |
| Controle de acessos | `features/access-control/access-control-panel.tsx` | combobox sobre cache local de Cidade/Equipe/TOP/Igreja | change por domínio 7, preservando semântica de escopos |
| Equipes (filtro) | `features/teams/team-filter.tsx` | já usa `AsyncCombobox` + busca remota | referência já migrada; apenas regressão |

Cada change posterior deverá confirmar o endpoint de opções, a regra de escopo, a preservação do valor em edição e os testes críticos do domínio. O inventário é uma fotografia verificável da base no momento desta proposta; novos pontos encontrados durante implementação devem ser adicionados antes de encerrar a tarefa correspondente.

**Revisão final (2026-07-21):** nova varredura por `AsyncCombobox`, `getLegendarioOptions`/`fetchLegendarioOptions`/`LegendarioCombobox`, cargas de listagem e campos de UUID manual. Nenhum ponto ausente: os consumidores remanescentes (`communications/communication-form`, `tops/*`, `features/access-control/access-control-panel`, seletores de Igreja/Usuário em `legendarios`/`churches`, entrada manual em `acoes-sociais/[id]`) já constam nos grupos posteriores. Migrados neste change: `features/users/user-form` e `usuarios/convidar` (adaptador canônico `LegendarioCombobox`) + as listagens `igrejas` e `lideres-espirituais` (busca escopada). `teams/team-filter` permanece como referência já migrada. Demais consumidores permanecem sem alteração de runtime.

## Risks / Trade-offs

- [Migration com nomes existentes] → fazer backfill dentro da nova migration antes de tornar `normalizedName` obrigatório e validar uma amostra com acentos/espaços.
- [Busca parcial com `contains` pode não aproveitar índice B-tree] → manter payload e escopo enxutos nesta fase, medir a listagem real e considerar trigram somente com evidência de lentidão.
- [Combinação incorreta de `OR` pode ignorar escopo] → montar `where.AND = [scopeWhere, { OR: searchClauses }]` e testar explicitamente usuário restrito com termo que também existe fora do escopo.
- [Resposta antiga sobrescrever busca nova] → cobrir a barreira anti-race com promises resolvidas fora de ordem nos testes das páginas e do combobox.
- [Rótulo selecionado desaparecer na edição] → manter `selectedLabel` independente das opções retornadas e testar valor ausente na busca atual.
- [Resumo de Líderes variar durante a busca] → declarar e testar que os cards representam o resultado filtrado, não totais globais.
- [Inventário envelhecer] → usar paths concretos e exigir revisão do inventário em cada change posterior.

## Migration Plan

1. Criar a migration de `Church.normalizedName`, fazer o backfill e atualizar Prisma/schema e caminhos de criação/edição.
2. Evoluir DTO, controller e service de Igrejas, primeiro com testes de escopo e busca por nome/alias/líder.
3. Evoluir e testar `AsyncCombobox` e o adaptador canônico de Legendários.
4. Migrar edição de usuário e convite para o adaptador.
5. Adicionar busca e testes anti-race às páginas Igrejas e Líderes Espirituais.
6. Executar testes focados, lint, build e validação manual dos critérios das specs.

Rollback de aplicação: reverter os consumidores e endpoints para ignorarem `search`, mantendo a coluna nova sem uso. Rollback de banco, se realmente necessário, remove apenas `normalizedName` e seu índice depois de voltar a aplicação; aliases e dados canônicos não são alterados.

## Open Questions

Nenhuma questão bloqueante. A necessidade de trigram/paginação será decidida por medição após esta entrega, não por antecipação.
