## 1. Investigação (obrigatória, antes de corrigir)

- [ ] 1.1 Reproduzir o bug com os 226 reais e registrar o comportamento observado
- [ ] 1.2 Conferir na aba Network se o termo digitado é enviado à API
- [ ] 1.3 Conferir se o backend recebe o parâmetro e o aplica no `where` do Prisma
- [ ] 1.4 Confirmar se a busca é sobre o banco inteiro ou apenas sobre a página carregada
- [ ] 1.5 Testar caixa e acentos (incluindo `joao` → `João`) e conferir debounce/estado do campo
- [ ] 1.6 Registrar a causa raiz e decidir a estratégia de busca sem acento; apresentar plano antes de aplicar

## 2. Correção no backend

- [ ] 2.1 Garantir que o DTO/query da listagem aceite o termo de busca
- [ ] 2.2 Aplicar o termo no `where` do Prisma antes de paginação e ordenação, sobre o conjunto completo
- [ ] 2.3 Aplicar a estratégia aprovada de case-insensitive (e acento, se aprovado); se exigir `unaccent`/índice, criar migration nova
- [ ] 2.4 Garantir que busca coexista com paginação, ordenação e demais filtros

## 3. Correção no frontend

- [ ] 3.1 Enviar o termo à API na requisição de listagem (sem filtro local sobre a página)
- [ ] 3.2 Implementar/ajustar debounce no campo
- [ ] 3.3 Prevenir race: descartar respostas obsoletas (abort/sequência) ao alterar/limpar o termo
- [ ] 3.4 Refletir estados de loading, resultado e vazio

## 4. Testes

- [ ] 4.1 Backend: termo aplicado no `where` antes de paginar; busca no conjunto completo; case-insensitive; acento conforme estratégia
- [ ] 4.2 Backend: busca coexiste com paginação e demais filtros
- [ ] 4.3 Frontend: alterar/limpar termo dispara consulta correta; resposta obsoleta não sobrescreve resultado atual

## 5. Verificação

- [ ] 5.1 Rodar testes focados (Legendários)
- [ ] 5.2 Rodar `pnpm -r lint`, `pnpm -r test` e `pnpm -r build` e reportar comandos/resultados exatos
- [ ] 5.3 Conferência manual: buscar `joao` retorna `João`; buscar termo de pessoa fora da página atual a encontra; limpar campo restaura a lista
