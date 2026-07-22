## Context

A capability `legendario-autocomplete` já existe e entregou `GET /legendarios/options`, `AsyncCombobox` e os primeiros usos em edição/convite de usuário. O endpoint atual já atende ao núcleo do novo requisito:

- `OptionsQueryDto` aceita `search`, `limit` (padrão 20, máximo 100) e `activeOnly`;
- `LegendariosService.options` usa o mesmo `buildSearchOr` da listagem, sobre `Legendary.searchText`, que inclui nome, cidade e número LGND normalizados;
- o `where` combina a busca com `AccessPolicyService.buildLegendaryWhere(scope)` antes do `findMany`;
- o payload é enxuto: id/value, nome e metadata com número, cidade e igreja.

O problema restante é transversal no frontend. Há cargas antecipadas de 100 Legendários, selects limitados que podem omitir resultados, adaptadores duplicados e dois campos que pedem UUID manual. O `AsyncCombobox` já possui debounce de 300 ms e guarda anti-race, mas ainda não implementa navegação completa por teclado nem semântica ARIA de cada opção.

### Inventário confirmado

| Superfície | Campos de Legendário | Estado atual |
|---|---:|---|
| `features/tops/top-form.tsx` | 6: representante, sub-representante, coordenador geral e três coordenações de famílias | `PersonSelect` + `searchLegendarios(perPage: 100)` |
| `features/tops/top-families-section.tsx` | 2: representante e sub-representante | `<select>` + `/legendarios/options?limit=100` |
| `features/tops/top-team-form.tsx` | 2: coordenador e subcoordenador da equipe no TOP | `PersonSelect` + listagem de 100 |
| `features/tops/top-participant-form.tsx` | 1: participante | `PersonSelect` + listagem de 100 |
| `features/tops/top-servant-form.tsx` | 1: servo | `PersonSelect` + listagem de 100 |
| `features/teams/team-form.tsx` | 2: coordenador e subcoordenador | `<select>` + listagem de 100 |
| `features/teams/team-member-form.tsx` | 1: membro | `<select>` + listagem de 100; bloqueado na edição |
| `features/communications/communication-form.tsx` | 1: destinatário individual | `<select>` + opções limitadas a 100 |
| `features/users/user-form.tsx` | 1: Legendário vinculado | `AsyncCombobox`, com adaptador local duplicado |
| `dashboard/usuarios/convidar/page.tsx` | 1: Legendário do convite | `AsyncCombobox`, com adaptador local duplicado |
| `features/social-actions/social-action-form.tsx` | 1: responsável | entrada manual de UUID |
| `dashboard/acoes-sociais/[id]/page.tsx` | 1: participante | entrada manual de UUID |

Total: **20 campos em 12 superfícies**.

Não entram no inventário: `Church.spiritualLeaderUserId` (seleciona `User`), membro de família (seleciona `TopParticipant`), seletores de equipe/TOP/cidade, filtros do organograma, escopos de acesso, sugestões informativas de ação social e pré-inscrição (a UI atual aprova sem escolher Legendary existente).

## Goals / Non-Goals

**Goals:**

- Tornar um componente de domínio a única forma de selecionar diretamente um Legendário.
- Buscar sob demanda por nome ou número LGND no endpoint existente, com limite, debounce e anti-race.
- Garantir que as sugestões sejam filtradas pelo escopo resolvido pelo `AccessPolicyService`.
- Preservar ID e rótulo atuais na edição; diferenciar campos opcionais e obrigatórios.
- Oferecer interação completa por teclado e semântica de combobox/listbox.
- Remover cargas antecipadas de Legendários e entradas manuais de UUID dos 12 consumidores.

**Non-Goals:**

- Criar outro endpoint, outra normalização, migration ou índice.
- Alterar payloads de mutação, regras de domínio de TOP/equipe/ação social ou permissões.
- Converter seletores que não escolhem diretamente `Legendary`.
- Implementar paginação infinita; o contrato continua retornando os primeiros N resultados e o usuário refina a busca.

## Decisions

### 1. Reusar `GET /legendarios/options` sem endpoint paralelo

O endpoint já projeta poucos campos, limita resultados, pesquisa no conjunto completo antes do limite e aplica escopo. A implementação deve apenas consolidar seu cliente frontend e ampliar testes. Criar `/autocomplete` ou usar `GET /legendarios` duplicaria normalização/escopo ou voltaria a trafegar payload paginado completo.

### 2. Separar infraestrutura genérica e componente de domínio

