## Context

O campo **Legendário vinculado** no formulário de usuário renderiza todos os Legendários numa lista única — inviável com 226 e propenso a seleção errada. A solução é um combobox com busca no backend. Há sobreposição com `corrigir-busca-legendarios` (mesma estratégia de busca case/acento no PostgreSQL); este change foca no componente de seleção e no endpoint leve de opções, reaproveitando a estratégia de busca.

## Goals / Non-Goals

**Goals**
- Combobox com busca no backend, debounce e estados de loading/vazio.
- Itens com nome/cidade/número para desambiguar.
- Manter "Nenhum" como padrão.
- Padrão reaproveitável para outros dropdowns grandes.

**Non-Goals**
- Não corrigir a busca da aba Legendários (é o change `corrigir-busca-legendarios`).
- Não trazer a base inteira para o frontend.
- Não alterar auth, CORS, refresh token, Prisma bootstrap ou config global.

## Decisions

### Endpoint leve de opções
Preferir um endpoint enxuto de busca de opções de Legendário (id, nome, cidade, número) com termo + limite — payload pequeno e rápido. Se o endpoint de listagem existente já permitir projetar campos e limitar, reusá-lo evita duplicação; senão, expor um endpoint dedicado a opções. Decisão tomada na inspeção.

### Estratégia de busca compartilhada
A tolerância a acento/caixa segue a mesma estratégia adotada em `corrigir-busca-legendarios` (ex.: `unaccent`/coluna normalizada/`ILIKE`). Evitar duas implementações divergentes de busca de Legendário no backend.

### Limite de resultados
Definir um limite (ex.: 10–20) que evite tela pesada sem esconder resultados demais — valor confirmado na implementação. O combobox exibe os primeiros N e orienta refinar o termo.

### Componente genérico vs. específico
Construir o combobox de forma parametrizável (fonte de busca, render do item), começando por este campo mas com a fonte de dados injetável, para reaproveitar em outros dropdowns de lista cheia sem reescrever.

## Risks / Trade-offs

- **Dependência da estratégia de busca**: se `corrigir-busca-legendarios` ainda não definiu `unaccent`, este change pode começar com `ILIKE` e evoluir — alinhar para não divergir.
- **Generalizar cedo demais**: parametrização mínima agora (fonte + render do item); não sobre-engenheirar um framework de combobox.
- **Limite vs. cobertura**: limite baixo é leve mas pode esconder; mitigado por bom ranqueamento e orientação para refinar o termo.

## Migration Plan

Sem migração própria. Reaproveita a estratégia de busca de `corrigir-busca-legendarios` (e qualquer migration `unaccent` que ela criar). Implementação incremental: endpoint de opções + testes, depois o combobox no campo. Reversível — fallback ao select atual se necessário.

## Open Questions

- Reusar o endpoint de listagem de Legendários (projetando campos + limite) ou criar um endpoint dedicado a opções leves?
- Qual limite de resultados por busca (ex.: 10–20)?
- Coordenar com `corrigir-busca-legendarios` a estratégia única de busca sem acento — qual change define a migration `unaccent`, se houver?
- O componente já nasce genérico para outros dropdowns ou específico primeiro para este campo e generalizado depois?
