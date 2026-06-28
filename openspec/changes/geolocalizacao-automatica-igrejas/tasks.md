## 1. Inspeção e preparação

- [x] 1.1 Inspecionar `apps/api/src/modules/churches` (module, service, controller, DTOs) e os testes `.spec.ts` relacionados
- [x] 1.2 Confirmar o cliente HTTP padrão do projeto e os padrões de DTO/permissions/controller/service
- [x] 1.3 Inspecionar `apps/web/src/features/churches/api.ts`, `church-form.tsx` e as páginas `dashboard/igrejas/nova` e `dashboard/igrejas/[id]/editar`
- [x] 1.4 Apresentar os diffs propostos e aguardar aprovação antes de aplicar

## 2. Testes do serviço de geocoding (TDD)

- [x] 2.1 Criar `.spec.ts` mockando o Nominatim: busca por nome+cidade retorna coordenadas
- [x] 2.2 Primeira busca vazia executa fallback somente por cidade
- [x] 2.3 Duas buscas vazias retornam `null`
- [x] 2.4 `User-Agent` é enviado na chamada
- [x] 2.5 Latitude/longitude em texto são convertidas para números
- [x] 2.6 Erro de rede retorna `null` sem propagar falha
- [x] 2.7 Cache evita nova chamada para a mesma busca normalizada
- [x] 2.8 Throttle respeita o intervalo mínimo entre chamadas externas

## 3. Serviço de geocoding

- [x] 3.1 Implementar `GeocodingService` no módulo de Igrejas (Nominatim, `User-Agent`, contrato `{ lat, lng, displayName } | null`)
- [x] 3.2 Implementar busca por nome+cidade e fallback por cidade
- [x] 3.3 Implementar cache local (hits e misses) com chave normalizada e throttle ≥ 1s; não cachear rejeições
- [x] 3.4 Garantir que os testes do passo 2 passem

## 4. Integração no create/update

- [x] 4.1 Create: geocodificar quando latitude/longitude ausentes; preservar coordenadas manuais; `null`/erro cria sem coordenadas
- [x] 4.2 Update: geocodificar só quando `name`/`city` muda e sem coordenadas manuais; não chamar sem mudança; falha não quebra
- [x] 4.3 Testes: create usa geocoding sem coordenadas; create preserva manuais; update geocodifica ao mudar nome/cidade; update não geocodifica sem mudança; update preserva manuais

## 5. Endpoint de pré-visualização

- [x] 5.1 Criar DTO de query (`city`, `name`) com `class-validator`
- [x] 5.2 Adicionar `GET /churches/geocode` protegido por `@Permissions('churches.read')`, declarado antes de `GET /churches/:id`
- [x] 5.3 Teste de guarda (403 sem `churches.read`), query inválida (400) e roteamento correto (não confundir com `:id`)

## 6. Frontend

- [x] 6.1 Adicionar função de geocode em `apps/web/src/features/churches/api.ts` (envia `city`/`name`, retorna `{ lat, lng, displayName } | null`, no padrão do cliente HTTP e tratamento de erro da feature)
- [x] 6.2 Em `church-form.tsx`: latitude/longitude opcionais e secundárias; botão "Buscar localização automaticamente" habilitado só com os campos mínimos
- [x] 6.3 Preencher campos com o resultado, exibir `displayName`, manter campos editáveis (texto de fallback manual)
- [x] 6.4 Estados de loading / não encontrado / erro sem bloquear o formulário

## 7. Verificação

- [x] 7.1 Rodar testes focados do módulo de Igrejas — churches: 17/17 ✓
- [x] 7.2 Rodar `pnpm -r lint`, `pnpm -r test` e `pnpm -r build` — lint ✓; test ✓ (api 108, web 11); build: api ✓, **web `next build` falha em `EPERM symlink` ao copiar o standalone output (limitação de symlink do Windows, sem relação com esta mudança; compilação/type-check da web passaram)**
- [ ] 7.3 Conferência manual: criar Igreja sem coordenadas (preenche), criar com coordenadas (preserva), editar sem mudar nome/cidade (não busca), simular falha do Nominatim (não quebra) — pendente (requer stack rodando + Nominatim real)
