## 1. Nome normalizado de Igreja

- [ ] 1.1 Adicionar `Church.normalizedName` ao schema Prisma e criar uma nova migration que faça backfill antes de impor a coluna obrigatória e seu índice.
- [ ] 1.2 Atualizar criação e edição de Igreja para persistirem `normalizedName` com `normalizeName` de `@central-da-manada/shared` na mesma operação do nome canônico.
- [ ] 1.3 Adicionar testes do service para criação, renomeação e compatibilidade do backfill com nomes contendo acentos e espaços repetidos.

## 2. Busca escopada de Igrejas no backend

- [ ] 2.1 Criar o DTO de query opcional `search` e passá-lo, junto com `CurrentUser`, de `GET /churches` e `GET /churches/spiritual-leaders` ao service.
- [ ] 2.2 Fazer `GET /churches` resolver `AccessPolicyService` e combinar por `AND` o escopo, `deletedAt: null` e a busca por `normalizedName` ou `aliases.some.normalizedAlias`.
- [ ] 2.3 Evoluir `GET /churches/spiritual-leaders` para combinar o escopo atual com busca por Igreja/alias, nome do usuário líder vinculado e `spiritualLeaderName` legado.
- [ ] 2.4 Cobrir em `churches.service.spec.ts` busca sem acento, alias sem duplicação, termo vazio, nome de líder e correspondências dentro/fora do escopo.
- [ ] 2.5 Cobrir no controller/DTO que os dois endpoints aceitam `search`, continuam protegidos por `churches.read` e preservam o formato existente sem termo.

## 3. Combobox assíncrono reutilizável

- [ ] 3.1 Evoluir `AsyncCombobox` com ids e relações ARIA de combobox/listbox/option, opção ativa e navegação por `ArrowDown`, `ArrowUp`, `Enter`, `Escape` e `Tab`.
- [ ] 3.2 Adicionar política de limpeza configurável mantendo `Nenhum` como padrão compatível para campos opcionais.
- [ ] 3.3 Separar estados de carregamento, vazio e erro e garantir que somente a requisição mais recente altere opções, erro ou loading.
- [ ] 3.4 Preservar `value`/`selectedLabel` quando o item atual não estiver nos resultados e devolver o foco ao gatilho ao fechar por teclado.
- [ ] 3.5 Criar testes do componente para debounce, respostas fora de ordem, erro versus vazio, valor atual, limpeza configurável e operação completa por teclado.

## 4. Adaptador canônico de Legendários

- [ ] 4.1 Criar em `apps/web/src/features/legendarios` o adaptador/componente que chama `GET /legendarios/options` e centraliza nome, cidade e número LGND em `ComboboxOption`.
- [ ] 4.2 Migrar `features/users/user-form.tsx` para o adaptador canônico, preservando o rótulo do Legendário já vinculado na edição.
- [ ] 4.3 Migrar `app/dashboard/usuarios/convidar/page.tsx` para o mesmo adaptador e remover o mapeamento duplicado.
- [ ] 4.4 Manter e ampliar os testes de `legendarios.service` para busca por nome/número, limite, cláusula de telefone não vazia e interseção obrigatória com `AccessPolicyService`.
- [ ] 4.5 Adicionar testes web que comprovem apresentação idêntica e seleção/limpeza nos fluxos de edição de usuário e convite.

## 5. Busca nas páginas de Igrejas

- [ ] 5.1 Evoluir os clientes web de Igrejas e Líderes Espirituais para serializarem `search` somente quando o termo normalizado não estiver vazio.
- [ ] 5.2 Adicionar à página Igrejas o campo de busca com debounce, barreira anti-race e estados distintos de carregamento inicial, busca, vazio e erro.
- [ ] 5.3 Adicionar a mesma busca à página Líderes Espirituais e recalcular seus cards-resumo a partir do resultado filtrado atual.
- [ ] 5.4 Criar testes das duas páginas com digitação rápida, respostas resolvidas fora de ordem, resultado vazio, falha e preservação da resposta mais recente.

## 6. Inventário e limites da entrega

- [ ] 6.1 Repetir a varredura por seletores, cargas de listagens e UUIDs manuais e atualizar a tabela do `design.md` caso existam pontos ausentes.
- [ ] 6.2 Confirmar que os consumidores fora de usuários/convite e das duas listagens permanecem sem alteração de runtime nesta mudança.
- [ ] 6.3 Registrar cada grupo pendente como candidato a change posterior, preservando a ordem, os paths e os critérios mínimos definidos em `entity-search-inventory`.

## 7. Validação final

- [ ] 7.1 Gerar o Prisma Client e aplicar a migration em banco de desenvolvimento, verificando que Igrejas existentes receberam `normalizedName` válido.
- [ ] 7.2 Executar os testes focados da API e web para Igrejas, Legendários, `AsyncCombobox`, usuário, convite e Líderes Espirituais.
- [ ] 7.3 Executar `pnpm -r lint`, `pnpm -r test` e `pnpm -r build`, documentando qualquer falha preexistente sem ocultá-la.
- [ ] 7.4 Validar manualmente por usuário administrador e usuário escopado os critérios das três specs delta, incluindo teclado, aliases e ausência de vazamento de escopo.
