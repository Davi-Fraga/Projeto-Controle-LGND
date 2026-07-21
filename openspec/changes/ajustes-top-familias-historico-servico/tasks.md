## 1. Aprovação e dependência

- [ ] 1.1 Obter aprovação humana explícita do modelo, critérios de elegibilidade e plano de migração desta change antes de alterar código ou banco.
- [ ] 1.2 Confirmar que `busca-reutilizavel-entidades-e-listagens` foi implementada/validada ou incluí-la antes desta change no mesmo plano de release.
- [ ] 1.3 Registrar a janela entre Fase 1 (expansão) e Fase 2 (contrato), os responsáveis pelo backup e os critérios de go/no-go de produção.

## 2. Preview e segurança de dados

- [ ] 2.1 Criar script SQL somente leitura que conte combinações de `TopFamilyMember.notes/sourceNotes`, liste amostra dos casos divergentes e não execute mutations.
- [ ] 2.2 Incluir no preview contagens/ids de `TopServant`, distribuição por Legendário/TOP, referências inválidas e duplicidades ativas por `(topEventId, legendaryId)`.
- [ ] 2.3 Executar o preview em cópia representativa, anexar o resultado ao handoff de deploy e bloquear continuidade se houver duplicidade ativa ou observação divergente não revisada.
- [ ] 2.4 Documentar e ensaiar o backup `pg_dump`/restore, incluindo timestamp, tamanho, checksum e histórico de migrations.

## 3. Migration de expansão

- [ ] 3.1 Criar migration nova, transacional e idempotente que mescle `sourceNotes` em `notes` pela tabela de decisão do design e depois deixe `sourceNotes = NULL`, sem remover a coluna.
- [ ] 3.2 Criar com `IF NOT EXISTS` o índice de leitura do histórico de `TopServant` por Legendário/status/data.
- [ ] 3.3 Criar o índice único parcial de serviço ativo por `(topEventId, legendaryId)`, condicionado ao preview sem duplicidades e alinhado à regra `ensureServantAvailable`.
- [ ] 3.4 Adicionar testes/validação da migration para somente notes, somente sourceNotes, textos iguais, textos diferentes, rerun seguro e preservação de ids/FKs/contagens.

## 4. Opções elegíveis de participantes do TOP

- [ ] 4.1 Criar DTO de opções de participante derivado/compatível com `OptionsQueryDto`, incluindo o contexto opcional `availableForFamily`.
- [ ] 4.2 Evoluir `participantOptions` para pesquisar `legendary.searchText` com normalização canônica, limite e payload enxuto já existente.
- [ ] 4.3 Quando `availableForFamily=true`, filtrar participantes não cancelados/não excluídos do `topEventId` e excluir quem possui Família ativa no mesmo TOP antes do limite.
- [ ] 4.4 Preservar `JwtAuthGuard`, `tops.participants.read` e `TopScopeGuard` como escopo autoritativo do sub-recurso, sem aplicar filtro geográfico que invalide usuário somente com `topIds`.
- [ ] 4.5 Testar nome sem acento, número LGND, TOP diferente, cancelado, servo sem participação, membro já vinculado, limite e TOP fora/dentro do escopo.
- [ ] 4.6 Manter a revalidação de elegibilidade e vínculo ativo em `addFamilyMember` e adicionar teste de duas inclusões concorrentes/manuais.

## 5. Autocomplete e fluxo de Famílias

- [ ] 5.1 Criar apenas o adaptador de domínio que conecta `AsyncCombobox` ao endpoint existente de participantes, mantendo `value = TopParticipant.id` e metadata de desambiguação.
- [ ] 5.2 Substituir o dropdown de participante disponível por `AsyncCombobox`, com debounce/anti-race/teclado/loading/vazio/erro herdados da change anterior.
- [ ] 5.3 Migrar representante e sub-representante da Família para o adaptador canônico de Legendário e remover a carga local de até 100 Legendários usada por esses campos.
- [ ] 5.4 Atualizar a lista de opções após inclusão/conflito, limpar a seleção somente após sucesso e preservar erro acionável quando o candidato perder elegibilidade.
- [ ] 5.5 Consolidar a UI em um único campo “Observações”, iniciado/resetado vazio, e remover `memberSourceNotes` do estado e payload.
- [ ] 5.6 Atualizar cards/listas e relatório para exibirem somente `notes`, sem o prefixo/linha “Origem”.
- [ ] 5.7 Testar busca/seleção por teclado, resposta fora de ordem, inclusão, candidato removido, observação vazia e ausência de novo componente de busca.

