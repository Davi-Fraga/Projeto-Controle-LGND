## Why

Hoje quem cadastra ou edita uma Igreja precisa localizar e digitar latitude/longitude manualmente — passo trabalhoso, sujeito a erro e que deixa o mapa com pontos incorretos ou vazios. Com os 226 Legendários importados e o mapa em uso, automatizar a obtenção de coordenadas a partir de nome + cidade reduz atrito e melhora a qualidade dos dados geográficos.

## What Changes

- Adiciona um serviço de **geocoding** no módulo de Igrejas (`apps/api/src/modules/churches`) usando o Nominatim (OpenStreetMap), com `User-Agent` próprio (`GestaoLGND/1.0`), throttle de 1 req/s e cache local de resultados (inclusive resultados vazios).
- **Create de Igreja**: quando latitude/longitude não vierem preenchidas, busca coordenadas por `name + city`; faz fallback só por `city`; retorna `null` sem quebrar quando não há resultado ou o Nominatim falha. Coordenadas informadas manualmente nunca são sobrescritas.
- **Update de Igreja**: geocodifica apenas quando `name` ou `city` mudou e não há coordenadas manuais no payload; edições sem mudança de nome/cidade não chamam o Nominatim; falha externa não quebra a edição.
- Novo endpoint de pré-visualização `GET /churches/geocode?city={cidade}&name={igreja}` protegido por `@Permissions('churches.read')`, com query validada por `class-validator`, retornando `{ lat, lng, displayName } | null`. A rota estática é declarada **antes** de `GET /churches/:id` para não ser interpretada como ID.
- **Frontend** (`apps/web/src/features/churches`): latitude/longitude passam a ser opcionais e secundárias; botão **"Buscar localização automaticamente"**; preenchimento automático dos campos com o resultado; exibição de `displayName` para confirmação; campos seguem editáveis (manual como fallback); estados de loading / não encontrado / erro sem bloquear o formulário.

## Capabilities

### New Capabilities
- `church-geocoding`: obtenção automática de coordenadas de Igreja a partir de nome + cidade via Nominatim, com fallback por cidade, cache e throttle, preservação de coordenadas manuais nos fluxos de create/update, endpoint de pré-visualização protegido, e integração no formulário com preenchimento automático e ajuste manual.

### Modified Capabilities
<!-- Nenhuma. openspec/specs/ não possui spec canônica de Igrejas; o comportamento de create/update é descrito como requisito da nova capability. O model Church já possui latitude/longitude/city — sem mudança de schema. -->

## Impact

- **Affected specs**: nova capability `church-geocoding`.
- **Affected code**:
  - API: `apps/api/src/modules/churches` — novo `geocoding` service (Nominatim, fallback, cache, throttle), integração no `ChurchesService` (create/update), novo DTO de query e rota `GET /churches/geocode` no controller (declarada antes de `:id`).
  - Web: `apps/web/src/features/churches/api.ts` (função de geocode) e `church-form.tsx` (campos opcionais, botão de busca, estados); páginas `dashboard/igrejas/nova` e `dashboard/igrejas/[id]/editar` reaproveitam o formulário.
- **Affected data**: nenhuma migração. O model `Church` já tem `latitude`, `longitude` e `city`.
- **Dependências**: usa o cliente HTTP já existente no stack; **não** introduz Redis nem nova infraestrutura global. Sem alteração de auth, CORS, refresh token, Prisma bootstrap ou config global.
- **Risco**: baixo/médio — dependência de serviço externo (Nominatim) é isolada e tolerante a falha (retorna `null`); o ponto sensível é respeitar o rate limit (1 req/s) e nunca sobrescrever coordenadas manuais.
