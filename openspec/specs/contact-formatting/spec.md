# contact-formatting Specification

## Purpose
TBD - created by archiving change padronizar-formatacao-telefone-cpf. Update Purpose after archive.
## Requirements
### Requirement: Utilitário único de formatação de telefone

O sistema SHALL ter um único utilitário compartilhado de formatação de telefone, reusando a normalização canônica existente (`cleanPhone`: celular `(DD) NNNNN-NNNN`, fixo `(DD) NNNN-NNNN`). A máscara NÃO SHALL ser duplicada por tela. O utilitário SHALL tolerar os formatos legados (só dígitos, com DDI 55, já formatado) e, quando não reconhecer o número, SHALL retornar o valor original sem quebrar.

#### Scenario: Formatos legados viram o padrão

- **WHEN** o valor armazenado é `64992485187`, `5564992485187` ou `(42) 99947-1325`
- **THEN** o utilitário exibe `(64) 99248-5187`, `(64) 99248-5187` e `(42) 99947-1325` respectivamente

#### Scenario: Valor não reconhecido é preservado

- **WHEN** o valor não tem comprimento de telefone válido (ex.: número parcial ou texto)
- **THEN** o utilitário retorna o valor original, sem lançar erro

### Requirement: Exibição consistente de telefone em todos os pontos

Todos os pontos que exibem telefone (listas e detalhes de Legendários, Igrejas, Líderes Espirituais, painel do organograma, pré-inscrições) SHALL usar o utilitário de formatação. A exibição NÃO SHALL depender do formato como o dado está armazenado.

#### Scenario: Mesmo número, mesma aparência

- **WHEN** dois registros têm o mesmo telefone gravado em formatos diferentes
- **THEN** ambos aparecem idênticos na interface, no formato padrão

### Requirement: Máscara e normalização na entrada de telefone

Os formulários que editam telefone (Legendário, Igreja) SHALL aplicar **máscara de digitação adaptativa** `(XX) XXXX-XXXX` para 10 dígitos e `(XX) XXXXX-XXXX` para 11 dígitos e SHALL normalizar o valor na gravação com a mesma normalização canônica (`cleanPhone`), de modo que dados novos/editados sejam salvos no formato padrão. A digitação NÃO SHALL impedir o usuário de apagar/corrigir.

#### Scenario: Digitação já formatada

- **WHEN** o usuário digita `64992485187` no campo de telefone
- **THEN** o campo exibe `(64) 99248-5187` durante a digitação

#### Scenario: Gravação normalizada

- **WHEN** o usuário salva um Legendário/Igreja com telefone digitado em qualquer formato
- **THEN** o valor é gravado no formato canônico correspondente ao tamanho: celular `(DD) NNNNN-NNNN` ou fixo `(DD) NNNN-NNNN`

### Requirement: Busca compatível com armazenamento legado e canônico

A busca numérica de Legendários SHALL encontrar o telefone quando o banco contiver somente dígitos ou o formato canônico pontuado. A normalização da escrita NÃO SHALL tornar registros novos ou editados invisíveis para a busca existente.

#### Scenario: Mesmo número em dois formatos de armazenamento

- **WHEN** o usuário busca o número completo e há registros `64992485187` e `(64) 99248-5187`
- **THEN** ambos são candidatos da consulta, sem remover a interseção com o escopo de acesso

### Requirement: Máscara de CPF reutilizável

O sistema SHALL oferecer um utilitário de formatação de CPF (`XXX.XXX.XXX-XX`) e máscara de digitação, no mesmo padrão reutilizável do telefone, aplicável onde existir campo de CPF. Onde NÃO houver campo de CPF, o utilitário SHALL apenas existir para reuso, sem ponto de aplicação forçado.

#### Scenario: Formatação de CPF

- **WHEN** um CPF `12345678901` é formatado para exibição
- **THEN** aparece `123.456.789-01`

#### Scenario: CPF sem campo hoje

- **WHEN** não existe campo de CPF no sistema
- **THEN** o utilitário fica disponível para uso futuro, sem quebrar nada e sem exigir aplicação

### Requirement: Não reescrever o armazenamento nesta mudança

Esta mudança NÃO SHALL reescrever em massa os telefones já gravados no banco. A consistência SHALL vir da exibição (todos os pontos) e da normalização na escrita (dados novos/editados). Qualquer normalização em massa do armazenamento, se feita depois, SHALL ser passo idempotente com dry-run/preview e backup — fora do escopo desta change.

#### Scenario: Dados atuais preservados

- **WHEN** esta mudança é aplicada
- **THEN** nenhum telefone existente no banco é alterado; a consistência aparece pela formatação de exibição

