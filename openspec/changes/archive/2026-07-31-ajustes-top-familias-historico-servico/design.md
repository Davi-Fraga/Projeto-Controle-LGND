## Context

Esta change cruza os módulos de TOPs, Famílias e Legendários e depende da fundação criada em `busca-reutilizavel-entidades-e-listagens`. Hoje `TopFamiliesSection` carrega até 100 participantes e até 100 Legendários na montagem: participantes alimentam um `<select>` para novo membro e Legendários alimentam os seletores de representante/sub-representante. O backend já oferece `GET /tops/:id/participants/options`, mas a busca considera apenas `fullName`, não exclui pessoas já ligadas a Família ativa e não usa a normalização canônica de `Legendary.searchText`.

O vínculo de Família possui dois campos textuais, `TopFamilyMember.notes` e `sourceNotes`. A UI cria e exibe ambos, e o relatório escolhe `sourceNotes ?? notes`. Para novos vínculos, o usuário quer uma única observação geral e o campo deve começar vazio.

No perfil do Legendário, o formulário apresenta o checkbox “Já serviu como service?” e apenas uma linha de TOP/equipe/função/observação. O carregamento usa `legendario.topServants?.[0]` e o DTO expõe `serviceTopEventId`, `serviceTeamId`, `serviceRole` e `serviceNotes`. Entretanto, o banco nunca guardou esse dado como quatro colunas escalares em `Legendary`: `handleServiceInfo` já cria/atualiza uma linha em `TopServant`, e o schema possui `Legendary.topServants TopServant[]`.

### Modelo atual verificado

```text
Legendary
  id
  ...
  topServants: TopServant[]        # relação 1:N já existente

TopServant
  id
  topEventId   -> TopEvent.id
  legendaryId  -> Legendary.id
  teamId?      -> Team.id
  role?
  status
  notes?
  deletedAt?

TopFamilyMember
  id
  topEventId
  topFamilyId
  topParticipantId -> TopParticipant.id
  notes?
  sourceNotes?                      # duplicação a consolidar
  status / needsReview / datas
```

O gargalo de “um TOP servido” é, portanto, contratual e visual, não cardinalidade do banco. Criar uma nova tabela de histórico duplicaria `TopServant`, exigiria sincronização permanente e produziria duas fontes de verdade para o mesmo fato.

## Goals / Non-Goals

**Goals:**

- reutilizar o `AsyncCombobox` e o adaptador canônico de Legendário da change anterior em toda seleção de pessoa tocada por esta entrega;
- buscar candidatos a membro apenas entre participantes elegíveis do TOP atual;
- manter a busca limitada, normalizada, anti-race e protegida pelo escopo de TOP;
- reduzir o vínculo de Família a uma observação geral sem perder `notes` ou `sourceNotes` históricos;
- exibir e gerenciar todos os `TopServant` de um Legendário no perfil;
- manter `TopServant` como única relação 1:N de serviço em TOP;
- realizar mudanças de schema/dados em fases, com preview, backup, validação e rollback explícitos.

**Non-Goals:**

- criar outro componente genérico de autocomplete ou outro endpoint de busca de pessoas;
- permitir adicionar à Família alguém que não seja participante do TOP;
- converter `firstTopFamilyId` em histórico de Famílias ou mudar a semântica de “primeiro TOP”;
- unificar `TopParticipant` (quem subiu) e `TopServant` (quem serviu);
- criar uma tabela `LegendaryTopService` paralela a `TopServant`;
- migrar todos os seletores de pessoa do módulo TOP fora dos formulários de Família tocados aqui;
- fazer fuzzy search, alterar autenticação, CORS, refresh token ou regras globais de permissão.

## Decisions

### 1. Dependência explícita da change de busca reutilizável

Esta change não implementará uma segunda versão de combobox. Ela depende de `busca-reutilizavel-entidades-e-listagens` estar aplicada antes ou no mesmo release. O `AsyncCombobox` fornecerá debounce, anti-race, teclado, loading/vazio/erro, preservação de rótulo e limpeza configurável.

Os seletores de representante e sub-representante da Família usarão diretamente o adaptador canônico de Legendário daquela change (`GET /legendarios/options`, payload limitado, normalização e `AccessPolicyService`). O seletor de membro usará o mesmo componente visual, mas com um adaptador do domínio TOP que chama o endpoint já existente de opções de participantes, pois o valor persistido é `TopParticipant.id`, não `Legendary.id`.

Alternativa rejeitada: adaptar o endpoint geral de Legendários no frontend e depois conferir o TOP. Isso carregaria candidatos inválidos, duplicaria a regra de elegibilidade e permitiria requisições manuais inconsistentes.

### 2. Definição autoritativa de “subiu neste TOP”

Para inclusão em Família, uma pessoa elegível MUST possuir:

