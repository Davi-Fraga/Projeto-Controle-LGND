# Vínculo de Legendário ao líder espiritual da igreja — design

Data: 2026-07-21
Status: aprovado para implementação
OpenSpec: `openspec/changes/vincular-legendario-lider-espiritual/`

## Contexto

A igreja já possui um nome livre e um telefone para o líder espiritual, além de
`spiritualLeaderUserId`, que concede acesso ao sistema. Esses dados não identificam
necessariamente um Legendário cadastrado e não devem ser confundidos entre si.

## Decisões

- Adicionar `Church.spiritualLeaderLegendaryId` como vínculo opcional e anulável.
- Manter `spiritualLeaderName`, `spiritualLeaderPhone` e `spiritualLeaderUserId`
  inalterados e independentes.
- O nome efetivo é o `fullName` do Legendário ativo vinculado; sem vínculo válido,
  usa-se o texto livre. A leitura não sobrescreve o texto persistido.
- Legendário excluído logicamente não é aceito em novas gravações e, em leituras,
  faz a interface retornar ao texto livre.
- O backend valida existência e escopo do Legendário. A interface reutiliza o
  `LegendarioCombobox`, já alimentado pelo endpoint escopado de opções.
- A alteração do vínculo é auditada com valores anterior e posterior.
- A migration é somente aditiva, sem backfill, com chave estrangeira `SET NULL`.

## Fluxo

```text
Formulário da igreja
  -> LegendarioCombobox
      -> GET /api/legendarios/options (escopado)
  -> POST/PATCH /api/churches
      -> AccessPolicyService.resolveScope
      -> valida Legendary ativo dentro do escopo
      -> persiste spiritualLeaderLegendaryId sem alterar o texto livre
```

## Critérios de aceite

1. A igreja pode ser salva com vínculo, apenas com texto livre, com ambos ou sem nenhum.
2. Vincular, trocar ou desvincular não apaga o nome livre nem altera o usuário de acesso.
3. UUID inexistente, excluído ou fora do escopo é recusado pelo backend.
4. O nome vinculado prevalece na exibição e acompanha mudanças no `fullName`.
5. Sem vínculo ativo, a exibição retorna ao texto livre.
6. O vínculo atual aparece preenchido na edição e pode ser limpo.
7. Mudanças no vínculo são auditadas com autor, antes e depois.
8. Igrejas existentes permanecem válidas com o novo campo nulo.

## Fora de escopo

Backfill automático, remoção dos campos livres, derivação de telefone, mudança das
regras de `spiritualLeaderUserId`, auth, CORS, refresh token ou novas permissões.
