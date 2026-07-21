# Autocomplete reutilizável de Legendário — design

Data: 2026-07-20
Status: aguardando aprovação
OpenSpec: `openspec/changes/padronizar-autocomplete-legendarios/`

## Contexto

Há cerca de 243 Legendários e vários formulários ainda carregam 100/200 registros em `<select>`, o que exige rolagem, pode truncar opções e replica lógica. Dois pontos em ações sociais pedem UUID manual. O projeto já possui `GET /legendarios/options` e `AsyncCombobox`, inicialmente usados no vínculo de usuário, mas o padrão ainda não foi aplicado ao sistema inteiro.

## Diagnóstico de reuso

- Reusar `GET /legendarios/options`; não criar endpoint novo.
- O endpoint já usa `OptionsQueryDto` (`search`, `limit`, `activeOnly`), retorna payload enxuto e limita em 20 por padrão.
- A busca usa `Legendary.searchText`, que inclui nome, cidade e número LGND com normalização sem acento/case-insensitive.
- `LegendariosService.options` já combina a busca com `AccessPolicyService.buildLegendaryWhere(scope)` antes da consulta.
- Reforçar testes por nome, número, limite e escopo; nenhuma migration é necessária.

## Pontos afetados

| Superfície | Campos |
|---|---:|
| Edição/criação de TOP | 6 coordenações |
| Famílias de TOP | 2 representantes |
| Equipe vinculada ao TOP | 2 coordenadores |
| Participante de TOP | 1 Legendário |
| Servo de TOP | 1 Legendário |
| Edição/criação de equipe | 2 coordenadores |
| Membro de equipe | 1 Legendário |
| Comunicação individual | 1 destinatário |
| Edição de usuário | 1 vínculo |
| Convite de usuário | 1 vínculo |
| Edição/criação de ação social | 1 responsável |
| Participante de ação social | 1 participante |

Total: **20 campos em 12 superfícies**.

Não são seletores de Legendário e ficam fora: usuário líder espiritual da igreja, membro de família por `TopParticipant`, filtros do organograma, escopos de acesso, equipe/TOP/cidade, sugestões informativas e aprovação atual de pré-inscrição.

## Decisões

- Criar `LegendarioCombobox` como componente de domínio único, apoiado no `AsyncCombobox` genérico.
- Centralizar no componente de domínio o endpoint, limite 20 e apresentação de nome + número/cidade/igreja.
- Evoluir o genérico para setas, Enter, Escape, foco e ARIA de combobox/listbox.
- Passar o rótulo atual pelas relações já autorizadas; quando só houver ID, usar o detalhe escopado existente.
- Campos opcionais permitem limpar; obrigatórios não aceitam vazio; membro de equipe continua bloqueado na edição.
- Remover `PersonSelect`, listas antecipadas de Legendários e inputs manuais de UUID dos consumidores.

## Arquitetura

```text
Formulário
  -> LegendarioCombobox (contrato do domínio)
      -> AsyncCombobox (debounce, anti-race, teclado, ARIA)
          -> GET /api/legendarios/options?search=<termo>&limit=20
              -> buildSearchOr(searchText)
              -> AccessPolicyService.buildLegendaryWhere(scope)
              -> Prisma findMany + take 20
```

## Critérios de aceite

1. Nome sem acento/caixa e número LGND localizam o resultado no backend.
2. Nenhuma busca retorna Legendário fora do escopo do usuário.
3. Nenhum dos 12 consumidores carrega lista de 100/200 Legendários ou exige UUID manual.
4. Os 20 campos usam o mesmo `LegendarioCombobox`.
5. Valor atual aparece na edição; opcionais limpam; obrigatórios rejeitam vazio.
6. Setas, Enter e Escape funcionam e o estado ARIA é coerente.
7. Testes focados cobrem endpoint, componente e cada superfície migrada.

## Fora de escopo

Auth, CORS, refresh token, Prisma bootstrap, migrations, permissões novas, mudanças nos DTOs de mutação e autocompletes de outras entidades.
