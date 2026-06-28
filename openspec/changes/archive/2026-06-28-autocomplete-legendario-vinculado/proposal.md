## Why

No formulário de usuário, o campo **Legendário vinculado** mostra todos os Legendários numa lista única. Com os 226 importados, isso virou impraticável e aumenta a chance de selecionar a pessoa errada. A urgência cresceu após a importação, e o problema tende a piorar conforme a base cresce.

## What Changes

- Transforma o campo **Legendário vinculado** em um **autocomplete/combobox**: o usuário digita parte do nome e o sistema filtra os resultados.
- A busca acontece no **backend** — o frontend NÃO carrega todos os Legendários para filtrar localmente.
- A busca é **tolerante a acento e a maiúsculas/minúsculas**.
- Cada item exibido mostra **nome, cidade e número** (quando disponível) para desambiguar pessoas com nomes parecidos.
- A opção **"Nenhum"** continua existindo como valor padrão.
- O componente segue um **padrão reaproveitável** (autocomplete com busca no backend, debounce, estados de loading/vazio, limite de resultados) para outros dropdowns de lista cheia do sistema.

## Capabilities

### New Capabilities
- `legendario-autocomplete`: campo de seleção de Legendário com busca no backend (case/acento-insensível), debounce e estados de loading/vazio, itens com nome/cidade/número para desambiguação, opção "Nenhum" como padrão, e um padrão de combobox reaproveitável para outros dropdowns grandes.

### Modified Capabilities
<!-- Nenhuma spec canônica em openspec/specs/. A busca de Legendários compartilha estratégia (case/acento) com a correção em corrigir-busca-legendarios, mas aqui o foco é o componente de seleção e o endpoint de busca leve. -->

## Impact

- **Affected specs**: nova capability `legendario-autocomplete`.
- **Affected code**:
  - API: endpoint de busca **leve/limitada** de Legendários (id + nome + cidade + número), com termo de busca case/acento-insensível e limite de resultados — reusar o endpoint de listagem de Legendários se atender, ou criar um endpoint enxuto dedicado a opções.
  - Web: campo **Legendário vinculado** no formulário de usuário convertido em combobox com debounce, loading/vazio, exibição de nome/cidade/número e opção "Nenhum"; o componente fica genérico o suficiente para reuso.
  - Shared: possível tipo de "opção de Legendário" em `packages/shared`, se aplicável.
- **Affected data**: nenhuma migração própria. A estratégia de busca sem acento no PostgreSQL é compartilhada com `corrigir-busca-legendarios`; se aquela introduzir `unaccent`/coluna normalizada, este change a reaproveita.
- **Risco**: baixo. Não altera auth, CORS, refresh token, Prisma bootstrap ou config global. Ponto de atenção: limite de resultados e endpoint leve para não trazer payload pesado nem travar a tela.
