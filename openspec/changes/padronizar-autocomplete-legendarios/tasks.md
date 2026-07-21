## 1. Contrato de busca e escopo no backend

- [ ] 1.1 Ampliar `legendarios.service.spec.ts` para provar busca de opções por nome normalizado e por número LGND usando o `searchText` existente.
- [ ] 1.2 Testar limite padrão/configurado, payload enxuto e filtro de ativos de `LegendariosService.options`, sem criar endpoint ou normalização paralelos.
- [ ] 1.3 Adicionar teste de usuário restrito confirmando que `buildLegendaryWhere(scope)` entra no `AND` da consulta e impede resultados fora do escopo; manter administrador irrestrito.
- [ ] 1.4 Conferir que as permissões dos 12 consumidores já incluem `legendarios.read`; registrar incompatibilidade antes de qualquer eventual ajuste de RBAC.

## 2. Infraestrutura e componente único

- [ ] 2.1 Evoluir `AsyncCombobox` com opção ativa, ArrowDown/ArrowUp, Enter, Escape, retorno de foco e atributos ARIA coerentes, preservando debounce e guarda anti-race.
- [ ] 2.2 Criar testes do `AsyncCombobox` para mouse, debounce/anti-race, loading/vazio, navegação por teclado, Escape e estado ARIA selecionado.
- [ ] 2.3 Criar `LegendarioCombobox` em `features/legendarios`, centralizando `getLegendarioOptions(search, 20)`, conversão de metadata, valor/rótulo atual, opcionalidade, disabled e callback por ID.
- [ ] 2.4 Testar `LegendarioCombobox` para busca, seleção, valor atual antes da busca, limpeza opcional, campo obrigatório e metadata consistente.

## 3. Usuários e convites

- [ ] 3.1 Migrar `features/users/user-form.tsx` para `LegendarioCombobox`, removendo fetcher/mapeamento local e preservando o vínculo atual e a opção `Nenhum`; adicionar teste do formulário.
- [ ] 3.2 Migrar `dashboard/usuarios/convidar/page.tsx` para `LegendarioCombobox`, removendo fetcher/mapeamento local e preservando limpeza/reset; adicionar teste da página ou componente extraído.

## 4. TOPs e famílias

- [ ] 4.1 Migrar os seis campos de `top-form.tsx`, remover `PersonSelect` e a carga `searchLegendarios(perPage: 100)`, preservar rótulos atuais e testar todos os seis bindings.
- [ ] 4.2 Migrar representante e sub-representante de `top-families-section.tsx`, remover a carga de opções com limite 100 e testar seleção, edição e limpeza dos dois campos.
- [ ] 4.3 Migrar coordenador e subcoordenador de `top-team-form.tsx`, remover a lista de 100 Legendários e testar os dois bindings e rótulos atuais.
- [ ] 4.4 Migrar o campo obrigatório de `top-participant-form.tsx`, remover a lista antecipada, preservar valor atual e testar seleção/validação.
- [ ] 4.5 Migrar o campo obrigatório de `top-servant-form.tsx`, remover a lista antecipada, preservar valor atual e testar seleção/validação.

## 5. Equipes

- [ ] 5.1 Migrar coordenador e subcoordenador de `team-form.tsx`, remover os selects/listagem de 100 e testar seleção, edição e limpeza dos dois campos.
- [ ] 5.2 Migrar o Legendário de `team-member-form.tsx`, remover a lista de 100, manter obrigatório na criação e disabled na edição, com teste para ambos os estados.

## 6. Comunicação

- [ ] 6.1 Migrar o destinatário `LEGENDARY` de `communication-form.tsx`, remover `legendaryOptions` e seu carregamento antecipado, manter obrigatório e testar troca de target type e seleção.

## 7. Ações sociais

- [ ] 7.1 Substituir o UUID de responsável em `social-action-form.tsx` por `LegendarioCombobox` obrigatório, usando `SocialAction.responsible` como rótulo atual; testar criação e edição.
- [ ] 7.2 Substituir o UUID de participante em `dashboard/acoes-sociais/[id]/page.tsx` por `LegendarioCombobox` obrigatório, limpar após adicionar e testar seleção/adição.

## 8. Verificação integral

- [ ] 8.1 Executar varredura estática nos 12 consumidores e confirmar ausência de `PersonSelect`, `<select>` de Legendário, listas `perPage/limit: 100` para Legendários, adaptadores duplicados e placeholders de UUID.
- [ ] 8.2 Executar testes focados da API e do web cobrindo nome, número, escopo, teclado, valor atual, seleção/limpeza e cada superfície migrada.
- [ ] 8.3 Executar `pnpm -r lint`, `pnpm -r test` e `pnpm -r build`, registrando separadamente qualquer falha ambiental preexistente.
- [ ] 8.4 Validar manualmente os critérios da spec canônica e atualizar seu status somente após a aprovação e conclusão da implementação.
