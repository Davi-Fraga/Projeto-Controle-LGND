## Context

### Modelo e resolução atuais

`Legendary` guarda profissão somente por uma chave estrangeira opcional:

```text
Legendary
  professionId  String?       -> Profession.id
  profession    Profession?
  needsReview   Boolean

Profession
  id             String
  name           String @unique
  deletedAt      DateTime?
  legendarios    Legendary[]
```

No cadastro administrativo, o frontend carrega o catálogo inteiro, apresenta um `<select>` e envia apenas `professionId`. A API valida se esse ID aponta para uma profissão ativa. Portanto, não existe onde persistir uma profissão fora do catálogo.

O sync do Forms já executa parte da regra pretendida: `LegendaryFormsSyncService.resolveProfessionByName` aplica o `normalizeName` compartilhado e procura uma profissão ativa pelo nome normalizado, sem criar registros. Entretanto, esse método é privado e faz um `.find` local; quando não há match, `professionId` fica nulo e o texto aparece apenas nos metadados de inconsistência do histórico, não como dado consultável do perfil.

### Modelo proposto

```text
Legendary
  professionId    String?       -> Profession.id (vínculo canônico, preservado)
  profession      Profession?
  professionText  String?       (texto livre quando não há vínculo)
  needsReview     Boolean

Profession
  id               String
  name             String @unique
  deletedAt        DateTime?
  legendarios      Legendary[]
```

Os campos são mutuamente exclusivos para novas gravações resolvidas: um match único salva `professionId` e deixa `professionText` nulo; ausência ou ambiguidade de match salva o texto aparado em `professionText`, deixa `professionId` nulo e marca revisão. Um valor vazio deixa ambos nulos.

Esta change afeta schema, API, formulário administrativo, sync/reconciliação do Forms e superfícies que apresentam/exportam a profissão. A normalização existente em `packages/shared` e as regras de acesso já aplicadas ao legendário permanecem canônicas.

## Goals / Non-Goals

**Goals:**

- Permitir que qualquer profissão seja informada sem bloquear o cadastro.
- Manter vínculo estruturado quando o texto corresponder de forma inequívoca a uma profissão ativa.
- Preservar o texto que não corresponder ao catálogo e sinalizar revisão humana.
- Centralizar e reutilizar resolução e normalização entre cadastro manual, Forms e reconciliação.
- Preservar integralmente os `professionId` existentes durante migration e rollout.

**Non-Goals:**

- Criar profissões ou aliases automaticamente no runtime.
- Implementar fuzzy match, sugestão/autocomplete, `ProfessionAlias` ou expansão do catálogo.
- Agrupar automaticamente textos livres nos relatórios por profissão.
- Alterar a política de acesso, o filtro catalogado por `professionId` ou resolver registros antigos sem uma ação explícita de edição/reconciliação.

## Decisions

### 1. Persistir o fallback em `Legendary.professionText`

A mudança adiciona uma coluna textual anulável, mantendo a FK atual. Esse modelo preserva o catálogo para filtros e relatórios, mas não descarta o valor informado quando o catálogo estiver incompleto.

Alternativas consideradas:

- Gravar sempre apenas texto: rejeitada porque eliminaria vínculos e prejudicaria agrupamento/filtro existentes.
- Criar `Profession` automaticamente: rejeitada pela regra de negócio e pelo risco de poluir o catálogo.
- Criar uma entidade de pendência separada: rejeitada por aumentar a complexidade sem benefício para um único valor atual do perfil.

### 2. Usar um resolvedor único, normalizado e sem efeitos colaterais

O módulo de profissões exporá um resolvedor reutilizável que:

1. apara o valor recebido;
2. aplica o `normalizeName` já existente;
3. compara com nomes de profissões ativas usando a mesma normalização;
4. retorna um resultado estruturado: vazio, match único, não encontrado ou ambíguo;
5. nunca executa `create` ou `upsert` de `Profession`.

`LegendariosService`, `LegendaryFormsSyncService` e a reconciliação chamarão esse resolvedor. A implementação privada atual no sync será removida, evitando duas regras divergentes.

Uma colisão normalizada é possível porque o índice `Profession.name @unique` diferencia acentos/espaços/caixa. Se mais de um registro ativo normalizar para a mesma chave, o resultado será ambíguo: nenhum ID será escolhido arbitrariamente, o texto será preservado e `needsReview` será marcado.

