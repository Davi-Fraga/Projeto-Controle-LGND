## Context

O Controle de Acessos hoje devolve, por tela, o estado de cada dimensão de escopo
(`ScreenScopeState`) com `configuredValues: string[]` e
`effectiveValues: ScopeValueEntry[]`. O tipo `ScopeValueEntry` **já prevê** `label?: string | null`,
mas `AccessControlService.buildScopeBaseState` monta as entradas como `{ value, sources }` —
o rótulo nunca é preenchido. A UI faz `v.label ?? v.value` e acaba pintando UUID.

Três fatos do modelo atual condicionam o desenho:

1. **O escopo é global por dimensão.** `UserScope` é `@@unique([userId, type, value])` e
   `UserScopePolicy` é `@@unique([userId, type])`. Não existe coluna de tela. O painel
   renderizar o editor dentro do card de cada tela é apenas apresentação — e é apresentação
   enganosa.
2. **`CITY` guarda a chave normalizada**, não o nome. `UserScope.value` para cidade é
   `goiania`, produzido por `normalizeCityKey`. Rotular exige resolver de volta para um nome
   apresentável; as demais dimensões guardam UUID de entidade real.
3. **Em modo `ALL` não há valores.** `resolveScope` esvazia a lista da dimensão de propósito
   (o modo domina). Foi essa característica que causou o incidente de produção que originou
   esta change — e ela também significa que rotular custa **zero** consulta em `ALL`.

Constraint de banco relevante para a limpeza do seed: `RolePermission.permission` e
`UserPermissionOverride.permission` **não têm `onDelete: Cascade`**. Apagar uma `Permission`
ainda referenciada falha com violação de FK.

## Goals / Non-Goals

**Goals:**
- Nenhum identificador técnico visível no Controle de Acessos, em nenhum estado da tela.
- O admin entende, antes de aplicar, que edita uma dimensão **global**, não a fatia de uma tela.
- O controle de modo reflete o que o admin configurou, não o resultado composto com a função.
- Agregados do Mapa param de revelar volume fora do escopo.
- Remoção de código e de permissions sem consumidor, sem alterar acesso de ninguém.

**Non-Goals:**
- Tornar o escopo configurável **por tela** (mudaria o modelo de dados; não há demanda).
- Unificar `buildChurchWhere` e `buildChurchScopeWhere` — decisão registrada no incidente:
  removeria acesso de quem hoje vê igrejas por cidade. Change própria, com levantamento.
- Redesenhar o Controle de Acessos. Esta change corrige leitura e alcance, não a estética.
- Mexer no rollout do organograma (`organogram.read` é Fase 4 daquela change, não órfã de fato).

## Decisions

### D1 — Rotular no backend, em lote por dimensão

Os rótulos são resolvidos em `AccessControlService.getUserScreenAccess`, uma consulta por
dimensão que tenha valores, e só para os ids em escopo.

*Alternativa descartada:* resolver no front. O painel só carrega as options de uma dimensão
ao **entrar em edição** (`loadScopeOptions`), e cada tipo tem endpoint próprio — exibir o
estado inicial exigiria disparar quatro cargas no mount, das quais três normalmente não
seriam usadas. Além disso o front receberia listas completas para rotular meia dúzia de ids.

*Custo:* no máximo 4 consultas adicionais por abertura do painel, todas por `id IN (...)`
sobre a lista já em escopo. Em `ALL` (sem valores) e em `MISSING`, nenhuma. As dimensões são
resolvidas em paralelo com o `resolveScopeByUserId` que a função já faz.

### D2 — `configuredValues` passa de `string[]` para `ScopeValueEntry[]`

Sem isso, os valores **configurados** continuariam sem onde carregar rótulo — e é justamente
a lista que a edição usa como ponto de partida.

*Alternativa descartada:* adicionar `configuredEntries` ao lado e deprecar `configuredValues`.
Deixaria dois campos representando a mesma coisa num contrato interno de monorepo, com o
risco clássico de a UI ler o antigo. Como `packages/shared` é compilado junto e o `tsc` do
`pnpm -r lint` cobre api + web + shared, a troca direta é verificável em tempo de compilação.

### D3 — Rótulo de cidade vem do nome real do Legendário

Para `CITY`, a chave normalizada é resolvida para o primeiro valor de `Legendary.city` cujo
`normalizeCityKey` bate — a mesma correspondência que `AccessPolicyService.resolveLegendaryCities`
já usa para montar o filtro. Assim o rótulo exibido é exatamente a grafia que o usuário vê
nas telas de dados, e não uma reconstrução (`goiania` → "Goiania", sem acento).

### D4 — Valor órfão é sinalizado, nunca degradado para UUID

`ScopeValueEntry` ganha `missing?: boolean`. Quando o lookup não encontra a entidade
(excluída ou soft-deleted), a entrada volta com `label: null, missing: true` e a UI mostra
"(removido)" com o valor truncado. Sem isso, a regra "nunca exibir UUID" se resolveria
escondendo o problema — e um escopo apontando para entidade morta é informação que o admin
precisa ver.

