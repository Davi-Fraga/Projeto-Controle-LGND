## Why

Os formulários ainda carregam listas de 100 a 200 Legendários em `<select>` ou exigem UUID manual, tornando a seleção impraticável e podendo omitir pessoas além do limite carregado. O autocomplete já entregue para o vínculo de usuário deve virar o único padrão de seleção de Legendário em todo o sistema, preservando escopo, valor atual e operação por teclado.

## What Changes

- Evolui o autocomplete existente para um componente único de domínio, reutilizado em todo campo que seleciona diretamente um Legendário.
- Reusa `GET /legendarios/options` para busca limitada por nome ou número LGND, com debounce e sem carregar a base completa no frontend.
- Exige que as sugestões respeitem `AccessPolicyService.buildLegendaryWhere`; adiciona cobertura explícita contra vazamento fora do escopo.
- Preserva o valor e o rótulo atuais na edição, permite limpar campos opcionais e mantém campos obrigatórios sem opção de valor vazio.
- Completa o comportamento acessível de combobox: foco, setas, Enter, Escape e atributos ARIA coerentes.
- Migra 20 campos em 12 superfícies: TOP (6), famílias de TOP (2), equipes de TOP (2), participante de TOP (1), servo de TOP (1), equipe (2), membro de equipe (1), comunicação individual (1), vínculo de usuário (1), convite de usuário (1), responsável por ação social (1) e participante de ação social (1).
- Remove dos consumidores migrados as cargas antecipadas de 100/200 Legendários e os campos manuais de UUID.

## Capabilities

### New Capabilities

<!-- Nenhuma capability nova. -->

### Modified Capabilities

- `legendario-autocomplete`: amplia o autocomplete antes restrito ao campo "Legendário vinculado" para todo seletor direto de Legendário, incluindo busca por número, escopo de acesso, valor atual, obrigatoriedade/limpeza, teclado e migração verificável de todos os consumidores.

## Impact

- **API:** mantém `GET /legendarios/options` e seu contrato enxuto; reforça testes de busca por nome/número, limite e escopo. Não cria endpoint paralelo nem migration.
- **Web compartilhado:** evolui `AsyncCombobox` para acessibilidade completa e cria um adaptador único de domínio para opções de Legendário.
- **Web afetado:** `tops`, `teams`, `communications`, `users`, `invites` e `social-actions` deixam de montar listas próprias ou aceitar UUID manual.
- **Dados e contratos:** IDs persistidos e payloads permanecem iguais; relações já incluídas nas respostas fornecem o rótulo atual quando disponíveis, com resolução pelo detalhe escopado existente nos demais casos.
- **Fora de escopo:** `spiritualLeaderUserId` da igreja (seleciona `User`), seletores de equipe/TOP/cidade, participantes de família (selecionam `TopParticipant`), filtros do organograma, escopos de acesso, sugestões somente informativas de ação social e aprovação de pré-inscrição sem seletor atual.
