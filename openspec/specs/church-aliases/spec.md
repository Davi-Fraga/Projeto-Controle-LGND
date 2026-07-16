# church-aliases Specification

## Purpose
TBD - created by archiving change church-name-aliases. Update Purpose after archive.
## Requirements
### Requirement: Igreja canônica pode ter N aliases

O sistema SHALL permitir que cada `Church` canônica tenha zero ou mais apelidos (aliases). Cada alias SHALL armazenar sua forma normalizada (via a normalização existente `normalizeName`) e SHALL ser globalmente único por forma normalizada.

#### Scenario: Alias vinculado a uma igreja
- **WHEN** um alias "PIB" é criado para a igreja "Primeira Igreja Batista (PIB) — Caldas Novas"
- **THEN** o alias fica persistido com sua forma normalizada e vinculado ao `churchId` daquela igreja

#### Scenario: Forma normalizada é única globalmente
- **WHEN** já existe um alias cuja forma normalizada é "pib"
- **THEN** o sistema NÃO permite persistir outro alias com a mesma forma normalizada apontando para igreja diferente

### Requirement: Resolução de igreja casa por nome canônico OU alias

O serviço de sincronização SHALL resolver o nome de igreja de uma resposta comparando a forma normalizada contra o nome canônico E contra os aliases. O nome canônico SHALL ter precedência sobre alias. Um match por alias SHALL vincular a resposta ao `churchId` canônico. A mesma função de resolução SHALL ser usada pelo webhook ao vivo e pelo backfill (uma lógica só).

#### Scenario: Variante casa por alias
- **WHEN** uma resposta traz churchName "Primeira Batista" e existe um alias com forma normalizada "primeira batista" vinculado à PIB
- **THEN** a resposta é vinculada à igreja canônica PIB (não fica sem igreja)

#### Scenario: Canônico tem precedência sobre alias
- **WHEN** o nome normalizado da resposta casa com o nome canônico de uma igreja
- **THEN** a resolução retorna essa igreja pelo canônico, sem consultar aliases

#### Scenario: Mesmo caminho no webhook e no backfill
- **WHEN** a mesma resposta é processada pelo webhook ao vivo e, alternativamente, pelo backfill
- **THEN** ambos usam a mesma função de resolução e produzem o mesmo vínculo de igreja

### Requirement: Sem match mantém needsReview e nunca cria igreja no runtime

Quando o nome de igreja não casa nem com canônico nem com alias, o sistema SHALL manter o comportamento atual: registrar a issue e marcar `needsReview`, sem criar igreja nem alias automaticamente. O runtime (webhook) SHALL NUNCA criar aliases.

#### Scenario: Variante desconhecida vai para revisão
- **WHEN** uma resposta traz um churchName que não casa com nenhum canônico nem alias
- **THEN** o legendário é marcado `needsReview` com issue de igreja e nenhuma igreja/alias é criada

#### Scenario: Webhook nunca cria alias
- **WHEN** o webhook ao vivo processa qualquer resposta
- **THEN** nenhum alias é criado automaticamente, independentemente do resultado do match

### Requirement: Aliases populados a partir da curadoria de forma idempotente

O passo `--apply` do backfill de igrejas SHALL gravar cada `variant` de `prisma/data/churches-curation.json` como alias do seu `canonical`, exceto quando a variante normalizada é igual ao canônico normalizado. A gravação SHALL ser idempotente por forma normalizada: reexecutar não duplica aliases.

#### Scenario: Variantes viram aliases do canônico
- **WHEN** o `--apply` processa um cluster com canônico C e variantes [V1, V2]
- **THEN** V1 e V2 são gravados como aliases de C (as que diferem do canônico normalizado)

#### Scenario: Reexecução não duplica
- **WHEN** o `--apply` é rodado uma segunda vez sobre a mesma curadoria
- **THEN** nenhum alias é duplicado e os já existentes permanecem inalterados

### Requirement: Regra de colisão de alias

O sistema SHALL impedir que o mesmo alias (por forma normalizada) vincule a duas igrejas diferentes. Na criação: se o alias já existe para a MESMA igreja, é no-op; se existe para OUTRA igreja, ou se sua forma normalizada é igual ao nome canônico de outra igreja, a criação SHALL ser pulada e reportada (identificada por nome canônico, sem dado pessoal), preservando o vínculo existente.

#### Scenario: Colisão entre igrejas é reportada, não sobrescreve
- **WHEN** tenta-se criar o alias "Batista" para a igreja B, mas "batista" já é alias da igreja A
- **THEN** o vínculo com A é preservado, a criação para B é pulada e a colisão é reportada por nome canônico

#### Scenario: Alias igual a canônico de outra igreja é pulado
- **WHEN** tenta-se criar um alias cuja forma normalizada é igual ao nome canônico de outra igreja
- **THEN** a criação é pulada e reportada (o canônico já resolve)

#### Scenario: Alias idêntico para a mesma igreja é idempotente
- **WHEN** tenta-se criar um alias que já existe para a MESMA igreja
- **THEN** a operação é um no-op, sem erro e sem duplicação

### Requirement: Reprocessamento retroativo reduz needsReview de igreja

Após popular os aliases, o sistema SHALL oferecer um passo idempotente de reconciliação de referências que reusa a função de resolução de igreja para atualizar legendários cuja igreja antes não casava e agora casa via alias, recalculando `needsReview`, sem alterar identidade nem a marca de last-write-wins. Um re-run puro do backfill (que pula linhas por idempotência de `responseId`/timestamp) NÃO é suficiente e não deve ser o mecanismo.

#### Scenario: Variante antes sem match passa a casar após aliases
- **WHEN** um legendário estava `needsReview` por igreja sem match e depois um alias correspondente é criado, e o passo de reconciliação roda
- **THEN** o legendário passa a ter `churchId` vinculado e o `needsReview` é recalculado sem esse motivo

#### Scenario: Reconciliação é idempotente
- **WHEN** o passo de reconciliação roda novamente sobre legendários já casados
- **THEN** nenhuma alteração é feita (no-op) e a identidade/last-write-wins não é tocada

### Requirement: Aliases de igreja soft-deleted não resolvem

A resolução por alias SHALL ignorar aliases vinculados a igrejas com `deletedAt` preenchido.

#### Scenario: Igreja removida não resolve por alias
- **WHEN** uma resposta casa por alias, mas a igreja vinculada está soft-deleted
- **THEN** a resolução não retorna essa igreja (resposta segue como sem match → needsReview)