## 6. Histórico múltiplo de serviço no perfil

- [ ] 6.1 Remover o mapeamento `topServants[0]` e modelar o estado web como coleção de todos os `TopServant` retornados no detalhe.
- [ ] 6.2 Trocar a frase para “Já serviu em algum TOP” e apresentar estados com zero, um e vários serviços, incluindo TOP/equipe/função/observação.
- [ ] 6.3 Implementar inclusão pelo `POST /tops/:topId/servants`, edição pelo `PATCH` e remoção pelo endpoint de cancelamento existentes, atualizando apenas o item escolhido.
- [ ] 6.4 Respeitar permissões `tops.servants.read/add/update/remove` e deixar a seção somente leitura quando o usuário vê o perfil sem poder mutar serviço.
- [ ] 6.5 Preservar validações existentes de TOP/equipe, um serviço ativo por TOP e exclusão mútua `TopParticipant`/`TopServant`.
- [ ] 6.6 Manter temporariamente os campos escalares e `handleServiceInfo` para rollback, mas fazer a nova web parar de enviá-los.
- [ ] 6.7 Testar que o único registro criado pela UI antiga aparece sem cópia, que novos TOPs não sobrescrevem anteriores e que editar/cancelar um item não afeta os demais.

## 7. Copy, contratos e regressões

- [ ] 7.1 Trocar “Família no primeiro TOP” por “Família” no formulário, validação e perfil sem alterar `firstTopFamilyId`/`firstTopEventId`.
- [ ] 7.2 Atualizar tipos compartilhados/web para observação única e coleção completa de `TopServant`, mantendo compatibilidade da Fase 1.
- [ ] 7.3 Garantir que o backend continue validando que `firstTopFamilyId` pertence ao primeiro TOP selecionado.
- [ ] 7.4 Cobrir por testes os novos rótulos, a semântica inalterada da primeira Família e os payloads compatíveis.

## 8. Deploy da Fase 1 e verificação

- [ ] 8.1 Parar watchers que prendam o Prisma no Windows, gerar o Prisma Client e validar a migration primeiro em clone/backup restaurado.
- [ ] 8.2 Antes de produção, executar preview final, conferir go/no-go e produzir backup verificável.
- [ ] 8.3 Aplicar a migration de expansão e publicar API/web na ordem compatível documentada.
- [ ] 8.4 Comparar contagens/ids pré e pós-deploy, confirmar `sourceNotes` vazio e validar que todo texto previsto está em `notes`.
- [ ] 8.5 Executar smoke tests autenticados com administrador e usuário somente com escopo de TOP, cobrindo Família e perfis com zero/um/vários serviços.
- [ ] 8.6 Executar testes focados, `pnpm -r lint`, `pnpm -r test` e `pnpm -r build`, registrando falhas preexistentes separadamente.

## 9. Fase 2 de contrato

- [ ] 9.1 Após a janela de observação, obter segunda aprovação humana e novo backup antes de qualquer remoção.
- [ ] 9.2 Confirmar que `sourceNotes` não possui novos valores e criar migration separada com `DROP COLUMN IF EXISTS`.
- [ ] 9.3 Remover `sourceNotes` do Prisma, shared, DTOs, service e relatório.
- [ ] 9.4 Remover campos escalares de serviço e `handleServiceInfo` somente após a web anterior sair da janela de rollback.
- [ ] 9.5 Repetir testes, contagens e smoke tests; documentar que rollback binário antigo não é permitido após o contrato e que forward-fix/restore é o procedimento vigente.
