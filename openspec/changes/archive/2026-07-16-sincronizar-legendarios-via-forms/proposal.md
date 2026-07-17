## Why

O Google Forms "MANADA ROTA DO CERRADO" já coleta cadastro e atualização de dados da manada inteira, mas hoje essas respostas não alimentam o sistema automaticamente — a atualização depende de digitação manual ou de rodar o script pontual de importação. Precisamos de uma sincronização **contínua e automática**: cada resposta do Forms cria ou atualiza um `Legendary` diretamente, sem etapa de aprovação, no mesmo espírito idempotente do import dos 226 (`prisma/import-manus.ts`), porém em tempo real.

Esta feature **não é** pré-inscrição de TOP. `TopPreRegistration` é inscrição num TOP específico com aprovação humana que vira participante/servo. Aqui o formulário é de **cadastro/atualização da manada**, o destino é o próprio `Legendary`, e o modelo é dinâmico (upsert direto, last-write-wins). São fluxos distintos e não devem compartilhar endpoint nem model.

## What Changes

- **Novo webhook público dedicado** de sincronização de legendários, protegido por `x-webhook-secret` (timing-safe), separado do webhook de pré-inscrição de TOP. Faz **upsert direto** de `Legendary` a partir de um payload canônico enviado pelo Google Apps Script.
- **Chave de deduplicação = número de legendário (âncora) + nome (confirmação tolerante)**: número existe e nome bate (sem acento/caixa/espaços) → atualiza a mesma pessoa; número existe mas nome diverge muito → **não sobrescreve**, marca `needsReview` e registra o conflito (proteção contra número digitado errado). Nunca cria duas pessoas para o mesmo legendário.
- **Last-write-wins por timestamp da resposta**: uma resposta mais antiga que chegue atrasada não sobrescreve dados de uma resposta mais recente já aplicada. Idempotência por identificador da resposta/linha da planilha (reenvio não gera efeito duplicado).
- **Reúso da normalização e do upsert do import dos 226**: cidade canônica, telefone em formato único, número só com dígitos, nome normalizado para a chave — extraídos para um helper compartilhado e testável (hoje isolados em `prisma/import-manus.ts`).
- **Vínculo de equipe**: o campo Equipe do Forms cria/garante o `TeamMembership` na `Team` correspondente (Eventos, Segurança, Logística, Adm, Mídia, Hakuna, Pastor/padre, Voz); valores que não batem com uma equipe existente vão para revisão sem quebrar a ingestão.
- **Marcadores**: `isFromRotaDoCerrado = true`, `status = ACTIVE` no primeiro cadastro; "é líder espiritual = Sim" sinaliza atenção (`needsReview`) conforme regra de negócio.
- **Novos campos de schema** para o que o Forms coleta e o `Legendary` ainda não guarda (decisão explícita por campo na `design.md`; ex.: bairro, UF, líder espiritual nome/contato, esposa/mãe nome/contato/email, "é líder"/liderança, TOP de origem, timestamp da última sincronização do Forms). Nenhum campo é inventado em silêncio.
- **Auditoria/histórico**: cada sincronização registra origem "Forms", quando, e se foi criação ou atualização (via `AuditService` + `LegendaryHistory`), para rastreabilidade e para o cálculo de last-write-wins.
- **Ajuste de UI** (mínimo): sinalizar origem Forms e expor a fila de conflitos (`needsReview`) para o admin resolver divergências número-vs-nome.

## Capabilities

### New Capabilities

- `legendary-forms-sync`: sincronização contínua de legendários a partir do Google Forms da manada — webhook dedicado, payload canônico do Apps Script, mapeamento de campos, normalização compartilhada, upsert por número+nome, last-write-wins por timestamp, idempotência por resposta, vínculo de equipe, marcadores, fila de revisão de conflitos e auditoria.

### Modified Capabilities

- Nenhuma capability OpenSpec existente muda de requisito. A pré-inscrição de TOP (`preregistrations`) permanece intacta e é intencionalmente separada desta. A lógica reutilizada do import dos 226 vive em `prisma/import-manus.ts` (script, não capability OpenSpec).

## Impact

- **API NestJS**: novo módulo/controller de webhook de sincronização em `apps/api/src/modules/` (padrão `social-actions`: controller fino + service + DTOs), helper de normalização compartilhado, `AuditService` e `LegendaryHistory`. Reúso de `FORMS_WEBHOOK_SECRET` / `getFormsWebhookSecret` ou variável dedicada.
- **Prisma**: nova migration idempotente adicionando os campos aprovados a `Legendary` (bairro, UF, líder espiritual, esposa/mãe, "é líder"/liderança, TOP de origem, `lastFormsSyncAt`, `formsResponseId` p/ idempotência); regeneração do Prisma Client; ajustes em `packages/shared`.
- **Web Next.js**: sinalização de origem Forms e fila/filtro de `needsReview` para conflitos número-vs-nome em `apps/web/src/features/legendarios` (ou equivalente existente).
- **Google Apps Script**: script operacional fora do repo versionado (gatilho `onFormSubmit`) que monta o payload canônico, envia `x-webhook-secret` a partir de `Script Properties` e trata erro/reenvio sem duplicar.
- **Segurança/operação**: segredo de produção fora do código; whitelist e limite de tamanho de payload; auditoria de cada sincronização (criado × atualizado, origem, timestamp).
