## 1. Insumo

- [x] 1.1 Mover/copiar `manus-membros.json` (hoje na raiz) para `prisma/data/manus-membros.json`, caminho que o script lê
- [x] 1.2 Adicionar o script `prisma/import-manus.ts` (implementação de referência fornecida) ao repo

## 2. Normalização

- [x] 2.1 Confirmar normalização de `lgndNumber` (só dígitos) — "148.929" → "148929"
- [x] 2.2 Confirmar normalização de telefone para `(DD) XXXXX-XXXX` (remove `+55`, zero de DDD, espaços)
- [x] 2.3 Corrigir os 3 bugs de cidade: a remoção do sufixo ` goias` quebra as chaves do mapa que contêm "goias" — alinhar `CANON_CITY`/`cityKey` para que "Bela Vista de Goiás", "CALDAS NOVA - GOIÁS" e "Águas Lindas De Goiás" caiam na cidade canônica correta (não no fallback)
- [x] 2.4 Logar no resumo toda grafia de cidade que caiu no fallback Title-Case (não estava no mapa)

## 3. Persistência idempotente

- [x] 3.1 Confirmar UPSERT de `Legendary` por `lgndNumber` (find → update / create), gravando `isFromRotaDoCerrado = true`, `status = ACTIVE` e campos normalizados
- [x] 3.2 Confirmar find-or-create das 9 `Team` por nome
- [x] 3.3 Confirmar criação idempotente de `TeamMembership` (find-before-create por `teamId` + `legendaryId` ativo), com `role` = função ou "Membro"
- [x] 3.4 Confirmar `needsReview = true` + `notes` ("Função no Manus: ...") para as 11 lideranças, sem atribuir coordenador/vice de `Team`

## 4. Verificação

- [x] 4.1 Rodar `pnpm tsx prisma/import-manus.ts` e revisar o resumo (criados / atualizados / vínculos / marcados para revisão)
- [x] 4.2 Validar contagens: 226 `Legendary`, 9 `Team`, 11 marcados para revisão; conferir que o mapa não tem cidades duplicadas
- [x] 4.3 Reexecutar e confirmar idempotência (contagens estáveis, sem `Legendary` nem `TeamMembership` duplicados)
- [x] 4.4 Conferir que `pnpm -r lint` e `pnpm -r build` passam (o script não quebra o repo)