### D5 — O alcance da dimensão é derivado no front, sem campo novo

Quais telas são afetadas por uma dimensão já é dedutível da própria resposta: o payload traz
todas as telas com `scopeTypes` e `level`. O front cruza "telas concedidas cujo `scopeTypes`
contém esta dimensão" e nomeia as demais.

*Alternativa descartada:* mandar `affectedScreens` do backend. Seria estado derivado
duplicado no contrato, que passa a poder divergir da lista de telas na mesma resposta.

### D6 — Contagem do Mapa escopada pelo mesmo `buildLegendaryWhere` da consulta

O `_count.legendarios` de cada igreja recebe o mesmo predicado de escopo já aplicado em
`legendaryWhere`. Mantém uma única fonte de verdade do recorte dentro do service.

*Alternativa considerada:* trocar o `_count` por um `groupBy(['churchId'])` sobre a consulta
já escopada, eliminando o risco de os dois caminhos divergirem de novo. É a solução mais
robusta, mas muda a forma do resultado e o teste de contrato do Mapa; fica registrada como
melhoria posterior caso o service ganhe mais agregados.

### D7 — Limpeza do seed: parar de semear **e** remover, em transação, com as dependências

Como não há cascade, a remoção segue a ordem `UserPermissionOverride` → `RolePermission` →
`Permission`, numa transação, restrita à lista fechada de chaves órfãs
(`families.create`, `families.read`, `families.update`, `social-actions.restore`,
`audit.read`). O passo é idempotente: não achar nada é sucesso.

`organogram.read` **fica** — não é órfã, é a chave de destino da Fase 4 da change do
organograma.

*Alternativa descartada:* apenas parar de semear, deixando as linhas no banco. Produção
continuaria com permissions concedíveis por acidente (um `GRANT` manual as tornaria efetivas
sem tela correspondente), e o catálogo do banco seguiria mentindo — que é exatamente a classe
de problema que originou esta auditoria.

### D8 — Remoção dos `is*Restricted` é feita junto, não depois

`isCityRestricted` / `isTeamRestricted` / `isChurchRestricted` / `isTopRestricted` não têm
consumidor de produção — apenas testes que verificam o próprio método. São o resíduo da
semântica que o hardening substituiu por `assert*Allowed` tri-estado. Mantê-los é convite
para alguém reintroduzir o fail-open removido. Saem com seus testes na mesma change.

## Risks / Trade-offs

- **[Consulta extra na abertura do painel]** → No máximo 4 lookups por `id IN (...)`, apenas
  para dimensões com valores, em paralelo. O painel é tela administrativa de baixo volume.
  Nenhum é feito em `ALL`/`MISSING`.

- **[Troca de tipo de `configuredValues` quebra a compilação do front]** → É o efeito
  desejado: o `tsc` aponta todos os pontos de leitura. Mitigação real é atómica —
  `packages/shared`, api e web mudam no mesmo commit, e `pnpm -r lint` valida os três.

- **[Remoção de permissions em produção é destrutiva e sem migration reversa]** → A lista é
  fechada e verificada: nenhuma das chaves tem endpoint (`@Permissions`) nem consta em
  `SCREEN_CATALOG`. A transação registra quantas linhas de override/role foram removidas,
  e o passo roda **depois** do deploy do restante, isoladamente, para poder ser abortado sem
  bloquear a change. Um `GRANT` dessas chaves hoje já não produz efeito algum.

- **[Rótulo de cidade depende de existir Legendário naquela cidade]** → É a mesma condição
  que `assertScopeAllowed` já impõe para **criar** o escopo de cidade (`cityExists` consulta
  `Legendary.city`). Se o último legendário da cidade sumir, o valor cai no caminho D4
  (sinalizado como removido) — que é a informação correta a dar ao admin.

- **[Aviso de alcance vira ruído]** → Só aparece quando existe de fato outra tela concedida
  usando aquela dimensão (cenário "Dimensão sem outra tela concedida"). Para um usuário com
  uma única tela de igreja, o painel fica como está.

## Migration Plan

Nenhuma migration de schema. Ordem de deploy:

1. Backend + shared + front na mesma entrega (o contrato de `configuredValues` muda em conjunto).
2. Correção do agregado do Mapa vai junto — é bugfix independente, sem contrato novo.
3. Limpeza das permissions órfãs roda **depois**, como passo isolado do seed em produção,
   após conferir a contagem de linhas afetadas em ambiente de teste.

Rollback: reverter o deploy restaura o comportamento anterior em tudo, exceto o passo 3, que
é o único destrutivo — por isso ele é separado e roda por último.

## Open Questions

- Rótulo de TOP: `TOP #12 — Rota do Cerrado` (formato do `getTopOptions` do organograma) ou
  só o nome? Assumido o formato com número, por consistência com os seletores existentes.
- O aviso de alcance deve listar os nomes das telas afetadas ou apenas a contagem? Assumido
  **nomes** (são poucas: no máximo duas ou três por dimensão).
