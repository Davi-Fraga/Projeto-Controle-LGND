## Context

O formato canônico de telefone `(DD) NNNNN-NNNN` e a normalização (`cleanPhone`) **já existem** em `packages/shared/src/normalization.ts` e são usados no sync do Forms e no import. O gap é: (1) formulários manuais salvam cru; (2) nenhum ponto de **exibição** formata; (3) não há **máscara de digitação**; (4) **não existe campo de CPF** no schema. O banco atual é misto (canônico do sync + arbitrário do manual/legado).

## Goals / Non-Goals

**Goals:**

- Um utilitário único (`formatPhone`, `formatCpf` + máscara de digitação) reusando `cleanPhone`.
- Telefone consistente na **exibição** (todos os pontos) e na **entrada** (máscara + normalização na escrita).
- CPF pronto para reuso (sem campo hoje).
- Cobrir os formatos reais com testes.

**Non-Goals:**

- Reescrever telefones existentes no banco (backfill em massa) — decisão de segurança (D3).
- Adicionar campo de CPF ao schema.
- Mudar o `cleanPhone` (já é a verdade do formato) — só envolvê-lo/estendê-lo.

## Decisions

### D1 — Reusar `cleanPhone` como base; `formatPhone` para exibição

**Escolha:** `formatPhone(value)` = aplica `cleanPhone`; se resultar no padrão `(DD) NNNNN-NNNN`, exibe; se `cleanPhone` não reconhecer (retorna só dígitos), exibe o original. Assim exibição e escrita usam **a mesma** normalização — zero divergência.
**Por quê:** fonte única do formato; tolerante a legado; não-destrutivo (nunca "quebra" um número estranho, só o mostra como está).
**Alternativa descartada:** novo formatador paralelo — duplicaria a regra e divergiria do sync.

### D2 — Máscara de digitação reutilizável (um hook/componente, não por tela)

**Escolha:** um input mascarado reutilizável (formata enquanto digita para `(XX) XXXXX-XXXX`; para CPF `XXX.XXX.XXX-XX`), usado por `legendario-form`/`church-form`. Na submissão, o valor passa por `cleanPhone` antes de ir à API (e o backend também normaliza no service, como defesa).
**Por quê:** o requisito "reutilizável, não duplicar" — um só ponto de máscara; a máscara é só apresentação, a verdade é `cleanPhone`.

### D3 — Normalizar exibição + escrita; NÃO reescrever o banco (recomendação)

**Escolha:** consistência vem de (a) exibição formatada em todos os pontos e (b) normalização na escrita. **Sem backfill em massa** nesta change.
**Por quê:** (a) cobre 100% dos dados atuais com risco zero; (b) faz o novo nascer certo e o banco convergir com o uso. Um `cleanPhone` cego em massa pode deturpar números internacionais, ramais ou lixo — risco desnecessário quando a exibição já resolve o visual. "Só exibição" resolveria o visual mas deixaria o banco sujo pra sempre; por isso incluímos a escrita.
**Alternativa (deferida):** backfill idempotente com dry-run/preview + backup, se depois se quiser o armazenamento 100% canônico — fora desta change.

### D4 — CPF: util pronto, sem campo

**Escolha:** entregar `formatCpf` + máscara de CPF reutilizáveis; **não** adicionar campo de CPF (não existe hoje). Aplicar automaticamente onde/quando um campo de CPF surgir.
**Por quê:** o pedido é "onde houver campo de CPF"; hoje não há. Evita escopo extra (mexer no schema) e deixa a peça pronta.

## Risks / Trade-offs

- **[`cleanPhone` não reconhece um formato]** (número curto/internacional) → `formatPhone` retorna o original, sem quebrar; nunca esconde/deturpa o dado.
- **[Banco segue com formatos crus no armazenamento]** → aceito: a exibição normaliza tudo e a escrita converge; se um dia precisar do storage 100% limpo, o backfill deferido resolve com segurança.
- **[Máscara atrapalhando edição]** → a máscara deve permitir apagar/colar; testar digitação incremental e colagem de número já formatado/cru.

## Migration Plan

Nenhuma migration de banco e nenhum backfill. Mudança é utilitário compartilhado + pontos de UI (+ normalização leve no service). Rollback = reverter os pontos de UI/util.

## Open Questions

- Se, ao rodar o `SELECT ... GROUP BY phone` no banco real, aparecer um volume grande de formatos irrecuperáveis, revisitar se vale o backfill deferido — mas não bloqueia esta change.
