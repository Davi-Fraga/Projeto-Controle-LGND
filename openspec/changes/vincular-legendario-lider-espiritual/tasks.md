> Vínculo aditivo, coexistindo com o texto livre. Reusa `AsyncCombobox` + `getLegendarioOptions` (escopado) — sem busca nova. Backend valida sempre; migration idempotente sem perda. **Não** implementar antes da aprovação humana.

## 1. Banco (migration nova)

- [x] 1.1 `schema.prisma`: adicionar `Church.spiritualLeaderLegendaryId String? @db.Uuid` + relação `spiritualLeaderLegendary Legendary? @relation("ChurchSpiritualLeaderLegendary", fields: [spiritualLeaderLegendaryId], references: [id])` + `@@index([spiritualLeaderLegendaryId])`; adicionar o lado inverso em `Legendary`.
- [x] 1.2 Gerar migration nova (`pnpm db:migrate:dev`) — aditiva, nullable, nunca alterar migration aplicada. Confirmar que igrejas existentes ficam com o campo nulo.

## 2. Compartilhado

- [x] 2.1 `packages/shared`: `Church` ganha `spiritualLeaderLegendaryId?: string | null` e (na view) opcionalmente o legendário resumido `{ id, fullName }`.

## 3. Backend — DTO, validação, nome efetivo, auditoria

- [x] 3.1 `create-church.dto.ts`/`update-church.dto.ts`: campo `spiritualLeaderLegendaryId?` (`@IsUUID` opcional; aceitar `null` para desvincular, no padrão dos demais campos anuláveis).
- [x] 3.2 `churches.service.ts` (create/update): validar que o legendário existe e não está excluído (`validateSpiritualLeaderLegendary`, espelhando `validateSpiritualLeaderUser`); recusar id inválido; persistir `spiritualLeaderLegendaryId` **sem** apagar `spiritualLeaderName`.
- [x] 3.3 Nome efetivo na leitura: `spiritualLeadersView` (e detalhe da igreja) derivam `nomeEfetivo = legendárioVinculado?.fullName ?? spiritualLeaderName`; se o legendário vinculado estiver soft-deleted, cair no texto livre. Incluir na resposta o legendário resumido para o front navegar/exibir.
- [x] 3.4 Auditoria: registrar antes/depois do `spiritualLeaderLegendaryId` ao mudar (espelhando o bloco que já existe para `spiritualLeaderUserId`).
- [x] 3.5 Testes de service (espelham `churches.service.spec`): vincular grava sem apagar texto; desvincular restaura; id inexistente recusado; nome efetivo (vínculo vence, fallback no texto, fallback quando legendário soft-deleted); auditoria da mudança.

## 4. Frontend — formulário de igreja

- [x] 4.1 `church-form.tsx`: na seção "Líder Espiritual", adicionar o **`AsyncCombobox`** (fetch `getLegendarioOptions`) para "Vincular legendário" (opcional), **acima/junto** do campo "Nome do Líder (livre)" — sem remover o texto livre nem o `<select>` de usuário de acesso (mantê-los separados e rotulados).
- [x] 4.2 Estado do form: `spiritualLeaderLegendaryId` (id selecionado). Ao carregar uma igreja com vínculo, pré-preencher o combobox com o legendário atual (buscar por id, padrão do `user-form`).
- [x] 4.3 Exibição do nome efetivo onde o líder espiritual aparece (aba **Líderes Espirituais**, **detalhe da igreja**): mostrar o nome do legendário vinculado quando houver; texto livre caso contrário. Deixar claro visualmente que é um legendário vinculado (ex.: navegável) vs texto livre.

## 5. Verificação

- [x] 5.1 `pnpm -r lint && pnpm -r test && pnpm -r build`.
- [x] 5.2 Percorrer os critérios de aceite da spec `church-spiritual-leader-link`, um a um: vincular/manter livre/desvincular; precedência do vínculo; nome acompanha correção do legendário; id inexistente recusado; busca escopada; igrejas atuais intactas pós-migration; `spiritualLeaderUserId` inalterado; auditoria.
- [x] 5.3 Confirmar que a busca de legendário no combobox respeita o escopo (usuário restrito não vê fora do escopo) e que o backend recusa vínculo fora do escopo/ inexistente mesmo via API direta.
