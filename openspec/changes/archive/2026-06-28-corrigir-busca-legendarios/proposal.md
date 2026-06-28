## Why

O filtro de busca na aba **Legendários** não filtra os resultados como deveria. Com os 226 Legendários importados, a busca virou função central da tela e o bug está reproduzível com dados reais — é correção de bug, não feature nova. Sem ela, o operador não consegue localizar pessoas de forma confiável.

## What Changes

- Diagnostica e corrige a busca no ponto comprovado da falha (investigação obrigatória antes de codar): termo enviado à API, recebido pelo backend e aplicado no `where` do Prisma **antes** da paginação, sobre o conjunto completo de Legendários — não apenas sobre a página já carregada no frontend.
- Garante busca **case-insensitive** e, quando suportado pela estratégia aprovada, **tolerante a acento** (ex.: `joao` encontra `João`).
- Corrige o comportamento do campo no frontend (debounce e estado) para disparar nova consulta ao alterar/limpar o termo, sem requisições obsoletas sobrescreverem o resultado atual.
- Mantém paginação, ordenação e demais filtros funcionando em conjunto com a busca.
- Adiciona testes cobrindo o backend (aplicação da busca na query) e o comportamento relevante do frontend.

## Capabilities

### New Capabilities
- `legendarios-search`: busca textual de Legendários aplicada no backend (case-insensitive e, conforme estratégia, tolerante a acento), antes da paginação e ordenação, sobre o conjunto completo, com o frontend apenas enviando o termo (debounce, anti-race) e refletindo loading/resultado/vazio.

### Modified Capabilities
<!-- Nenhuma spec canônica em openspec/specs/ para Legendários. O comportamento corrigido é descrito como requisito da nova capability legendarios-search. -->

## Impact

- **Affected specs**: nova capability `legendarios-search`.
- **Affected code**:
  - API: módulo de Legendários — DTO de query/listagem e service, aplicando o termo de busca no `where` do Prisma antes de paginar/ordenar. (Ponto exato confirmado na investigação.)
  - Web: feature de Legendários — envio do termo de busca à API, debounce, prevenção de race condition e estados de loading/vazio.
- **Affected data**: nenhuma migração de dados. Caso a estratégia aprovada de busca sem acento exija (ex.: extensão `unaccent` ou coluna normalizada), isso é decidido na investigação e descrito antes de aplicar.
- **Risco**: baixo — correção localizada. Não altera auth, CORS, refresh token, Prisma bootstrap ou config global. O ponto sensível é a estratégia de busca sem acento no PostgreSQL, definida após reproduzir o bug.
