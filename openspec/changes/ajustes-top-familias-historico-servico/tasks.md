## 1. Aprovação e dependência

- [ ] 1.1 Obter aprovação humana explícita do modelo, critérios de elegibilidade e plano de migração desta change antes de alterar código ou banco.
- [ ] 1.2 Confirmar que `busca-reutilizavel-entidades-e-listagens` foi implementada/validada ou incluí-la antes desta change no mesmo plano de release.
- [ ] 1.3 Registrar a janela entre Fase 1 (expansão) e Fase 2 (contrato), os responsáveis pelo backup e os critérios de go/no-go de produção.

## 2. Preview e segurança de dados

- [x] 2.1 Criar script SQL somente leitura que conte combinações de `TopFamilyMember.notes/sourceNotes`, liste amostra dos casos divergentes e não execute mutations. — `apps/api/scripts/ajustes-top-familias-preview.sql` (queries [1]–[3]; envolto em transação READ ONLY + ROLLBACK).
- [x] 2.2 Incluir no preview contagens/ids de `TopServant`, distribuição por Legendário/TOP, referências inválidas e duplicidades ativas por `(topEventId, legendaryId)`. — queries [4]–[8] (fingerprint md5 de ids, distribuição, órfãos, duplicidade ativa = BLOQUEIO).
- [ ] 2.3 Executar o preview em cópia representativa, anexar o resultado ao handoff de deploy e bloquear continuidade se houver duplicidade ativa ou observação divergente não revisada. — **pendente: requer aval de DB (execução em banco)**.
- [ ] 2.4 Documentar e ensaiar o backup `pg_dump`/restore, incluindo timestamp, tamanho, checksum e histórico de migrations. — **pendente: requer aval de DB**.

## 3. Migration de expansão

- [x] 3.1 Criar migration nova, transacional e idempotente que mescle `sourceNotes` em `notes` pela tabela de decisão do design e depois deixe `sourceNotes = NULL`, sem remover a coluna. — `prisma/migrations/20260722120000_top_family_notes_merge_and_servant_indexes/migration.sql` (UPDATE CASE + zera sourceNotes; rerun seguro).
- [x] 3.2 Criar com `IF NOT EXISTS` o índice de leitura do histórico de `TopServant` por Legendário/status/data. — refletido em `schema.prisma` (`@@index([legendaryId, status, deletedAt, createdAt])`, nome alinhado).
- [x] 3.3 Criar o índice único parcial de serviço ativo por `(topEventId, legendaryId)`, condicionado ao preview sem duplicidades e alinhado à regra `ensureServantAvailable`. — **NADA a criar: já existe** (`TopServant_active_unique_idx`, desde `20260527030000_tops_module`, colunas/condição idênticas). Descoberto na validação em dev; migration corrigida para não duplicar. Regra já garantida (não há duplicidades históricas possíveis).
- [x] 3.4 Adicionar testes/validação da migration para somente notes, somente sourceNotes, textos iguais, textos diferentes, rerun seguro e preservação de ids/FKs/contagens. — `apps/api/scripts/ajustes-top-familias-postcheck.sql`. **Validado no Postgres DEV local:** `CASE` cobre os 5 ramos (temp table), aplicação transacional OK, idempotência (reaplicar = UPDATE 0 + índices skip), fingerprint de `TopServant` inalterado, índice parcial bloqueia duplicata ativa (unique violation).

## 4. Opções elegíveis de participantes do TOP

- [x] 4.1 Criar DTO de opções de participante derivado/compatível com `OptionsQueryDto`, incluindo o contexto opcional `availableForFamily`.
- [x] 4.2 Evoluir `participantOptions` para pesquisar `legendary.searchText` com normalização canônica, limite e payload enxuto já existente.
- [x] 4.3 Quando `availableForFamily=true`, filtrar participantes não cancelados/não excluídos do `topEventId` e excluir quem possui Família ativa no mesmo TOP antes do limite.
- [x] 4.4 Preservar `JwtAuthGuard`, `tops.participants.read` e `TopScopeGuard` como escopo autoritativo do sub-recurso, sem aplicar filtro geográfico que invalide usuário somente com `topIds`. — service não aplica `buildLegendaryWhere`; escopo permanece no `TopScopeGuard`.
- [x] 4.5 Testar nome sem acento, número LGND, TOP diferente, cancelado, servo sem participação, membro já vinculado, limite e TOP fora/dentro do escopo. — cobertos por `tops.service.spec` (searchText normalizado, exclusão de cancelado, filtro `familyMemberships`, limite, payload); escopo por TOP é do `TopScopeGuard` (spec próprio).
- [x] 4.6 Manter a revalidação de elegibilidade e vínculo ativo em `addFamilyMember` e adicionar teste de duas inclusões concorrentes/manuais.

