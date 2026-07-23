## Why

Listagens escopadas já falham fechadas em boa parte do sistema, mas várias mutações, consultas por identificador, opções, pré-inscrições e relatórios não consomem a mesma política efetiva. Isso permite que uma permission legítima seja usada com um ID fora do escopo e também deixa respostas auxiliares exporem dados além do necessário.

## What Changes

- Tornar `AccessPolicyService` a única fonte de semântica para filtros e asserts por Equipe, TOP, Igreja e Cidade.
- Aplicar escopo efetivo a todas as operações de Equipes e Ações Sociais, inclusive membros, participantes e sugestões.
- Aplicar escopo de TOP a listagens, contadores, detalhes, aprovação, rejeição e exclusão de pré-inscrições.
- Aplicar a geografia declarada da tela Relatórios a visualizações, pendências e exports por TOP ou Ação Social.
- Escopar `GET /tops/options` e corrigir o comportamento `TEAM=ALL` na leitura de membros.
- Minimizar o contrato de sugestões de voluntários, sem espalhar o registro completo de Legendário.
- Exigir o papel `COORDINATION_ADMIN`, e não apenas `users.update`, para gerar links administrativos de redefinição de senha.
- Preservar `403` para falta de permission e usar `404` para recurso existente fora do escopo nos endpoints endurecidos contra enumeração.

## Capabilities

### New Capabilities

- `scoped-resource-authorization`: autorização uniforme por recurso nas operações de Equipes, Ações Sociais, TOPs, opções e pré-inscrições.
- `scoped-operational-reporting`: recorte geográfico uniforme em relatórios, pendências, consultas por entidade e exportações.
- `admin-password-reset`: geração de link de redefinição de senha exclusiva do papel administrativo, inclusive diante de permissions residuais.

### Modified Capabilities

Nenhuma spec canônica em `openspec/specs` é modificada.

## Impact

- Backend: `apps/api/src/common/access`, `teams`, `social-actions`, `tops`, `preregistrations`, `reports` e `password-reset`.
- Contratos HTTP: respostas fora de escopo passam a ser negadas; sugestões passam a retornar projeção mínima.
- Testes: matriz `MISSING`/`SELECTED`/`ALL`/derivado, ID fora do escopo, resposta sem PII e metadata administrativa.
- Banco: nenhuma alteração de schema ou migration prevista.
