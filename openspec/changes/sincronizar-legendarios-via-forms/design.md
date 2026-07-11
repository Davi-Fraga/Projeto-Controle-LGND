## Context

O import dos 226 (`prisma/import-manus.ts`) já resolve o mais difícil: normalizar cidade/telefone/número e fazer **upsert idempotente** de `Legendary` por `lgndNumber`, criando `Team`/`TeamMembership` e marcando `isFromRotaDoCerrado`/`status`/`needsReview`. Essa lógica hoje vive num script isolado e roda sob demanda. Esta change transforma esse padrão em **sincronização contínua**: cada resposta do Forms chega por webhook e reflete no banco em tempo real, sem aprovação.

Estado atual relevante do código:
- `Legendary` ([prisma/schema.prisma:313](prisma/schema.prisma#L313)) tem: `fullName`, `lgndNumber @unique`, `phone`, `city`, `searchText`, `isFromRotaDoCerrado`, `churchId`, `servesInChurch`, `churchRole`, `professionId`, `status`, `notes`, `needsReview`, `firstTop*`. **Não** tem: bairro, UF, líder espiritual, esposa/mãe, "é líder"/liderança, timestamp de sync do Forms.
- Normalização de busca (`normalizeSearch`, `normalizePhone`, `buildSearchText`) em [legendarios.service.ts:414](apps/api/src/modules/legendarios/legendarios.service.ts#L414); normalização de cidade/telefone/número (`canonCity`, `cleanPhone`, `cleanLgnd`) em [import-manus.ts:30](prisma/import-manus.ts#L30). São duas implementações parecidas — esta change unifica num helper compartilhado.
- Webhook público existente de pré-inscrição de TOP em [preregistrations-webhook.controller.ts](apps/api/src/modules/preregistrations/preregistrations-webhook.controller.ts): sem `JwtAuthGuard`, protegido por `x-webhook-secret` timing-safe (`getFormsWebhookSecret`), com limite de payload `MAX_WEBHOOK_PAYLOAD_BYTES = 50_000`. É o **padrão de segurança** a copiar — mas em rota e service próprios.
- `AuditService.create(...)` e `LegendaryHistory` (tipos `LEGENDARY_CREATED`/`LEGENDARY_UPDATED`, campo `metadata Json?`, `occurredAt`) já suportam o registro de origem/timestamp.

Restrição do projeto (CLAUDE.md): controller fino → DTO valida → service tem a regra → `PrismaService` isola o banco; novo domínio segue o padrão de `social-actions`; nunca SQL nativo; migration nova (nunca alterar aplicada).

## Goals / Non-Goals

**Goals:**
- Upsert direto e contínuo de `Legendary` por resposta do Forms, sem aprovação.
- Dedup seguro por número (âncora) + nome (tolerante), com proteção contra número digitado errado (conflito → revisão).
- Last-write-wins por timestamp da resposta; idempotência por identificador da resposta.
- Reúso real (não cópia) da normalização e do upsert do import dos 226, extraídos para helper testável.
- Vínculo de equipe automático; marcadores corretos; auditoria/histórico de cada sync.
- Tabela de mapeamento campo-a-campo com decisão explícita de schema por campo.

**Non-Goals:**
- Não toca `TopPreRegistration`, `TopParticipant`, `TopServant` nem o webhook/tela de pré-inscrição de TOP.
- Não implementa fluxo de aprovação (é intencionalmente ausente).
- Não faz merge automático de conflitos número-vs-nome (isso vira fila de revisão manual).
- Não versiona o Apps Script no repo (script operacional externo; entregamos snippet de referência).
- Não constrói tela nova de cadastro — apenas sinalização de origem e fila de conflitos na UI existente de legendários.

## Decisions

### D1. Endpoint novo e dedicado (não estender o webhook de TOP)
`POST /legendarios/forms-sync/webhook` (público, sem JWT), novo módulo `apps/api/src/modules/legendary-forms-sync/` no padrão `social-actions`. **Por quê:** o comportamento é upsert direto de `Legendary`, semântica oposta à pré-inscrição de TOP (que cria `TopPreRegistration` pendente e exige aprovação). Compartilhar rota/DTO/service acoplaria dois domínios distintos e reintroduziria a confusão que motivou descartar a change anterior. *Alternativa descartada:* reusar `/tops/:id/pre-registrations/webhook` — rejeitada por acoplamento semântico e risco de regressão no fluxo de TOP.

### D2. Segredo do webhook *(resolvido — Q1)*
Reusar `FORMS_WEBHOOK_SECRET` via `getFormsWebhookSecret` com a mesma verificação timing-safe e o mesmo limite de payload do controller de TOP. **Por quê:** é o mesmo tipo de tráfego (Forms → webhook) e o mesmo operador; não há motivo para revogar/rotacionar independentemente. **Decisão final:** não criar segredo dedicado.

### D3. Helper de normalização compartilhado
Extrair `canonCity`, `cleanPhone`, `cleanLgnd` e um `normalizeName` (mesma regra NFD/lowercase/trim de `normalizeSearch`) para `apps/api/src/common/normalization/` (ou `packages/shared` se o web também precisar), com testes unitários. O `import-manus.ts` passa a importar desse helper. **Por quê:** hoje há duas normalizações divergentes; a chave de dedup exige uma só fonte de verdade. *Trade-off:* mexer no script de import — mitigado por testes que fixam o comportamento atual antes de extrair.

### D4. Chave de upsert = `lgndNumber` (limpo) + nome normalizado
1. `key = cleanLgnd(numeroLegendario)`; se vazio ou `fullName` vazio → **rejeita** (400).
2. Busca `Legendary` por `lgndNumber = key`.
3. Não existe → **cria**.
4. Existe e `normalizeName(nome_forms) === normalizeName(nome_banco)` → **atualiza**.
5. Existe e nomes divergem → **não sobrescreve identidade**; `needsReview = true`, registra conflito em `notes`/`metadata` do histórico; retorna `conflict`.

"Divergência" v1 = igualdade exata pós-normalização (sem acento/caixa/espaços), o mesmo tratamento do import dos 226 *(resolvido — Q2)*. **Sem fuzzy** nesta versão; se não bater → `needsReview`. Fuzzy (Levenshtein/Jaro-Winkler) é otimização futura, só se a revisão manual pesar.

### D5. Last-write-wins por timestamp + idempotência por responseId
Adicionar a `Legendary`: `lastFormsSyncAt DateTime?` e `formsResponseId String?`. O payload carrega `responseTimestamp` (ISO) e `responseId` (id da resposta/linha da planilha).
- Se `responseId === legendary.formsResponseId` **e** `responseTimestamp <= lastFormsSyncAt` → **no-op idempotente** (retorna `skipped: duplicate`).
- Se `responseTimestamp <= lastFormsSyncAt` (resposta atrasada) → **skip stale** (não sobrescreve).
- Caso contrário aplica e seta `lastFormsSyncAt = responseTimestamp`, `formsResponseId = responseId`.

`formsResponseId` **não** é `@unique` (a mesma pessoa gera várias respostas ao longo do tempo; guardamos a última). A idempotência é `responseId + timestamp`, não unicidade de linha.

### D6. Vínculo de equipe tolerante
Mapear "Equipe" do Forms para `Team` por nome normalizado; criar `TeamMembership` ativo se não houver (mesma lógica do import). Sem match → upsert segue, `needsReview = true`, equipe crua registrada. **Por quê:** o Forms tem lista fixa de 8 equipes, mas grafias divergem; não podemos perder a resposta por causa de equipe. *Decisão:* não criar `Team` novo automaticamente a partir do Forms (evita poluir o cadastro de equipes com typos) — diferente do import, que criava. Registra para o admin decidir.

### D7.1 Profissão não é auto-criada *(resolvido — aprovado pelo cliente 2026-07-11)*
Igual à igreja (D11): no runtime, profissão sem match por nome normalizado → `needsReview` + texto preservado, **nunca** cria `Profession`. Auto-criar taxonomia de texto livre recriaria a duplicação vetada em cidades/igrejas ("Pedreiro"/"pedreiro"/"Pedreiro civil"). Desvio consciente da redação original de D7 ("match/cria"), aprovado. Estruturação de profissões, se necessária, vira feature dedicada.

### D7. Mapeamento de campos (Forms → Legendary) — TABELA

| Campo do Forms | Destino | Existe hoje? | Decisão |
|---|---|---|---|
| Nome completo *(obrig.)* | `fullName` + `searchText` | ✅ | Mapear; usado na chave (normalizado) |
| Telefone/WhatsApp *(obrig.)* | `phone` | ✅ | `cleanPhone` |
| Número de Legendário *(obrig.)* | `lgndNumber` | ✅ | `cleanLgnd`; âncora da chave |
| Equipe | `TeamMembership` → `Team` | ✅ (relação) | D6 (tolerante, não cria team) |
| E-mail *(obrig.)* | **`email`** (novo) | ❌ | **Adicionar campo** `email String?` |
| Confirmação de e-mail | validação | — | Se ≠ email → `needsReview`; não persiste separado |
| Data de nascimento *(obrig.)* | **`birthDate`** (novo) | ❌ | **Adicionar campo** `birthDate DateTime?` |
| Bairro *(obrig.)* | **`district`** (novo) | ❌ | **Adicionar campo** `district String?` |
| Cidade *(obrig.)* | `city` | ✅ | `canonCity` |
| Estado/UF *(obrig.)* | **`state`** (novo) | ❌ | **Adicionar campo** `state String?` |
| Nome da igreja *(obrig.)* | `church` (`churchId`) | ✅ (relação) | Runtime: match por nome normalizado; sem match → `needsReview` + texto preservado. **Nunca cria `Church` no webhook** (D6/D11) |
| Nome do Líder Espiritual | **`spiritualLeaderName`** (novo) | ❌ (existe em `Church`, não em `Legendary`) | **Adicionar campo** ao `Legendary` |
| Contato do Líder Espiritual | **`spiritualLeaderPhone`** (novo) | ❌ | **Adicionar campo** |
| Habilidades *(opcional)* | `expertises` (`LegendaryExpertise`) **ou** `notes` | ✅ (relação livre) | v1: guardar texto bruto em **`skillsText`** (novo) — **não** inferir `Expertise` estruturada *(resolvido — Q4)*. Estruturação fica para feature/revisão dedicada |
| Profissão *(obrig.)* | `profession` (`professionId`) | ✅ (relação) | Match/cria `Profession` por nome (padrão existente) |
| Nome da esposa/mãe *(obrig.)* | **`relativeName`** (novo) | ❌ | **Adicionar campo** |
| Contato (esposa/mãe) | **`relativePhone`** (novo) | ❌ | **Adicionar campo** |
| E-mail da esposa/mãe | **`relativeEmail`** (novo) | ❌ | **Adicionar campo** |
| É líder espiritual? (Sim/Não) | **`isSpiritualLeader`** (novo) | ❌ | **Adicionar campo** `Boolean @default(false)`; `Sim` → `needsReview` |
| Qual sua liderança? | **`leadershipRole`** (novo) | ❌ | **Adicionar campo** `String?` |
| Qual TOP subiu a montanha? | `firstTopExternalText` / `firstTopNotes` | ✅ | Reusar campos de "primeiro TOP/origem"; **não** vincula a TOP de destino |
| *(controle)* timestamp da resposta | `lastFormsSyncAt` (novo) | ❌ | D5 |
| *(controle)* id da resposta | `formsResponseId` (novo) | ❌ | D5 |

Campos novos no `Legendary` (uma migration idempotente): `email`, `birthDate`, `district`, `state`, `spiritualLeaderName`, `spiritualLeaderPhone`, `skillsText`, `relativeName`, `relativePhone`, `relativeEmail`, `isSpiritualLeader`, `leadershipRole`, `lastFormsSyncAt`, `formsResponseId`. Todos nuláveis/`@default` → seguro para linhas existentes.

### D8. Payload canônico (Apps Script → API)
```jsonc
{
  "responseId": "string",              // id da resposta ou row id da planilha (idempotência)
  "responseTimestamp": "ISO-8601",     // carimbo do Forms (last-write-wins)
  "fullName": "string",
  "lgndNumber": "string",
  "phone": "string",
  "team": "string|null",
  "email": "string",
  "emailConfirmation": "string|null",
  "birthDate": "YYYY-MM-DD|null",
  "district": "string",
  "city": "string",
  "state": "string",
  "churchName": "string",
  "spiritualLeaderName": "string|null",
  "spiritualLeaderPhone": "string|null",
  "skills": "string|null",
  "profession": "string",
  "relativeName": "string",
  "relativePhone": "string|null",
  "relativeEmail": "string|null",
  "isSpiritualLeader": "boolean",
  "leadershipRole": "string|null",
  "firstMountainTop": "string|null"
}
```
DTO com whitelist (`class-validator` + `forbidNonWhitelisted`), como no DTO do webhook de TOP. Resposta da API: `{ data: { result: 'created'|'updated'|'conflict'|'skipped', legendaryId, reason? } }`.

### D9. Apps Script (fora do repo)
Gatilho `onFormSubmit`; lê `WEBHOOK_URL` e `WEBHOOK_SECRET` de `PropertiesService.getScriptProperties()`; monta o payload de D8 a partir dos itens do Forms; `UrlFetchApp.fetch` com header `x-webhook-secret` e `muteHttpExceptions:true`. Em falha (status ≥ 300 ou exceção), grava `responseId` numa aba/Properties de "pendências" para reprocesso com o **mesmo** `responseId`. Entregável: snippet de referência em `design`/doc, nunca com segredo hardcoded.

### D10. Auditoria/histórico
Toda sync chama `AuditService.create({ entityType:'Legendary', entityId, action:'forms_sync', before, after })` e cria `LegendaryHistory` (`LEGENDARY_CREATED`/`LEGENDARY_UPDATED`, `metadata: { source:'google-forms', responseId, responseTimestamp, result }`, `occurredAt = responseTimestamp`). Conflitos número-vs-nome também geram histórico com `metadata.conflict`.

### D11. Igreja: runtime nunca cria; backfill é script one-off com revisão *(resolvido — Q3)*
Dois momentos, regras diferentes:
- **Runtime (webhook contínuo):** **nunca** cria `Church`. Sem match por nome normalizado → `needsReview` + nome cru preservado; um humano decide se é igreja existente ou nova. Igual ao tratamento de equipe desconhecida (D6).
- **Backfill inicial (uma vez, fora do runtime):** pode inserir as igrejas que já existem nos dados, mas **apenas** via script one-off idempotente (no espírito de `import-manus.ts`), com pipeline obrigatório: extrair igrejas distintas da planilha → normalizar/deduplicar → **revisão humana da lista** → só então inserir. **Nunca** inserir `SELECT DISTINCT` cru — foi o que gerou duplicata nas cidades. Esse script é separado desta capability de runtime e não faz parte do webhook.

**Por quê:** o webhook processa uma resposta por vez e não tem contexto para julgar se "Igreja Batista Central" é nova ou typo de uma existente — decisão de curadoria, não de ingestão. O backfill é curadoria em lote, com humano no loop.

### D12. `email`/`birthDate` são dados pessoais sensíveis — acesso restrito *(resolvido — Q5)*
Sempre **armazenados** no upsert. **Exposição** restrita à visão administrativa de detalhe do legendário (não há "tela de aprovação" nesta feature — o upsert é direto; a visão administrativa é a de detalhe/revisão do `Legendary`). Regras:
- **Nunca** aparecem em listagens gerais (lista de legendários, exportações amplas, fila de revisão resumida).
- Respeitam o controle de acesso por escopo já existente: só papéis de visibilidade total (ADMIN / COORDINATION_USER) veem `email`/`birthDate`; papéis restritos (ex.: gestor de cidade / coordenador de equipe) **não** veem esses campos de todo mundo. Reusar a `AccessPolicyService`/seleção de campos por escopo — não criar um segundo mecanismo.
- No banco não há criptografia adicional nesta change; a proteção é de exposição (seleção de campos por papel), coerente com o resto do sistema.

**Por quê:** minimizar superfície de dado pessoal. *Trade-off:* exige seleção de campos consciente por papel na API/UI — mitigado por reusar o mecanismo de escopo existente. Ver [[access-policy-scope-intent]].

## Risks / Trade-offs

- **Número de legendário digitado errado sobrescrevendo pessoa errada** → mitigado por D4 (nome tolerante confirma; divergência vira `needsReview`, nunca overwrite cego).
- **Resposta atrasada sobrescrevendo dado novo** → mitigado por D5 (last-write-wins por timestamp; skip stale).
- **Reenvio duplicando efeito (ex.: retry do Apps Script)** → mitigado por D5 (`responseId` + timestamp = no-op).
- **Webhook público sem JWT** → mitigado por segredo timing-safe + limite de payload + whitelist de DTO + `RateLimitGuard` global já aplicado. Recomendar rotação do segredo (Q1).
- **Extrair normalização do import pode alterar comportamento do script** → mitigar escrevendo testes que fixam a saída atual de `canonCity/cleanPhone/cleanLgnd` antes de mover.
- **Match de igreja/profissão por nome é frágil (typos)** → v1 faz match exato normalizado; sem match → `needsReview` em vez de criar entidade duvidosa.
- **Divergência exata de nome pode gerar falsos "conflitos"** (ex.: "João" vs "João da Silva") → aceitável no v1 (erra para o lado seguro: revisão); fuzzy é Q2.

## Migration Plan

1. Escrever testes que fixam a normalização atual do import; extrair helper compartilhado (D3).
2. Criar migration idempotente com os campos novos de `Legendary` (D7); `prisma generate`; atualizar `packages/shared`.
3. Implementar módulo `legendary-forms-sync` (controller + service + DTO) reusando helper e o padrão de segurança do webhook de TOP.
4. Implementar upsert (D4), last-write-wins/idempotência (D5), vínculo de equipe (D6), marcadores, auditoria/histórico (D10).
5. UI: filtro/badge de origem Forms e fila de `needsReview` para conflitos.
6. Escrever/entregar snippet do Apps Script (D9) e documentar config de `Script Properties`.
7. Validar contra todos os cenários da spec; `pnpm -r lint && pnpm -r test && pnpm -r build`.

**Rollback:** desabilitar o gatilho `onFormSubmit` (para o tráfego na origem) e/ou remover a rota; os campos novos são nuláveis, então não exigem rollback de dados. Migration reversível por nova migration se preciso (nunca editar aplicada).

## Open Questions

Todas resolvidas (2026-07-09):
- **Q1 → D2:** Reusar `FORMS_WEBHOOK_SECRET`; sem segredo dedicado.
- **Q2 → D4:** Comparação de nome exata normalizada (v1); sem fuzzy. Divergência → `needsReview`.
- **Q3 → D11:** Runtime nunca cria `Church` (sem match → `needsReview`). Igrejas pré-existentes entram por backfill one-off idempotente com revisão humana, nunca `SELECT DISTINCT` cru.
- **Q4 → D7:** Habilidades como texto bruto em `skillsText`; sem parse de `Expertise`.
- **Q5 → D12:** `email`/`birthDate` sempre armazenados, expostos só na visão administrativa de detalhe, restritos por escopo; nunca em listagens gerais.

Nova pendência aberta pela resolução (não bloqueia implementação):
- **Q6:** O snippet do Apps Script deve incluir também a extração one-off das igrejas para o backfill (D11), ou o backfill lê a planilha por outro meio (export CSV/API Sheets)? Definir na task 10.