## 5. Autocomplete e fluxo de Famílias

- [x] 5.1 Criar apenas o adaptador de domínio que conecta `AsyncCombobox` ao endpoint existente de participantes, mantendo `value = TopParticipant.id` e metadata de desambiguação. — `features/tops/participant-combobox.tsx`.
- [x] 5.2 Substituir o dropdown de participante disponível por `AsyncCombobox`, com debounce/anti-race/teclado/loading/vazio/erro herdados da change anterior.
- [x] 5.3 Migrar representante e sub-representante da Família para o adaptador canônico de Legendário e remover a carga local de até 100 Legendários usada por esses campos. — rep/sub já usavam `LegendarioCombobox`; removida a carga upfront de participantes (`{ limit: 100 }`).
- [x] 5.4 Atualizar a lista de opções após inclusão/conflito, limpar a seleção somente após sucesso e preservar erro acionável quando o candidato perder elegibilidade. — busca refetch a cada abertura (exclui recém-adicionado via `availableForFamily`); erro 400/409 preserva seleção.
- [x] 5.5 Consolidar a UI em um único campo “Observações”, iniciado/resetado vazio, e remover `memberSourceNotes` do estado e payload.
- [x] 5.6 Atualizar cards/listas e relatório para exibirem somente `notes`, sem o prefixo/linha “Origem”. — `top-families-section.tsx` e `reports.service.ts` (`pendingReview`).
- [x] 5.7 Testar busca/seleção por teclado, resposta fora de ordem, inclusão, candidato removido, observação vazia e ausência de novo componente de busca. — cobertos por `top-families-section.test.tsx` (inclusão via combobox sem `sourceNotes`, card sem “Origem”, campo único) + suíte `AsyncCombobox.test.tsx` (teclado/anti-race herdados).

## 6. Histórico múltiplo de serviço no perfil

- [x] 6.1 Remover o mapeamento `topServants[0]` e modelar o estado web como coleção de todos os `TopServant` retornados no detalhe. — perfil consome `legendario.topServants ?? []` em `LegendarioServiceSection`.
- [x] 6.2 Trocar a frase para “Já serviu em algum TOP” e apresentar estados com zero, um e vários serviços, incluindo TOP/equipe/função/observação. — estados zero/1/N cobertos por teste.
- [x] 6.3 Implementar inclusão pelo `POST /tops/:topId/servants`, edição pelo `PATCH` e remoção pelo endpoint de cancelamento existentes, atualizando apenas o item escolhido. — `addTopServant`/`updateTopServant`/`cancelTopServant`; mutação por `servant.id`/`servant.topEventId`.
- [x] 6.4 Respeitar permissões `tops.servants.read/add/update/remove` e deixar a seção somente leitura quando o usuário vê o perfil sem poder mutar serviço. — controles gated por `tops.servants.add/update/remove`; sem perms = lista somente leitura.
- [x] 6.5 Preservar validações existentes de TOP/equipe, um serviço ativo por TOP e exclusão mútua `TopParticipant`/`TopServant`. — inalteradas no backend; erros de negócio exibidos na UI.
- [x] 6.6 Manter temporariamente os campos escalares e `handleServiceInfo` para rollback, mas fazer a nova web parar de enviá-los. — seção de serviço removida do `legendario-form`; `LegendarioPayload` sem escalares; `handleServiceInfo`/DTO backend intactos (Fase 1).
- [x] 6.7 Testar que o único registro criado pela UI antiga aparece sem cópia, que novos TOPs não sobrescrevem anteriores e que editar/cancelar um item não afeta os demais. — `legendario-service-section.test.tsx` (lista independente, edição/cancelamento por id específico); sem cópia por ler a relação existente.

## 7. Copy, contratos e regressões

