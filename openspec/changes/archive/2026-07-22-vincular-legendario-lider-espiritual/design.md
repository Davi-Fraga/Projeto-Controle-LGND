## Context

O líder espiritual da `Church` hoje é texto livre (`spiritualLeaderName` + `spiritualLeaderPhone`). Existe também `spiritualLeaderUserId` (→ `User`), mas ele é sobre **acesso** (papel `SPIRITUAL_LEADER`, quem loga e vê a igreja — usado no `AccessPolicyService.resolveSpiritualLeaderChurchIds`), não sobre identidade/cadastro. Queremos **identidade**: apontar para o `Legendary` cadastrado, mantendo o texto livre para quem não é legendário.

O padrão de "vincular legendário" já existe e é o que reusamos: o `user-form` usa `AsyncCombobox` + `getLegendarioOptions(search)` (endpoint escopado) para setar um `legendaryId`. Nada de busca nova.

## Goals / Non-Goals

**Goals:**

- Vínculo opcional `Church.spiritualLeaderLegendaryId` coexistindo com o texto livre.
- Regra de nome efetivo clara (vínculo vence, texto preservado).
- Reuso do autocomplete escopado; validação real no backend; auditoria.
- Migration aditiva idempotente sem perda.

**Non-Goals:**

- Mudar o significado de `spiritualLeaderUserId` (acesso) — fica intacto.
- Criar busca/autocomplete novo.
- Migrar automaticamente textos livres para vínculos (o "Amilton" texto continua texto até alguém vincular manualmente) — fica como possível backfill futuro, fora desta change.
- Transformar `spiritualLeaderPhone` em derivado por padrão (ver D3).

## Decisions

### D1 — Campo novo `spiritualLeaderLegendaryId` (não reusar `spiritualLeaderUserId`)

**Escolha:** adicionar `Church.spiritualLeaderLegendaryId String? @db.Uuid` + relação `Legendary?` + `@@index`. Manter `spiritualLeaderUserId` como está.
**Por quê:** os dois têm semânticas distintas — `userId` = **acesso** (login/RBAC), `legendaryId` = **identidade/cadastro**. Um líder espiritual pode ser um legendário **sem** ter usuário (não loga), e o usuário-líder pode não ter legendário vinculado. Fundir os dois quebraria o controle de acesso e perderia casos.
**Alternativa descartada:** derivar o legendário a partir do `User.legendaryId` do `spiritualLeaderUserId` — só cobre líderes que têm login; a maioria não tem.

### D2 — Nome efetivo: vínculo vence, texto livre preservado

**Escolha:** `nomeEfetivo = spiritualLeaderLegendaryId ? legendary.fullName : spiritualLeaderName`. Vincular **não** apaga `spiritualLeaderName`; desvincular restaura o texto. A derivação é feita na **leitura** (view/serialização), não gravando o nome do legendário no `spiritualLeaderName`.
**Por quê:** fonte da verdade única (o cadastro do legendário) sem duplicar o nome; correções no legendário refletem sozinhas; e preservar o texto livre torna o desvincular reversível e não-destrutivo. Derivar na leitura evita divergência (nome copiado que envelhece).
**Alternativa descartada:** copiar `legendary.fullName` para `spiritualLeaderName` ao vincular — cria cópia que desatualiza e confunde qual é a verdade.

### D3 — Telefone permanece texto livre (por ora)

**Escolha:** `spiritualLeaderPhone` continua texto livre e independente do vínculo.
**Por quê:** o pedido é sobre nome/identidade; o telefone de contato da igreja pode diferir do telefone pessoal do legendário. Derivar o telefone do legendário quando vinculado é uma melhoria possível, mas não requerida — evitar escopo extra silencioso.
**Abertura:** se desejado, a view pode oferecer o telefone do legendário como fallback quando o campo estiver vazio — decidir na implementação, sem virar requisito.

### D4 — Validação + escopo no backend, reuso do autocomplete no front

**Escolha:** o service valida `spiritualLeaderLegendaryId` (existe, não excluído) antes de gravar e recusa id inválido; a UI usa o `AsyncCombobox` + `getLegendarioOptions` (já escopado) — a busca não vaza fora do escopo. O backend é a barreira real.
**Por quê:** consistente com o resto do projeto (backend valida sempre; UI só reflete). Reuso evita duplicar busca/normalização/escopo.

## Risks / Trade-offs

- **[Confusão entre `userId` (acesso) e `legendaryId` (identidade)]** → nomear/documentar claramente; a UI separa "Vincular legendário" (identidade) de "Usuário de acesso" (o `<select>` de user que já existe). Não misturar os dois controles.
- **[Ambos preenchidos e divergentes]** (vínculo aponta para X, texto diz Y) → regra explícita: vínculo vence na exibição; o texto fica preservado mas não exibido enquanto houver vínculo. Documentado no spec.
- **[Migration]** → coluna nullable + FK; `onDelete` do legendário: usar `SetNull`/restrição branda para que excluir (soft delete) um legendário não quebre a igreja. Como o projeto usa **soft delete** (`deletedAt`), o FK aponta para a linha que continua existindo; a validação de leitura ignora legendário `deletedAt` se necessário (cair no texto livre como fallback).
- **[Legendário vinculado foi soft-deleted]** → na leitura, se o legendário vinculado estiver com `deletedAt`, o nome efetivo cai no texto livre (fallback), evitando exibir alguém removido.

## Migration Plan

Migration nova adicionando a coluna nullable + FK + índice. Idempotente e aditiva; nenhuma linha existente é alterada além do default nulo. Rollback = migration reversa dropando a coluna (nenhum dado das igrejas atuais depende dela). `pnpm db:migrate:dev` em dev; nunca alterar migration aplicada.

## Open Questions

- Telefone derivado do legendário quando vinculado (fallback) — implementar como conveniência de leitura ou deixar 100% independente? (D3, decidir na implementação, não bloqueante).
- Exibir um aviso quando texto livre e vínculo divergem muito (para o admin conciliar)? — melhoria de UX opcional, fora do escopo mínimo.
