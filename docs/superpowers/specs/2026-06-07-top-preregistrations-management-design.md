# TopPreRegistration — módulo de gestão (review inbox)

Data: 2026-06-07
Status: aprovado (design)

## Contexto
Pré-inscrições do Google Forms chegam como `TopPreRegistration` (model já criado + migration aplicada)
antes da pessoa virar `Legendary`. Esta etapa entrega a **gestão** (revisão) desses registros.
A **ingestão** (criação a partir do Forms) é etapa futura e está fora de escopo aqui.

Permissions já existentes no seed: `tops.preregistrations.read | approve | reject | delete`
(admin: todas; COORDINATION_USER: apenas `read`).

## Decisões
- **approve**: cria OU vincula Legendary. Se `body.legendaryId` informado → vincula a um Legendary
  existente; senão cria um novo via `LegendariosService.create` (reuso → audit + history
  `LEGENDARY_CREATED`). Sempre seta `status=APPROVED`, `legendaryId`, `reviewedByUserId`, `reviewedAt`.
- **Ingestão do Forms**: fora de escopo.
- **Escopo de acesso**: global pelas permissions (sem AccessPolicy). Coerente com o modelo atual —
  só SPIRITUAL_LEADER/TEAM_COORDINATOR são restritos e eles não têm estas permissions.

## Arquitetura
Módulo standalone `preregistrations` (não aninhado em TopsController, que já é grande), seguindo o
padrão de `social-actions` (controller fino + service + DTOs + audit).

```
apps/api/src/modules/preregistrations/
  preregistrations.module.ts        # imports: DatabaseModule, AuditModule, LegendariosModule
  preregistrations.controller.ts    # @UseGuards(JwtAuthGuard, PermissionsGuard)
  preregistrations.service.ts
  dto/
    preregistration-query.dto.ts
    review-preregistration.dto.ts
```
+ registrar `PreRegistrationsModule` em `app.module.ts`.

## Endpoints
| Método | Rota | Permission | Ação |
|---|---|---|---|
| GET | `/api/preregistrations` | `tops.preregistrations.read` | Lista paginada; filtros `topEventId`, `status`, `search` (fullName/email/phone); inclui `topEvent` |
| GET | `/api/preregistrations/:id` | `tops.preregistrations.read` | Detalhe (inclui `topEvent` + `legendary`) |
| POST | `/api/preregistrations/:id/approve` | `tops.preregistrations.approve` | Aprova; body `{ legendaryId?, notes? }` |
| POST | `/api/preregistrations/:id/reject` | `tops.preregistrations.reject` | Rejeita; body `{ notes? }` |
| DELETE | `/api/preregistrations/:id` | `tops.preregistrations.delete` | Soft-delete (`deletedAt`) |

## Regras de negócio
- **approve** (a partir de `PENDING`):
  - com `legendaryId`: valida existência (`deletedAt: null`) → vincula.
  - sem `legendaryId`: cria Legendary com `fullName/phone/city` da pré-inscrição; `email`+`churchName`
    vão para `notes` (Legendary não tem campos próprios); `status=UNKNOWN`, `needsReview=true`,
    flags booleanas `false`.
  - atualiza: `status=APPROVED`, `legendaryId`, `reviewedByUserId=user.sub`, `reviewedAt=now`, `notes?`.
- **reject** (a partir de `PENDING`): `status=REJECTED`, `reviewedByUserId`, `reviewedAt`, `notes?`.
- **delete**: soft-delete.
- **Idempotência/transições**: approve/reject só de `PENDING`. Já no estado-alvo → retorna atual (no-op).
  Já no outro estado terminal → `400 "já revisada"` (evita APPROVED→REJECTED deixar Legendary órfão).
- Toda mutação grava `audit` (`entityType: 'TopPreRegistration'`, actions `approve|reject|delete`).

## Fora de escopo
Ingestão do Forms; AccessPolicy/scope; novas migrations; mudança no seed.

## Testes (e2e, estilo HTTP + Prisma fixtures, com cleanup)
1. approve criando Legendary novo → 200, `status=APPROVED`, `legendaryId` setado, Legendary existe com `needsReview=true`.
2. approve vinculando `legendaryId` existente → vincula sem criar.
3. reject → `status=REJECTED` + reviewer.
4. delete → soft-delete (some da lista).
5. idempotência: approve 2x → retorna o mesmo; reject após approve → 400.
6. RBAC: COORDINATION_USER consegue `read` mas recebe 403 em `approve`.
