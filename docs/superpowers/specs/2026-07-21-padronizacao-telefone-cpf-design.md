# Padronização de telefone e CPF — design

Data: 2026-07-21
Status: implementado e validado
OpenSpec: `openspec/changes/padronizar-formatacao-telefone-cpf/`

## Contexto

O sistema recebe telefones por importação, sincronização do Forms e formulários manuais. O `cleanPhone`, em `packages/shared/src/normalization.ts`, já é a fonte canônica para números brasileiros, mas a escrita manual e os pontos de exibição ainda usam valores crus. Isso produz aparências diferentes para o mesmo número e permite que novos dados sejam gravados fora do padrão.

Não existe campo de CPF no schema atual. Esta mudança entrega apenas os utilitários reutilizáveis de CPF, sem criar coluna, formulário ou migration.

## Decisões

- Reusar `cleanPhone` como única regra de normalização de telefone.
- Formatar celulares de 11 dígitos como `(DD) NNNNN-NNNN` e telefones de 10 dígitos como `(DD) NNNN-NNNN`.
- `formatPhone` deve preservar o valor original quando `cleanPhone` não reconhecer um telefone completo.
- `formatCpf` e as máscaras de entrada devem limitar-se aos dígitos e à pontuação visual, sem validar a titularidade ou os dígitos verificadores do CPF.
- Formulários de Legendário e Igreja aplicam máscara durante a digitação e enviam `cleanPhone(value)`.
- Services de Legendário e Igreja repetem a normalização como defesa de backend.
- A busca numérica de Legendários deve continuar encontrando tanto números legados sem pontuação quanto números canônicos formatados.
- Nenhum telefone existente será reescrito em massa; não há migration nem backfill nesta change.

## Arquitetura e pontos afetados

| Camada | Mudança |
|---|---|
| `packages/shared/src/normalization.ts` | `formatPhone`, `formatCpf`, `maskPhoneInput`, `maskCpfInput` |
| API de Legendários e Igrejas | normalização defensiva antes da persistência |
| Busca de Legendários | compatibilidade entre armazenamento legado e canônico |
| Formulários web | máscara compartilhada e normalização antes da chamada à API |
| Listas e detalhes web | `formatPhone` em todos os pontos de exibição mapeados |
| Banco | nenhuma alteração estrutural ou atualização em massa |

## Casos de referência

- `64992485187` e `5564992485187` → `(64) 99248-5187`.
- `(42) 99947-1325` → `(42) 99947-1325`.
- `+55 64 99988-7766` → `(64) 99988-7766`.
- `6432217788` → `(64) 3221-7788`.
- valor curto, texto ou telefone internacional não reconhecido → valor original na exibição.
- `12345678901` → `123.456.789-01`.

## Escopo

Incluído:

- utilitários compartilhados e testes;
- exibição consistente em Legendários, Igrejas, Líderes Espirituais, organograma e pré-inscrições;
- máscara nos formulários manuais de Legendário e Igreja;
- normalização defensiva nos services;
- preservação da busca por telefone.

Fora do escopo:

- campo de CPF no banco ou na interface;
- validação de dígitos verificadores de CPF;
- migration ou backfill de telefones;
- alteração dos fluxos de sync/import que já usam `cleanPhone`.

## Critérios de aceite

1. Formatos legados equivalentes exibem o mesmo telefone canônico.
2. Valores não reconhecidos permanecem visíveis sem erro ou alteração destrutiva.
3. Máscaras de telefone e CPF permitem digitar, colar, corrigir e apagar.
4. Legendários e Igrejas novos ou editados têm telefone normalizado na API, mesmo que o cliente não aplique máscara.
5. A busca numérica encontra telefones armazenados com ou sem pontuação.
6. Todos os pontos de exibição inventariados usam `formatPhone`.
7. Nenhum dado existente é atualizado em massa e nenhuma migration é criada.
8. Testes focados, lint, suítes e builds são executados; limitações ambientais são registradas separadamente.

## Aprovação

Plano e correções de contrato aprovados pelo usuário em 2026-07-21.

## Evidências de implementação

- Testes focados: API 66/66 e web 14/14.
- Suítes completas finais, executadas sequencialmente: API 322/322 e web 71/71. O runner paralelo repetido excedeu o timeout de 5 s de alguns testes web sob contenção com Jest; os mesmos testes passaram isoladamente.
- `pnpm -r lint`: shared, API e web aprovados.
- Build: shared e API aprovados; Next compilou, validou tipos e gerou 25 páginas. A cópia final de symlinks do `output: standalone` parou por `EPERM` no Windows, limitação ambiental conhecida.
- `openspec validate padronizar-formatacao-telefone-cpf --strict`: aprovado.
- Inventário web sem exibição crua de telefone nos pontos mapeados; Prisma schema e migrations sem alterações.
- Banco local, consulta somente leitura: 242 Legendários ativos; 241 telefones de 11 dígitos, 1 de 10 dígitos, nenhum vazio ou com comprimento irrecuperável.