```text
TopParticipant.topEventId = :id
TopParticipant.deletedAt IS NULL
TopParticipant.status != CANCELLED
nenhum TopFamilyMember ativo e não excluído no mesmo TOP
```

`TopServant` não qualifica a pessoa como alguém que “subiu”, e um Legendário sem `TopParticipant` naquele evento não aparece. O backend continua revalidando esses predicados em `addFamilyMember`; o autocomplete é conveniência, não barreira de segurança.

`GET /tops/:id/participants/options` será evoluído com um parâmetro explícito de contexto, por exemplo `availableForFamily=true`, no DTO derivado de `OptionsQueryDto`. Sem esse parâmetro, o endpoint preserva o comportamento compatível para outros consumidores. Com ele, filtra associações ativas por `familyMemberships.none` antes de aplicar `take`.

### 3. Busca normalizada no participante relacionado

O termo será normalizado com o helper compartilhado usado pela busca de Legendários. A query pesquisará `TopParticipant.legendary.searchText contains normalizedTerm`; como `searchText` já agrega nome, cidade e número LGND, o resultado permanece tolerante a acento/caixa e permite desambiguação sem criar coluna nova.

O retorno continuará no contrato enxuto `{ id, label, value, metadata }`, com `value = TopParticipant.id` e `metadata.legendaryId/fullName/lgndNumber/city`. O limite padrão do autocomplete será 20.

Alternativa rejeitada: `fullName contains` com `mode: insensitive`, porque não é tolerante a acentos e diverge do padrão aprovado.

### 4. Escopo é o do recurso TOP

A rota já está sob `JwtAuthGuard`, `PermissionsGuard` e `TopScopeGuard`. `TopScopeGuard` resolve o usuário pelo `AccessPolicyService` e chama `assertTopAllowed(scope, topId)` para todo sub-recurso `:id`; esse é o escopo autoritativo da lista de participantes do evento.

Não será aplicado adicionalmente `buildLegendaryWhere(scope)` dentro da relação, pois um usuário com escopo explícito de TOP pode não ter cidade/igreja e receberia lista vazia mesmo estando autorizado ao evento. O endpoint exige `tops.participants.read`, o guard nega TOP fora de escopo e a mutation mantém `tops.families.members.add`.

### 5. Uma observação geral, vazia para novo vínculo

O contrato público de `TopFamilyMember` manterá apenas `notes`. O formulário de inclusão terá um campo “Observações” inicializado com `''`; não copiará texto do participante, documento legado, Família ou valor anterior. Após salvar, o estado volta a `''`.

Dados históricos serão mesclados de forma determinística:

| Estado atual | `notes` após expansão |
| --- | --- |
| ambos vazios | `NULL` |
| somente `notes` | `trim(notes)` |
| somente `sourceNotes` | `trim(sourceNotes)` |
| ambos iguais após trim | uma única cópia |
| ambos diferentes | `trim(notes) + duas quebras de linha + trim(sourceNotes)` |

Não serão adicionados prefixos artificiais ao conteúdo. Durante a fase de expansão, `sourceNotes` será zerado depois de copiado, mas a coluna continuará existente para permitir rollback da aplicação. O relatório passará a ler somente `notes`.

### 6. Reutilizar `TopServant[]` como histórico 1:N

#### Modelo proposto

```text
Legendary 1 ───────< TopServant >────── 1 TopEvent
                         |
                         └──────────── 0..1 Team

Regras:
- várias linhas por Legendary, desde que sejam TOPs diferentes;
- no máximo uma linha ativa por (topEventId, legendaryId);
- cancelamento é soft delete/status, preservando histórico e auditoria;
- TopParticipant e TopServant continuam mutuamente exclusivos no mesmo TOP.
```

Não haverá backfill de campos escalares porque esses campos nunca existiram no banco. Cada “TOP único” salvo pelo formulário atual já é uma linha em `TopServant` e aparecerá automaticamente quando a UI deixar de usar `[0]`.

O schema receberá:

- índice de leitura por `legendaryId`, status/deleted e data;
- índice único parcial para impedir mais de um serviço ativo por `(topEventId, legendaryId)`, alinhado a `ensureServantAvailable`.

Antes do índice único, o preview deve listar duplicidades ativas. Qualquer duplicidade bloqueia a migration e exige decisão humana; a migration não apagará nem escolherá uma linha automaticamente.

Alternativa rejeitada: criar `LegendaryTopParticipation`. Além de duplicar dados, o nome misturaria subida (`TopParticipant`) com serviço (`TopServant`).

### 7. O perfil compõe os endpoints canônicos de servos

O detalhe de Legendário já inclui todos os `topServants` ativos com `topEvent` e `team`. A UI deixará de mapear `[0]` e renderizará uma coleção ordenada por data do TOP/data de criação. A frase será “Já serviu em algum TOP”.

Inclusão, alteração e cancelamento usarão os endpoints canônicos existentes:

