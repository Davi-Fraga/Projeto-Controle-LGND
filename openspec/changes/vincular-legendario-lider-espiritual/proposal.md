## Why

O líder espiritual da igreja hoje é só **texto livre** (`Church.spiritualLeaderName`, ex.: "Amilton"). Muitos líderes espirituais **já são legendários cadastrados** — mas não há como apontar para o cadastro deles. Isso perde a ligação (não dá para navegar ao legendário, o nome não acompanha correções no cadastro, não há dado estruturado). Ao mesmo tempo, **nem todo líder espiritual é legendário** — alguns precisam continuar como texto livre. Queremos **vincular um legendário quando fizer sentido, sem tirar** a opção de texto livre.

Nota de investigação: já existe `Church.spiritualLeaderUserId` (→ `User`), mas ele é sobre **acesso** (qual usuário loga como líder espiritual e vê a igreja, papel `SPIRITUAL_LEADER`), **não** sobre identidade/cadastro. Este vínculo novo é com **`Legendary`** (o cadastro da pessoa), independente de ela ter login. E o padrão de "vincular legendário" já existe no `user-form` (`AsyncCombobox` + `getLegendarioOptions`, escopado) — será **reusado**, não recriado.

## What Changes

- **Novo vínculo opcional `Church.spiritualLeaderLegendaryId` (→ `Legendary`)** coexistindo com o texto livre atual. Os campos existentes (`spiritualLeaderName`, `spiritualLeaderPhone`, `spiritualLeaderUserId`) **permanecem** e continuam funcionando.
- **Regra de coexistência (nome efetivo do líder espiritual):**
  - Legendário vinculado → nome vem do **`legendary.fullName`** (fonte da verdade).
  - Sem vínculo → usa `spiritualLeaderName` (texto livre), como hoje.
  - Ambos preenchidos → **o vínculo vence** para exibição; o texto livre é **preservado** no banco (desvincular restaura o texto anterior). Nunca apaga o texto ao vincular.
- **Backend**: DTOs de criar/atualizar igreja aceitam `spiritualLeaderLegendaryId` (UUID opcional ou `null` para desvincular); o service valida que o legendário existe (e está no escopo) antes de gravar, e audita a mudança (como já faz para `spiritualLeaderUserId`). A view de líderes espirituais passa a expor o nome efetivo (derivado do vínculo quando houver).
- **Frontend**: no formulário de igreja, a seção "Líder Espiritual" ganha o **autocomplete de legendário** (reuso do `AsyncCombobox` + `getLegendarioOptions`) para vincular, **junto** do campo de nome livre. Com um legendário vinculado, o nome exibido deriva dele; o campo livre fica como alternativa/fallback ao desvincular.
- **Banco (Prisma)**: migration **nova** adicionando a coluna nullable + FK + índice. Todas as igrejas atuais mantêm o texto livre; o campo novo nasce nulo → sem quebra, sem perda.

## Capabilities

### New Capabilities
- `church-spiritual-leader-link`: vínculo opcional do líder espiritual da igreja a um `Legendary` cadastrado, coexistindo com o nome em texto livre; regra de nome efetivo (vínculo vence, texto preservado), reusando o autocomplete escopado de legendário.

### Modified Capabilities
<!-- `church-actions` não muda seu contrato (criar/editar/excluir igreja seguem iguais); o vínculo é aditivo. Descrito na nova capability. -->

## Impact

- **Banco/Prisma**: `Church.spiritualLeaderLegendaryId String? @db.Uuid` + relação para `Legendary` + `@@index`. Migration nova (`pnpm db:migrate:dev`); nenhuma migration aplicada é alterada.
- **Backend** (`apps/api/src/modules/churches`): `create-church.dto.ts`/`update-church.dto.ts` (+ campo UUID opcional), `churches.service.ts` (validação do legendário no escopo + persistência + auditoria + nome efetivo na view), specs.
- **Frontend** (`apps/web/src/features/churches`): `church-form.tsx` (autocomplete de legendário + texto livre coexistindo), exibição do nome efetivo onde o líder espiritual aparece (aba Líderes Espirituais, detalhe da igreja).
- **Compartilhado**: tipo `Church` em `packages/shared` ganha `spiritualLeaderLegendaryId?` (e opcionalmente o legendário resumido na view).
- **Fora de escopo**: alterar o significado de `spiritualLeaderUserId` (acesso) — permanece intacto; criar uma busca nova (reusa a existente); mudar o telefone para derivado (fica como decisão no design, default = texto livre inalterado).
