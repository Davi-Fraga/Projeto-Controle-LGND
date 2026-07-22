## Why

Telefones aparecem em formatos inconsistentes na interface — `64992485187`, `(42) 99947-1325`, `5564...` — porque só o caminho de **sync/import** normaliza (via `cleanPhone`, que já produz o formato brasileiro com DDD), enquanto os **formulários manuais** salvam o texto cru e **nenhum ponto de exibição** formata. O resultado é um banco misto (canônico do sync + arbitrário do manual/legado) e uma UI inconsistente. Queremos **uma máscara única e consistente** de telefone (e de CPF, para quando houver campo) na exibição e na digitação, reusando o utilitário que já existe.

Nota de investigação: `cleanPhone` (em `packages/shared/src/normalization.ts`) já é a fonte da verdade dos formatos de celular `(DD) NNNNN-NNNN` e fixo `(DD) NNNN-NNNN` (remove DDI 55, zeros à esquerda, trata 10/11 dígitos). Esta change **não reinventa** — envolve/estende esse util e o aplica onde falta. **Não existe campo de CPF** hoje no schema; a máscara de CPF entra como utilitário reutilizável, aplicável onde/quando um campo de CPF existir.

## What Changes

- **Utilitário único de formatação** em `packages/shared` (reuso/co-localizado com `cleanPhone`): `formatPhone` (exibição, tolerante a qualquer formato de entrada, retorna o valor original quando não reconhece) e `formatCpf` (`XXX.XXX.XXX-XX`) + helpers de máscara de digitação. **Não duplicar** máscara por tela.
- **Exibição normalizada em todos os pontos de telefone** — listas e detalhes de Legendários, Igrejas, Líderes Espirituais, painel do organograma, pré-inscrições — passam a exibir via `formatPhone`. Cobre 100% dos dados atuais, sem tocar no armazenamento.
- **Escrita normalizada nos formulários manuais** — ao salvar Legendário/Igreja, o telefone passa por `cleanPhone` (mesma normalização do sync), e o campo ganha **máscara de digitação adaptativa** para 10/11 dígitos. Dado novo/editado nasce canônico; o banco converge com o uso.
- **CPF**: `formatCpf` + máscara de digitação disponíveis para reuso; aplicados onde existir campo de CPF (hoje **nenhum** — util pronto para uso futuro).
- **Sem reescrita do banco em massa** nesta change (decisão de segurança — ver design). Um backfill idempotente com dry-run/preview + backup fica **fora de escopo/opcional**, só se depois for desejado.

## Capabilities

### New Capabilities
- `contact-formatting`: formatação consistente de telefone (e CPF) via utilitário único compartilhado, aplicada na exibição (todos os pontos) e na entrada (máscara + normalização na escrita), tolerando os formatos legados sem reescrever o armazenamento.

### Modified Capabilities
<!-- Nenhuma capability de spec existente muda seu contrato. É aditivo (formatação de apresentação/entrada). -->

## Impact

- **Compartilhado** (`packages/shared/src/normalization.ts` ou módulo irmão): `formatPhone`, `formatCpf` e helpers de máscara de digitação; reuso do `cleanPhone` existente. Testes com os formatos reais (`64992485187`, `(42) 99947-1325`, `5564...`, `+55 64 99988-7766`, 10 e 11 dígitos, valor inválido/curto).
- **Frontend**: pontos de exibição de telefone (`legendarios`, `igrejas`, `lideres-espirituais`, `org-chart/person-panel`, `tops/pre-inscricoes`) usam `formatPhone`; `legendario-form`/`church-form` ganham máscara de digitação e normalizam na submissão (via `cleanPhone`). Um componente/hook de input mascarado reutilizável, não máscara por tela.
- **Backend** (opcional/leve): garantir que a criação/edição manual de Legendário/Igreja também normalize o telefone no service com `cleanPhone` (defesa além da UI), no ponto onde já se trata o campo.
- **Banco**: **sem migration** e **sem backfill** nesta change. `cleanPhone` já é usado no sync/import; nada muda lá.
- **Fora de escopo**: adicionar campo de CPF (não existe; a máscara fica pronta); reescrever telefones existentes no banco (opcional futuro, com dry-run + backup).