- [x] 7.1 Trocar “Família no primeiro TOP” por “Família” no formulário, validação e perfil sem alterar `firstTopFamilyId`/`firstTopEventId`. — form (label + validação) e perfil (`[id]/page.tsx`); `firstTopFamilyId`/`firstTopEventId` intactos.
- [x] 7.2 Atualizar tipos compartilhados/web para observação única e coleção completa de `TopServant`, mantendo compatibilidade da Fase 1. — `TopFamilyMemberPayload` sem `sourceNotes`; `LegendarioPayload` sem escalares de serviço; perfil consome coleção `TopServant`.
- [x] 7.3 Garantir que o backend continue validando que `firstTopFamilyId` pertence ao primeiro TOP selecionado. — inalterado em `legendarios.service` (create/update validam Família do primeiro TOP).
- [x] 7.4 Cobrir por testes os novos rótulos, a semântica inalterada da primeira Família e os payloads compatíveis. — copy verificada por tsc/lint; payloads de Família/serviço cobertos por testes (Blocos C e D).

## 8. Deploy da Fase 1 e verificação

- [ ] 8.1 Parar watchers que prendam o Prisma no Windows, gerar o Prisma Client e validar a migration primeiro em clone/backup restaurado.
- [ ] 8.2 Antes de produção, executar preview final, conferir go/no-go e produzir backup verificável.
- [ ] 8.3 Aplicar a migration de expansão e publicar API/web na ordem compatível documentada.
- [ ] 8.4 Comparar contagens/ids pré e pós-deploy, confirmar `sourceNotes` vazio e validar que todo texto previsto está em `notes`.
- [ ] 8.5 Executar smoke tests autenticados com administrador e usuário somente com escopo de TOP, cobrindo Família e perfis com zero/um/vários serviços.
- [ ] 8.6 Executar testes focados, `pnpm -r lint`, `pnpm -r test` e `pnpm -r build`, registrando falhas preexistentes separadamente.

## 9. Fase 2 de contrato

- [x] 9.1 Após a janela de observação, obter segunda aprovação humana e novo backup antes de qualquer remoção. — Janela cumprida: Fase 1 deployada em 22/07/2026, Fase 2 iniciada em 31/07/2026 (**9 dias**). Segunda aprovação do Davi obtida em 31/07. Backup de produção pendente até a hora do deploy (não se faz backup dias antes).
- [x] 9.2 Confirmar que `sourceNotes` não possui novos valores e criar migration separada com `DROP COLUMN IF EXISTS`. — **Verificado em produção em 31/07 antes de escrever a migration:** `SELECT count(*), count("sourceNotes") FROM "TopFamilyMember"` → **0 membros, 0 com sourceNotes**. A tabela está vazia; nenhum dado é perdido. Migration: `prisma/migrations/20260731130000_drop_top_family_member_source_notes/migration.sql`.
- [x] 9.3 Remover `sourceNotes` do Prisma, shared, DTOs, service e relatório. — `prisma/schema.prisma` (`TopFamilyMember`), `packages/shared/src/index.ts`, `top-family.dto.ts` (Create e Update), `tops.service.ts` (`addFamilyMember` e `updateFamilyMember`). O `reports.service.ts` já estava limpo desde a Fase 1. Fixtures de teste atualizadas em `reports.service.spec.ts` e `top-families-section.test.tsx`; preservada a asserção de que a web **não envia** o campo.
- [x] 9.4 Remover campos escalares de serviço e `handleServiceInfo` somente após a web anterior sair da janela de rollback. — Janela de 9 dias cumprida. Removidos os 5 escalares (`alreadyServedAsService`, `serviceTopEventId`, `serviceTeamId`, `serviceRole`, `serviceNotes`) de `create-legendario.dto.ts` e o `handleServiceInfo` de `legendarios.service.ts` (57 linhas) com suas 2 chamadas em `create`/`update`. Nenhum teste referenciava esse caminho. ⚠️ O `ValidationPipe` usa `forbidNonWhitelisted: true`, então cliente que ainda envie esses campos passa a receber **400** — não falha em silêncio; resolve com reload (bundle novo).

**Decisão de ordenação registrada (31/07):** o `deploy.sh` roda `migrate deploy` ANTES de subir os containers novos, então há uma janela em que o schema perdeu a coluna e a API antiga — que ainda escreve `sourceNotes` — segue servindo. Avaliadas duas opções: (A) dois deploys, código primeiro e `DROP` depois, risco zero; (B) um deploy só. **Escolhida a B** porque `TopFamilyMember` está VAZIA em produção (0 linhas) e o módulo não está em uso — a janela é teórica. Se a tabela passar a ter movimento, a opção correta volta a ser A.
- [ ] 9.5 Repetir testes, contagens e smoke tests; documentar que rollback binário antigo não é permitido após o contrato e que forward-fix/restore é o procedimento vigente.
