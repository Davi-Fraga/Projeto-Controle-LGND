## Context

A aba Legendários tem busca que não filtra corretamente. A causa precisa ser **reproduzida e localizada antes de corrigir** — pode estar no frontend (termo não enviado, filtro local sobre a página, race/debounce) ou no backend (parâmetro ignorado, não aplicado no `where`, busca sobre página e não sobre o conjunto). Com 226 registros reais, o bug é reproduzível. É correção pontual, não redesenho.

## Goals / Non-Goals

**Goals**
- Busca correta no backend, antes da paginação, sobre o conjunto completo.
- Case-insensitive e (conforme estratégia) sem acento.
- Frontend só envia o termo e reflete loading/resultado/vazio, sem race.

**Non-Goals**
- Não redesenhar a tela de Legendários nem a paginação.
- Não criar autocomplete (isso é o change `autocomplete-legendario-vinculado`, relacionado mas separado).
- Não alterar auth, CORS, refresh token, Prisma bootstrap ou config global.

## Decisions

### Investigação antes da correção
1. Reproduzir com dados reais e registrar o comportamento observado.
2. Conferir na aba Network se o termo é enviado.
3. Conferir se o backend recebe o parâmetro e o aplica no `where` do Prisma.
4. Confirmar que a busca é sobre o banco inteiro, não sobre a página carregada.
5. Testar caixa e acentos (`joao` → `João`).
6. Conferir debounce e estado do campo.

Corrigir no ponto onde a falha for comprovada — evita "consertar" camada que não é a causa.

### Estratégia de busca sem acento (a decidir na investigação)
Opções no PostgreSQL: `ILIKE` (resolve caixa, não acento); extensão `unaccent` + índice; ou coluna normalizada persistida. A escolha é registrada antes de aplicar; o critério de aceite "sem acento" é condicionado à estratégia aprovada na spec. `ILIKE` cobre o caso de caixa de forma simples; `unaccent` cobre acento mas exige extensão/migração — decisão de trade-off custo vs. completude.

### Frontend: debounce + anti-race
Debounce no campo e guarda contra resposta obsoleta (descartar respostas de requisições mais antigas, ex.: token/sequência ou abort do request anterior).

## Risks / Trade-offs

- **`unaccent` exige extensão/migração**: se escolhido, é a única parte que toca o banco; alternativa `ILIKE` evita migração mas não resolve acento. Trade-off explicitado na investigação.
- **Falsa correção de camada**: mitigado por reproduzir e localizar a causa antes de mexer.
- **Regressão em paginação/filtros**: coberto por testes que exercitam busca + paginação + filtros juntos.

## Migration Plan

Em princípio sem migração. Se a estratégia sem acento aprovada exigir `unaccent`/índice/coluna normalizada, uma migration nova será criada (nunca alterar migration já aplicada) e descrita antes de aplicar. Correção é incremental e reversível.

## Open Questions

- Qual estratégia de busca sem acento adotar no PostgreSQL (`ILIKE` só caixa, `unaccent`, ou coluna normalizada)? Decidir após reproduzir o bug e medir o impacto.
- A causa raiz está no frontend, no backend, ou em ambos? Confirmar na investigação antes de definir o escopo final da correção.