### 3. Definir precedência e compatibilidade da API

O novo formulário enviará `professionText`. A presença dessa propriedade, inclusive como string vazia, é autoritativa:

| Entrada | Resultado |
|---|---|
| propriedade ausente em PATCH | profissão atual não é alterada |
| texto vazio | limpa `professionId` e `professionText` |
| match normalizado único | salva `professionId`; limpa `professionText` |
| sem match ou match ambíguo | limpa `professionId`; salva texto aparado; força `needsReview = true` |

`professionId` permanecerá aceito isoladamente pela API durante a compatibilidade com clientes existentes e seguirá a validação atual. Um payload que tente definir simultaneamente `professionText` e `professionId` será rejeitado como ambíguo.

Como `needsReview` também representa problemas de igreja, equipe, identidade e outros dados, um match de profissão ou a limpeza do campo não o desligará automaticamente. A profissão desconhecida força `true`; a remoção dessa pendência somente poderá limpar o marcador quando o fluxo de revisão/reconciliação confirmar que não existem outras causas.

### 4. Preservar vínculos existentes também durante edição

A migration não reescreverá `professionId`. Ao abrir um perfil existente, o input será inicializado por `profession.name`, com fallback para `professionText`. Salvar esse nome volta a resolver para o mesmo catálogo ativo.

Se o vínculo legado apontar para uma profissão posteriormente desativada e o usuário não alterar o campo, um PATCH sem `professionText` preservará o vínculo. Se o texto for enviado explicitamente, apenas profissões ativas poderão ser escolhidas como novo match; a interface deverá evitar sobrescrever silenciosamente esse caso durante alterações não relacionadas.

### 5. Apresentar o valor canônico com fallback para o texto livre

Perfil e exportação usarão `profession?.name ?? professionText`. A listagem/filtro e o relatório `byProfession` continuam representando somente categorias catalogadas; registros sem vínculo ficam disponíveis pela fila `needsReview`, sem agrupamento automático nesta change.

## Risks / Trade-offs

- **[Colisões após normalização podem impedir um vínculo esperado]** → tratar como ambíguo, preservar o texto e exigir decisão humana em vez de escolher arbitrariamente.
- **[`needsReview` é um marcador global]** → somente a ausência/ambiguidade força `true`; match ou limpeza não apaga outras pendências.
- **[Clientes antigos ainda podem enviar apenas ID]** → manter compatibilidade de `professionId`, validar o catálogo e rejeitar apenas payloads que misturem as duas formas.
- **[Registro ligado a profissão desativada pode ser perdido por um formulário que sempre reenvie texto]** → PATCH sem o novo campo não altera a profissão e o frontend deve distinguir edição explícita de profissão de atualizações não relacionadas.
- **[Texto livre não entra imediatamente nos agrupamentos catalogados]** → deixar explícito que a vinculação/revisão posterior é o mecanismo de catalogação; agrupamento de pendências fica fora do escopo.

## Migration Plan

1. Executar preview/dry-run somente leitura no ambiente alvo, registrando: total de legendários, quantidade com `professionId`, quantidade de IDs distintos, vínculos órfãos e distribuição por profissão.
2. Fazer backup verificável do banco antes do deploy.
3. Aplicar migration idempotente/aditiva que crie `Legendary.professionText` como anulável somente se ainda não existir. Não atualizar, limpar nem recalcular `professionId`.
4. Executar a migration antes de ativar a versão da API/web que lê e grava a coluna nova.
5. Validar após a migration que o total de legendários e o conjunto/contagem de `professionId` são idênticos ao preview, e que não surgiram vínculos órfãos.
6. Publicar API e web; executar smoke tests de edição preservada, match e texto sem match.
7. A reconciliação de valores antigos do Forms será uma ação explícita e idempotente, não parte automática da migration.

**Rollback:** reverter primeiro API/web para a versão que ignora `professionText`. A coluna pode permanecer sem afetar a versão anterior. Só removê-la em uma migration posterior, depois de exportar eventuais textos livres gravados; nunca apagar a coluna como primeira ação de rollback.

## Open Questions

Nenhuma decisão bloqueante. O nome técnico proposto para a coluna e para a propriedade da API é `professionText`; qualquer renome deve ser aprovado antes da implementação para evitar divergência entre schema, DTOs e frontend.
