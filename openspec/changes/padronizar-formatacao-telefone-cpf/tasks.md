> Change pequena. Reusa `cleanPhone` (formato `(DD) NNNNN-NNNN` já existente) — não duplicar máscara por tela. Sem migration, sem backfill (D3). CPF = util pronto (não há campo hoje). **Não** implementar antes da aprovação humana.

## 1. Utilitário compartilhado

- [ ] 1.1 `packages/shared`: `formatPhone(value)` (reusa `cleanPhone`; retorna original quando não reconhece) e `formatCpf(value)` (`XXX.XXX.XXX-XX`). Co-localizar com `normalization.ts`.
- [ ] 1.2 Helpers de máscara de digitação reutilizáveis (telefone `(XX) XXXXX-XXXX`, CPF `XXX.XXX.XXX-XX`) — um hook/util de input mascarado, não máscara por tela.
- [ ] 1.3 Testes com formatos reais: `64992485187`, `5564992485187`, `(42) 99947-1325`, `+55 64 99988-7766`, 10 e 11 dígitos, valor curto/inválido (retorna original), CPF válido.

## 2. Exibição (todos os pontos de telefone)

- [ ] 2.1 Aplicar `formatPhone` nos pontos de exibição: `legendarios` (lista + detalhe), `igrejas` (lista + detalhe/modal), `lideres-espirituais`, `org-chart/person-panel`, `tops/.../pre-inscricoes`. Substituir `item.phone`/`spiritualLeaderPhone`/`relativePhone` crus pela versão formatada.

## 3. Entrada (formulários) + escrita

- [ ] 3.1 `legendario-form` e `church-form`: campo de telefone com **máscara de digitação**; na submissão, normalizar com `cleanPhone` antes de enviar à API.
- [ ] 3.2 Backend (defesa): garantir que create/update manual de Legendário/Igreja normalize o telefone no service com `cleanPhone` no ponto onde já trata o campo (para não depender só da UI).
- [ ] 3.3 CPF: deixar a máscara/`formatCpf` prontos e documentados para reuso; aplicar automaticamente onde houver campo (hoje nenhum) — sem forçar ponto de aplicação.

## 4. Verificação

- [ ] 4.1 `pnpm -r lint && pnpm -r test && pnpm -r build`.
- [ ] 4.2 Percorrer os critérios de aceite de `contact-formatting`: formatos legados viram o padrão na exibição; mesmo número → mesma aparência; digitação mascarada; gravação normalizada; valor não reconhecido preservado; CPF formatado; nenhum telefone do banco alterado.
- [ ] 4.3 (Opcional, informativo) rodar `SELECT phone, count(*) FROM "Legendary" ... GROUP BY phone` no banco real para conferir a distribuição e confirmar que a exibição cobre os casos; se houver muito irrecuperável, anotar para avaliar o backfill deferido.
