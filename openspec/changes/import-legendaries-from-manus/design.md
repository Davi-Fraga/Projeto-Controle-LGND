## Context

O Manus (app antigo da Rota do Cerrado) está sendo descontinuado e seus **226 legendários** precisam migrar para o Gestão LGND, que hoje não tem nenhum desses registros. A exportação disponível é a **resposta JSON crua do app Manus** (objetos `{ id, nome, numeroLegendario, equipe, funcao, telefone, email, cidade, estado }`), hoje salva em `manus-membros.json` na raiz do repo. Já existe uma **implementação de referência** do importador (definida pelo cliente) que este design documenta.

Os modelos de destino já existem no schema Prisma (`prisma/schema.prisma`) e não serão alterados:

- `Legendary` — `fullName` (obrigatório), `lgndNumber` (`@unique`, opcional), `phone`, `city`, `isFromRotaDoCerrado` (default `false`), `status` (`LegendaryStatus`, default `UNKNOWN`), `needsReview` (default `false`), `notes`, soft delete via `deletedAt`.
- `Team` — `name` (obrigatório), `status` (`TeamStatus`, default `ACTIVE`). **Sem `@@unique` em `name`.**
- `TeamMembership` — `teamId` + `legendaryId` + `role` (string) + `status` (`TeamMembershipStatus`, default `ACTIVE`). **Sem `@@unique([teamId, legendaryId])`.**

Fatos da exportação real (verificados): 226 registros, **0 sem `numeroLegendario`**, **52 grafias** de cidade, **9 equipes** (`Administrativo, Eventos, Logística, Segurança, A Definir, Pastor, Mídia, Voz, Hakoona`), **11 com função de liderança** (`Coordenador`, `Sub coordenador`, `Lider`, `coordenador`, `Líder adoração`). Scripts de dados rodam via `tsx` (ex.: `prisma db seed` → `tsx prisma/seed.ts`) usando `PrismaClient` — nada de SQL nativo (regra do projeto).

## Goals / Non-Goals

**Goals:**
- Popular `Legendary`, `Team` e `TeamMembership` a partir do JSON do Manus, com dados normalizados.
- Normalização canônica de **cidade** (52 grafias → ~34 cidades), **telefone** (formato BR `(DD) XXXXX-XXXX`) e **`lgndNumber`** (só dígitos).
- **Idempotência**: rodar N vezes converge ao mesmo estado, sem duplicar `Legendary` nem `TeamMembership`.
- Marcar `needsReview = true` e preservar a função original em `notes` para quem era liderança no Manus.
- Imprimir um **resumo final auditável** (criados / atualizados / vínculos / marcados para revisão).

**Non-Goals:**
- Não altera o schema Prisma, não cria migration.
- Não importa TOPs, ações sociais, igrejas, profissões ou expertises.
- Não cria usuários (`User`) nem credenciais de acesso.
- Não atribui coordenador de equipe automaticamente — lideranças ficam para revisão manual.
- Não geocodifica cidades (lat/long do mapa).

## Decisions

### 1. Script standalone via `tsx`, no padrão do `seed.ts`
`prisma/import-manus.ts`, executado por `pnpm tsx prisma/import-manus.ts`, instanciando `PrismaClient` diretamente — espelha `prisma/seed.ts`. O loader aceita o array direto **ou** o envelope `{ result: { data: { json: [...] } } }`.
*Alternativas:* endpoint NestJS (rejeitado: é migração pontual, não feature de runtime) ou comando custom do Prisma (rejeitado: overhead sem ganho).

### 2. Mapa de cidade canônica explícito + fallback Title-Case
Tabela `grafia → cidade canônica` em código (`CANON_CITY`). A `cityKey` aplica: trim, lowercase, remoção de acentos (NFD), troca de `-` por espaço, remoção de sufixo de UF (` go`/` goias`) e colapso de espaços. Grafia presente no mapa vira o valor canônico; grafia **ausente** cai num fallback que apenas Title-Case-ifica a key (não é segurada nem aborta).
*Alternativa:* fuzzy match (rejeitado: mapa explícito é determinístico e auditável). **Ver Riscos** — a ordem `remove sufixo " goias"` vs chaves do mapa que contêm `goias` é a origem de 3 bugs conhecidos.

### 3. Idempotência por `lgndNumber` (find + update / create)
`lgndNumber` normalizado (só dígitos) é a chave natural (`@unique`). Para cada registro: `findUnique({ where: { lgndNumber } })` → se existe, `update`; senão, `create`. Como **todos os 226 têm número**, o caminho "create sem chave" (registros sem `lgndNumber`) na prática não dispara.
*Alternativas:* `deleteMany`+recriar (rejeitado: quebra FKs e perde IDs/auditoria); match por nome (rejeitado: não é único).

