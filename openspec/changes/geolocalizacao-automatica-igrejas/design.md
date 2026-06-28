## Context

O módulo `apps/api/src/modules/churches` já tem service, controller e DTOs no padrão NestJS do projeto; o model `Church` já possui `latitude`, `longitude` e `city`. O frontend tem `features/churches/api.ts` e `church-form.tsx`, reusados pelas páginas de criação e edição. O provedor cartográfico é OpenStreetMap, então o Nominatim é a escolha natural de geocoding. A restrição operacional do Nominatim (1 req/s, `User-Agent` obrigatório) e a necessidade de não quebrar create/update em caso de falha guiam o desenho.

## Goals / Non-Goals

**Goals**
- Obter coordenadas automaticamente a partir de nome + cidade, com fallback por cidade.
- Nunca sobrescrever coordenadas informadas manualmente.
- Tolerar indisponibilidade do Nominatim sem quebrar create/update.
- Respeitar o rate limit do Nominatim com throttle e cache locais ao serviço.

**Non-Goals**
- Não trata clustering nem reformulação do mapa (isso é o `Extra A - Mapa V2`).
- Não altera o schema do `Church`.
- Não introduz Redis nem infraestrutura global.
- Não altera auth, CORS, refresh token, Prisma bootstrap ou config global.

## Decisions

### Serviço de geocoding isolado no módulo de Igrejas
Um `GeocodingService` (ou equivalente) dentro de `modules/churches`, injetado no `ChurchesService`. Mantém a regra de negócio (quando geocodificar) no service de Igrejas e a integração externa isolada e mockável.

### Cache + throttle locais, sem infraestrutura nova
Cache em memória com chave normalizada (`name`+`city` lowercased/trim/sem acento), armazenando hits e misses. Throttle simples garante intervalo ≥ 1s entre chamadas externas. Não cachear promises rejeitadas — só resultados resolvidos (`GeocodeResult` ou `null`). Reinício do processo limpa o cache, o que é aceitável para o volume de Igrejas.

### Cliente HTTP existente
Reusar o cliente HTTP já disponível no stack (sem nova dependência). O `User-Agent` (`GestaoLGND/1.0`) vai no header da chamada.

### Ordem de rotas no controller
Declarar `GET /churches/geocode` antes de `GET /churches/:id` para o NestJS não interpretar `geocode` como `:id`. Query validada por DTO com `class-validator`, protegida por `@Permissions('churches.read')`.

### Regras de create/update
- Create: geocodifica só se `latitude`/`longitude` ausentes; resultado `null`/erro → cria sem coordenadas.
- Update: geocodifica só se `name` ou `city` mudou e não há coordenadas manuais no payload; senão preserva o que existe.

## Risks / Trade-offs

- **Dependência externa (Nominatim)**: isolada e tolerante a falha (sempre degrada para `null`); o rate limit é respeitado por throttle local. Trade-off: cache em memória não é compartilhado entre instâncias — aceitável pelo volume e por não justificar Redis.
- **Precisão do geocoding**: nome + cidade pode resolver para local errado; mitigado por `displayName` exibido para confirmação e edição manual sempre disponível.
- **Concorrência no throttle**: garantir serialização correta das chamadas externas para não furar o 1 req/s sob requisições paralelas.

## Migration Plan

Sem migração de banco — `Church` já tem os campos. Implementação incremental: serviço + testes, integração no create/update, endpoint de preview, depois frontend. Nenhuma mudança de contrato quebra dados ou rotas existentes.

## Open Questions

- O cliente HTTP padrão do projeto já cobre timeout/retry adequados para o Nominatim, ou é preciso configurar timeout explícito? (verificar na inspeção dos arquivos reais antes de implementar)
- A normalização de cidade para a chave de cache deve compartilhar o mesmo utilitário usado em outras partes do projeto (ex.: normalização de cidade do org-chart)?
