# Sincronização de legendários via Google Forms — Apps Script (referência)

Integração operacional do Forms **"MANADA ROTA DO CERRADO"** com o endpoint de
sincronização contínua de legendários. A cada resposta, um Google Apps Script
vinculado ao Forms/planilha monta o **payload canônico** e faz `POST` no webhook.

> Este script vive **fora** do repositório versionado (é operacional, com segredo).
> Cole-o no editor de Apps Script do Forms/planilha. Nunca comite o segredo.

## Endpoint

```
POST https://api.SEU_DOMINIO/api/legendarios/forms-sync/webhook
Header: x-webhook-secret: <FORMS_WEBHOOK_SECRET de produção>
Body: application/json (payload canônico abaixo)
```

- Mesmo `FORMS_WEBHOOK_SECRET` do webhook de pré-inscrição de TOP (decisão Q1).
- Upsert **direto** de `Legendary` (sem aprovação). Não confundir com pré-inscrição de TOP.
- Respostas do webhook: `{ data: { result: 'created'|'updated'|'conflict'|'skipped', legendaryId, reason?, needsReview?, issues? } }`.

## Configuração (uma vez)

No editor Apps Script: **Configurações do projeto → Propriedades do script** — crie:

| Propriedade | Valor |
|---|---|
| `WEBHOOK_URL` | `https://api.SEU_DOMINIO/api/legendarios/forms-sync/webhook` |
| `WEBHOOK_SECRET` | o `FORMS_WEBHOOK_SECRET` de produção |

Depois: **Acionadores → Adicionar acionador →** função `onFormSubmit`, evento
"Ao enviar formulário". (Se preferir disparar da planilha, use "Ao enviar formulário"
na planilha de respostas.)

## Snippet

```javascript
// onFormSubmit — dispara a cada resposta do Forms.
function onFormSubmit(e) {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('WEBHOOK_URL');
  var secret = props.getProperty('WEBHOOK_SECRET');

  var payload = buildPayload_(e);
  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-webhook-secret': secret },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true, // não lançar em 4xx/5xx: tratamos abaixo
  };

  var res = UrlFetchApp.fetch(url, options);
  var code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    // Registra a falha para reprocesso com o MESMO responseId (idempotência).
    logFailure_(payload.responseId, code, res.getContentText());
  }
}

// Monta o payload canônico a partir dos itens da resposta.
// IMPORTANTE: ajuste os títulos em TITLES para baterem EXATAMENTE com as perguntas do Forms.
function buildPayload_(e) {
  var byTitle = {};
  var items = e.response.getItemResponses();
  for (var i = 0; i < items.length; i++) {
    byTitle[items[i].getItem().getTitle().trim()] = String(items[i].getResponse() || '').trim();
  }
  var get = function (title) { return byTitle[title] || ''; };
  var yes = function (v) { return /^sim$/i.test(v); };

  var TITLES = {
    fullName: 'Nome completo',
    phone: 'Número de telefone / WhatsApp',
    lgndNumber: 'Número de Legendário',
    team: 'Equipe (é ou quer ser)',
    email: 'E-mail',
    emailConfirmation: 'Confirmação de e-mail',
    birthDate: 'Data de nascimento',
    district: 'Bairro',
    city: 'Cidade',
    state: 'Estado / UF',
    churchName: 'Nome da igreja que frequenta',
    spiritualLeaderName: 'Nome do Líder Espiritual',
    spiritualLeaderPhone: 'Contato do Líder Espiritual',
    skills: 'Habilidades',
    profession: 'Profissão',
    relativeName: 'Nome da esposa ou mãe',
    relativePhone: 'Contato (esposa ou mãe)',
    relativeEmail: 'E-mail da esposa ou mãe',
    isSpiritualLeader: 'É líder espiritual?',
    leadershipRole: 'Qual sua liderança?',
    firstMountainTop: 'Qual TOP você subiu a montanha?',
  };

  return {
    // Idempotência + last-write-wins:
    responseId: e.response.getId(),                 // id estável da resposta
    responseTimestamp: e.response.getTimestamp().toISOString(),
    fullName: get(TITLES.fullName),
    lgndNumber: get(TITLES.lgndNumber),
    phone: get(TITLES.phone),
    team: get(TITLES.team),
    email: get(TITLES.email),
    emailConfirmation: get(TITLES.emailConfirmation),
    birthDate: normalizeDate_(get(TITLES.birthDate)), // 'YYYY-MM-DD'
    district: get(TITLES.district),
    city: get(TITLES.city),
    state: get(TITLES.state),
    churchName: get(TITLES.churchName),
    spiritualLeaderName: get(TITLES.spiritualLeaderName),
    spiritualLeaderPhone: get(TITLES.spiritualLeaderPhone),
    skills: get(TITLES.skills),
    profession: get(TITLES.profession),
    relativeName: get(TITLES.relativeName),
    relativePhone: get(TITLES.relativePhone),
    relativeEmail: get(TITLES.relativeEmail),
    isSpiritualLeader: yes(get(TITLES.isSpiritualLeader)),
    leadershipRole: get(TITLES.leadershipRole),
    firstMountainTop: get(TITLES.firstMountainTop),
  };
}

// Converte a data do Forms para 'YYYY-MM-DD' (o Forms costuma devolver dd/MM/yyyy).
function normalizeDate_(v) {
  if (!v) return '';
  var m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return m[3] + '-' + m[2] + '-' + m[1];
  return v; // já em ISO ou outro formato — o backend valida e, se inválido, marca needsReview
}

// Guarda respostas que falharam (para reprocessar depois com o mesmo responseId).
function logFailure_(responseId, code, body) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName('webhook_falhas') ||
    SpreadsheetApp.getActiveSpreadsheet().insertSheet('webhook_falhas');
  sheet.appendRow([new Date(), responseId, code, body]);
}
```

## Reprocesso de falhas (sem duplicar)

Reenviar uma resposta que falhou é **seguro**: o backend é idempotente por `responseId`
e aplica last-write-wins por `responseTimestamp`. Para reprocessar, releia a resposta
pela aba `webhook_falhas` (ou pela planilha de respostas) e chame `onFormSubmit`
reconstruindo o mesmo `responseId`/`responseTimestamp`. Um reenvio da mesma resposta
retorna `result: 'skipped', reason: 'duplicate'` — nenhum efeito duplicado.

## Notas de comportamento (backend)

- **Conflito número-vs-nome**: se o `lgndNumber` já existe mas o nome diverge, o backend
  **não** sobrescreve — marca `needsReview` e registra o conflito para revisão do admin.
- **Equipe/igreja/profissão sem match**: o upsert acontece mesmo assim; o item vai para
  a fila de revisão (`needsReview`). Igreja/profissão **nunca** são criadas pelo webhook.
- **Campos obrigatórios ausentes / e-mail de confirmação divergente**: aceitos com
  `needsReview` (não bloqueiam), exceto **nome** e **número de legendário**, que são
  âncoras de identidade — sem eles a resposta é rejeitada (HTTP 400).
