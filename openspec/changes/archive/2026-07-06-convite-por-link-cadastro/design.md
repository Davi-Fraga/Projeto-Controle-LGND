## Context

O acesso é interno; cadastro público aberto está fora de questão. A abordagem foi decidida: **convite por link** (padrão de Slack/Notion). O admin/líder gera um link com token; a pessoa cria a própria senha. Reaproveita o modelo de papel/escopo de `user-access-control` (02) e os 226 Legendários importados para vincular conta↔Legendary. Restam decisões secundárias (validade, quem pode convidar, tipo de token) a fechar aqui.

## Goals / Non-Goals

**Goals**
- Criação de conta apenas via convite com token válido.
- Convite carrega papel/escopo iniciais e vínculo opcional com Legendary.
- Token seguro: aleatório, único, com validade, uso único.
- Anti-enumeração e auditoria.

**Non-Goals**
- Não enviar email automaticamente nesta entrega (admin copia o link; email é evolução futura).
- Não implementar auto-cadastro validado por CPF/telefone (evolução futura).
- Não tratar redefinição de senha (é `redefinicao-senha-por-link`/08, que reusa este mecanismo).

## Decisions

### Modelo de convite/token
Modelo Prisma de convite: `token` (hash do token, não o valor cru), `expiresAt`, `status` (pending/used/expired), `role`/`scope` iniciais, `legendaryId?` opcional, e campos de auditoria (criadoPor, criadoEm, usadoEm). Migration nova. O valor cru do token vai só no link; no banco guarda-se o hash (como senha).

### Página pública de aceite
Rota pública (sem JWT) que valida o token (hash + validade + status) e permite definir a senha. Protegida pelo `RateLimitGuard` global. Erros genéricos (anti-enumeração). Ao concluir: cria a conta com papel/escopo do convite, vincula ao Legendary se houver, invalida o token — idealmente numa transação.

### Quem pode convidar e validade (decisões a fechar)
Começar simples: **só admin** gera convites; validade ex.: **7 dias**. Avaliar estender a líderes/gestores com limite de escopo. Decidir o comportamento exato de expiração.

### Reuso pela 08
O mesmo mecanismo de token/link servirá para redefinição de senha (08). Modelar o token de forma genérica o suficiente (ou tipo `INVITE`/`PASSWORD_RESET`) para reuso.

## Risks / Trade-offs

- **Token é credencial**: vazamento = acesso indevido. Mitigar: hash no banco, aleatório/longo, validade curta, uso único, nunca logar.
- **Enumeração**: respostas genéricas para não revelar emails/dados existentes.
- **Auth sensível**: rota pública de criação de conta — cobrir com testes (sem token, expirado, usado) + RateLimit.
- **Acoplamento com 02**: papel/escopo do convite usam o modelo de `user-access-control`; ordem recomendada 02 antes ou junto.

## Migration Plan

Migration nova do modelo de convite. Implementar atrás de testes: convite válido cria conta; convite expirado/usado recusado; cadastro sem convite recusado; auditoria registrada; anti-enumeração. Regenerar Prisma client (dev parado) após a migration.

## Open Questions

- Validade do convite (7 dias?) e comportamento exato ao expirar.
- Quem pode gerar convites: só admin, ou também líderes/gestores com limite de escopo?
- Token único genérico (reuso na 08) ou tipos distintos `INVITE`/`PASSWORD_RESET`?
- Confirmar dados que a pessoa edita/confirma no aceite (nome, email) e o que vem travado do convite.
