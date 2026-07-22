> Change pequena. Reusa `cleanPhone` (formatos brasileiros de 10/11 dígitos já existentes) — não duplicar máscara por tela. Sem migration, sem backfill (D3). CPF = util pronto (não há campo hoje). Implementação aprovada em 2026-07-21.

## 1. Utilitário compartilhado

- [x] 1.1 `packages/shared`: `formatPhone(value)` (reusa `cleanPhone`; retorna original quando não reconhece) e `formatCpf(value)` (`XXX.XXX.XXX-XX`). Co-localizar com `normalization.ts`.
- [x] 1.2 Helpers de máscara de digitação reutilizáveis (telefone adaptativo `(XX) XXXX-XXXX`/`(XX) XXXXX-XXXX`, CPF `XXX.XXX.XXX-XX`) — um util compartilhado, não máscara por tela.
- [x] 1.3 Testes com formatos reais: `64992485187`, `5564992485187`, `(42) 99947-1325`, `+55 64 99988-7766`, 10 e 11 dígitos, valor curto/inválido (retorna original), CPF válido.

## 2. Exibição (todos os pontos de telefone)

- [x] 2.1 Aplicar `formatPhone` nos pontos de exibição: `legendarios` (lista + detalhe), `igrejas` (lista + detalhe/modal), `lideres-espirituais`, `org-chart/person-panel`, `tops/.../pre-inscricoes`. Substituir `item.phone`/`spiritualLeaderPhone`/`relativePhone` crus pela versão formatada.

## 3. Entrada (formulários) + escrita

- [x] 3.1 `legendario-form` e `church-form`: campo de telefone com **máscara de digitação**; na submissão, normalizar com `cleanPhone` antes de enviar à API.
- [x] 3.2 Backend (defesa): garantir que create/update manual de Legendário/Igreja normalize o telefone no service com `cleanPhone` no ponto onde já trata o campo (para não depender só da UI) e preservar a busca de Legendários nos formatos legado e canônico.
- [x] 3.3 CPF: deixar a máscara/`formatCpf` prontos e documentados para reuso; aplicar automaticamente onde houver campo (hoje nenhum) — sem forçar ponto de aplicação.

## 4. Verificação

- [x] 4.1 `pnpm -r lint` ✓; suítes finais sequenciais ✓ (API 322/322, web 71/71). O runner paralelo `pnpm -r test` passou antes da cobertura final e, nas repetições finais, excedeu o timeout de 5 s de testes web sob contenção com Jest; os mesmos testes passaram isoladamente. Shared e API build ✓. O Next compilou, validou tipos e gerou 25 páginas; falhou somente ao copiar symlinks do `output: standalone` (`EPERM` no Windows), limitação ambiental já conhecida e posterior à compilação.
- [x] 4.2 Critérios de `contact-formatting` verificados por testes e inventário: formatos legados e CPF, valor não reconhecido, máscaras incrementais, escrita defensiva, busca legado/canônico e pontos de exibição. `rg` não encontrou exibição crua remanescente e não houve alteração em schema/migrations.
- [x] 4.3 Consulta agregada e somente leitura executada no banco local: 242 Legendários ativos, 241 telefones com 11 dígitos, 1 com 10 dígitos, 0 vazios e 0 com comprimento irrecuperável; nenhum dado foi exposto ou alterado.