- `POST /tops/:topId/servants`;
- `PATCH /tops/:topId/servants/:servantId`;
- `PATCH /tops/:topId/servants/:servantId/cancel`.

Isso preserva `TopScopeGuard`, permissões `tops.servants.*`, validação de equipe vinculada, exclusão mútua participante/servo, audit e `LegendaryHistory`. A seção fica somente leitura quando o usuário pode ver o perfil mas não possui a permissão de mutação correspondente.

Os campos escalares legados permanecem aceitos por uma janela de compatibilidade, mas a nova web não os envia. `handleServiceInfo` será marcado como compatibilidade e removido apenas na fase de contrato, depois que rollback da web antiga deixar de ser necessário.

### 8. Rótulo “Família” sem mudança semântica

O formulário, a mensagem de validação e o perfil trocarão “Família no primeiro TOP” por “Família”. `firstTopFamilyId` continuará ligado a `firstTopEventId`, e o backend continuará validando que a Família pertence ao primeiro TOP selecionado. A alteração é de copy, não de modelagem.

## Risks / Trade-offs

- [Nova change depende de fundação ainda não implementada] → tornar a dependência tarefa bloqueante e não copiar o componente para avançar isoladamente.
- [Autocomplete mostra candidato que deixou de ser elegível antes do submit] → revalidar TOP/status/Família no backend e retornar erro de negócio; atualizar opções após sucesso ou conflito.
- [Aplicar escopo geográfico além do escopo de TOP esvazia a lista] → usar `TopScopeGuard`/`assertTopAllowed` como escopo do sub-recurso e testar usuário com somente `topIds`.
- [Mescla de duas observações perde a separação visual original] → preview quantifica casos com ambos diferentes, backup é obrigatório e a concatenação preserva integralmente os dois textos.
- [Duplicidades ativas impedem índice único] → preview bloqueante e resolução manual auditada; nunca apagar automaticamente.
- [Rollback após remover colunas quebra app antiga] → expansão e contrato em releases separados; remover `sourceNotes` e DTOs escalares somente após janela de observação e aprovação.
- [Salvar vários serviços como uma operação em lote causa sucesso parcial] → cada item usa CRUD canônico independente, apresenta erro por linha e atualiza a coleção após confirmação do backend.

## Migration Plan

### Fase 0 — preview e aprovação operacional

1. Executar script SQL somente leitura e salvar o resultado como evidência de deploy:
   - total de `TopFamilyMember` com `notes`, `sourceNotes`, ambos iguais e ambos diferentes;
   - amostra identificada dos casos com ambos diferentes;
   - total de `TopServant` por Legendário e por TOP;
   - duplicidades ativas por `(topEventId, legendaryId)`;
   - referências órfãs, que devem ser zero pelas FKs.
2. Bloquear o deploy se houver duplicidade ativa de `TopServant` ou se a amostra de observações não tiver sido revisada.
3. Gerar backup de produção com `pg_dump` em formato custom incluindo banco/migration history, registrar timestamp, tamanho e checksum e testar que o arquivo é legível.

### Fase 1 — expansão compatível

1. Em transação e com blocos condicionais idempotentes:
   - mesclar `sourceNotes` em `notes` pela tabela de decisão;
   - definir `sourceNotes = NULL` após a cópia;
   - criar, com `IF NOT EXISTS`, o índice de histórico e o índice único parcial de serviço ativo.
2. Manter a coluna `sourceNotes` e os campos escalares de serviço no DTO durante a janela de rollback.
3. Publicar API/web novas: UI lê `topServants[]`, usa endpoints canônicos e grava apenas `notes`.
4. Validar pós-deploy:
   - contagem de `TopFamilyMember` inalterada;
   - `sourceNotes` não vazio igual a zero;
   - textos previstos presentes em `notes`;
   - contagem/ids de `TopServant` inalterados;
   - perfis com 0, 1 e vários serviços carregam corretamente.

### Fase 2 — contrato

1. Após janela de observação e nova aprovação, fazer backup incremental/completo.
2. Remover `sourceNotes` do Prisma/shared/DTO e executar `DROP COLUMN IF EXISTS` em migration separada.
3. Remover os campos escalares de serviço e `handleServiceInfo` somente quando a web anterior não precisar mais ser suportada.
4. Reexecutar testes, contagens e smoke tests de Família/perfil.

### Rollback

- Antes da Fase 2: reimplantar a aplicação anterior; a coluna ainda existe e os textos permanecem consolidados em `notes`. O backup permite restaurar a separação original se indispensável.
- Depois da Fase 2: não fazer rollback binário para versão que exige `sourceNotes`; aplicar forward-fix ou restaurar o backup completo em janela controlada.
- A relation `TopServant` nunca é recriada nem copiada, então rollback não move nem perde histórico de serviço.

## Open Questions

Nenhuma questão bloqueante para aprovação. O tempo exato da janela entre Fase 1 e Fase 2 deve ser escolhido no plano de deploy de produção.