`AsyncCombobox` permanece como infraestrutura genérica e recebe as correções de acessibilidade. Um novo `LegendarioCombobox`, em `features/legendarios`, encapsula:

- chamada a `getLegendarioOptions(search, 20)`;
- conversão de metadata em nome + cidade/igreja/número;
- resolução/apresentação do valor atual;
- contrato de opcionalidade, rótulo de vazio, desabilitado e callback por ID.

Assim, consumidores não repetem fetchers nem conhecem o shape de `OptionItem`. Colocar a chamada diretamente no componente genérico foi rejeitado porque acoplaria infraestrutura de UI ao domínio de Legendários.

### 3. Valor atual vem do registro autorizado

O componente será controlado por `value` e aceitará o rótulo/opção atual. TOPs, famílias, equipes, participantes, servos e ações sociais já retornam suas relações `Legendary`, portanto devem passar nome e metadata sem nova listagem. Onde apenas o ID estiver disponível, como no contrato atual de usuário, pode-se usar o `GET /legendarios/:id` já existente e escopado; não haverá lookup sem autorização.

Se um registro autorizado referenciar alguém que já não aparece nas sugestões ativas, o valor atual continua visível até o usuário trocar ou limpar. A pessoa fora do escopo não deve reaparecer nas buscas; o rótulo só pode vir da resposta do registro que o usuário já foi autorizado a editar.

### 4. Opcionalidade é explícita

Campos opcionais exibem uma ação configurável de limpar (`Não definido` ou `Nenhum`) e enviam o mesmo vazio já tratado pelos formulários. Campos obrigatórios não exibem essa ação e bloqueiam submit sem valor. O membro de equipe continua desabilitado na edição. Nenhum DTO ou payload muda.

### 5. Teclado e ARIA são resolvidos no `AsyncCombobox`

O componente genérico passa a manter opção ativa e a suportar ArrowDown/ArrowUp, Enter, Escape e retorno de foco. Trigger, input, listbox e options recebem IDs e atributos (`role=combobox`, `aria-controls`, `aria-expanded`, `aria-activedescendant`, `role=option`, `aria-selected`) coerentes. Clique fora e mouse continuam funcionando.

### 6. Escopo permanece no backend e falha fechado

Nenhum consumidor aplica filtro de escopo local. Cada busca chama o endpoint autenticado, que resolve o usuário e adiciona `buildLegendaryWhere(scope)` ao `where`. Testes do serviço devem provar que um usuário restrito recebe o `AND` de escopo e que um resultado fora desse conjunto não é retornado. Isso evita que UI ou cache se tornem fronteira de segurança.

### 7. Migração completa é verificável

Cada uma das 12 superfícies terá teste focado no uso do componente e na preservação de seu contrato. Uma busca estática de regressão deve garantir que os consumidores não mantenham `PersonSelect`, listas antecipadas de Legendários, `<select>` direto de Legendary nem placeholders de UUID.

## Risks / Trade-offs

- **[Rótulo atual ausente em contrato legado]** -> usar relação já autorizada ou detalhe escopado; nunca buscar catálogo global.
- **[Usuário tem permissão de editar o formulário, mas não `legendarios.read`]** -> manter o contrato de autorização atual, já exigido pelas listagens existentes; validar a matriz de permissões durante a implementação e registrar qualquer incompatibilidade antes de alterá-la.
- **[Resposta antiga sobrescreve busca nova]** -> preservar a guarda anti-race por request ID no componente genérico.
- **[Lista limitada não contém o nome desejado]** -> exibir os primeiros 20 e manter busca por digitação; não aumentar para 100 nem carregar tudo ao abrir.
- **[Regressão em consumidores genéricos do `AsyncCombobox`]** -> testes do componente cobrem mouse e teclado, e os usos de escopo de acesso permanecem no contrato genérico.

## Migration Plan

1. Reforçar testes de `LegendariosService.options` para nome, número, limite e escopo.
2. Completar acessibilidade e testes de `AsyncCombobox`.
3. Criar `LegendarioCombobox` e testes de seleção, valor atual, limpeza e obrigatório.
4. Migrar consumidores por domínio: usuários, TOPs, equipes, comunicações e ações sociais, removendo os fetches integrais.
5. Executar testes focados por consumidor, varredura estática, lint, testes e build do monorepo.

Rollback: os payloads e endpoint não mudam; a reversão é somente frontend. Não há migração de dados.

## Open Questions

Nenhuma decisão funcional pendente. A implementação só começa após aprovação destes artefatos.