### 4. Equipes por nome + vínculo idempotente
As 9 `Team` são resolvidas/criadas por `name` (find-or-create, pois `Team.name` não é `@unique`). `TeamMembership` é idempotente em código: `findFirst({ teamId, legendaryId, deletedAt: null })` antes de criar (compensa a ausência de `@@unique` no schema). `role` = função do Manus ou `'Membro'`.

### 5. Liderança → `needsReview` + preservação em `notes`
Quem tinha função de liderança (regex `coorden|lider|líder|sub` sobre `funcao`) é importado com `needsReview = true` e **sem** virar `coordinator`/`deputyCoordinator` de `Team`. A função original é preservada em `Legendary.notes` (`"Função no Manus: <funcao>"`) e como `role` da membership, para orientar a atribuição manual posterior.

### 6. Conferência via resumo final + idempotência (não há dry-run)
A implementação de referência **não tem `--dry-run` nem transação**: grava direto e imprime um resumo ao final (criados, atualizados, vínculos criados, marcados para revisão). A rede de segurança é a **idempotência** — rodar de novo converge ao mesmo estado, então uma execução pode ser revista e reexecutada sem duplicar. *(Divergência consciente do proposal original, que mencionava dry-run/rollback; ver Open Questions para reintroduzir, se desejado.)*

## Risks / Trade-offs

- **Bugs de normalização de cidade (conhecidos)** → a remoção do sufixo ` goias` acontece *antes* do lookup, mas 3 chaves do mapa incluem `goias`, então essas grafias não casam e caem no fallback malformado, gerando pontos duplicados no mapa:
  - `"Bela Vista de Goiás"` → `"Bela Vista De"` (deveria ser `Bela Vista de Goiás`)
  - `"CALDAS NOVA - GOIÁS"` → `"Caldas Nova"` (deveria fundir em `Caldas Novas`)
  - `"Águas Lindas De Goiás"` → `"Aguas Lindas De"` (deveria ser `Águas Lindas de Goiás`)
  **Mitigação:** alinhar as chaves do mapa à forma pós-`cityKey` (sem ` goias`) **ou** parar de remover o sufixo; validar imprimindo a lista de cidades canônicas resultantes antes de aceitar a carga.
- **Fallback Title-Case esconde grafias novas** → uma cidade nova não prevista entra title-cased silenciosamente, podendo duplicar no mapa. **Mitigação:** logar no resumo toda grafia que caiu no fallback (não está no mapa).
- **Telefone irrecuperável** → o script grava o dígito cru quando não bate 10/11 dígitos, em vez de `null`. **Mitigação:** revisar no resumo os telefones fora do padrão; decidir se viram `null`.
- **`TeamMembership`/`Team` sem unicidade no schema** → corrida poderia duplicar. **Mitigação:** find-before-create; aceitável por ser carga única controlada (sem concorrência).
- **Sem transação** → falha no meio deixa estado parcial. **Mitigação:** idempotência permite simplesmente reexecutar até o fim; envolver em `$transaction` é hardening opcional (Open Questions).
- **Caminho do arquivo** → o script lê `prisma/data/manus-membros.json`, mas o insumo está na raiz (`manus-membros.json`). **Mitigação:** mover/copiar o arquivo para `prisma/data/` antes de rodar.

## Migration Plan

1. Mover/copiar `manus-membros.json` para `prisma/data/manus-membros.json`.
2. Corrigir os 3 bugs de cidade no `CANON_CITY`/`cityKey` e rodar uma conferência da lista de cidades canônicas resultantes.
3. Rodar `pnpm tsx prisma/import-manus.ts` e revisar o resumo final.
4. Conferir contagens em `Legendary`/`Team`/`TeamMembership` e o mapa (sem pontos duplicados).
5. Reexecutar uma vez para confirmar idempotência (contagens estáveis).

**Rollback:** como é idempotente e marcado com `isFromRotaDoCerrado = true`, reverter = soft delete (`deletedAt`) dos `Legendary` desta carga e respectivos vínculos, sem afetar dados criados no app novo.

## Open Questions

- Reintroduzir `--dry-run` e/ou `$transaction` como hardening, ou confiar só na idempotência? (Proposal original pedia conferência antes de gravar; a implementação atual confere depois.)
- Telefone fora do padrão 10/11 dígitos deve virar `null` em vez do dígito cru?
- O fallback Title-Case de cidade deve **avisar** (logar grafias não mapeadas) e/ou os 3 casos com `goias` devem ser corrigidos antes da primeira carga real?
