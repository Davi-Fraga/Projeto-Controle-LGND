## 1. Inspeção

- [ ] 1.1 Localizar o campo **Legendário vinculado** no formulário de usuário (web)
- [ ] 1.2 Verificar o endpoint de listagem de Legendários: permite projetar campos e limitar resultados, ou é preciso endpoint dedicado a opções?
- [ ] 1.3 Alinhar a estratégia de busca sem acento com `corrigir-busca-legendarios` (evitar implementação divergente)
- [ ] 1.4 Apresentar os diffs propostos e aguardar aprovação antes de aplicar

## 2. Backend — busca leve de opções

- [ ] 2.1 Expor/ajustar endpoint de busca de Legendários retornando enxuto (id, nome, cidade, número) por termo
- [ ] 2.2 Aplicar busca case/acento-insensível (estratégia compartilhada) e limite de resultados
- [ ] 2.3 Testes: termo filtra no backend; `joao` encontra `João`; resultado respeita o limite; payload contém os campos de desambiguação

## 3. Frontend — combobox

- [ ] 3.1 Substituir o select por um autocomplete/combobox com busca no backend e debounce
- [ ] 3.2 Renderizar cada item com nome, cidade e número (quando disponível)
- [ ] 3.3 Manter a opção "Nenhum" como valor padrão
- [ ] 3.4 Estados de loading e vazio; não travar com muitos registros
- [ ] 3.5 Estruturar o componente como reaproveitável (fonte de busca e render do item parametrizáveis)

## 4. Padrão reaproveitável

- [ ] 4.1 Registrar/documentar o padrão de combobox com busca no backend para outros dropdowns de lista cheia
- [ ] 4.2 Garantir que a fonte de dados seja injetável sem reescrever o componente

## 5. Verificação

- [ ] 5.1 Rodar testes focados (Legendários / formulário de usuário)
- [ ] 5.2 Rodar `pnpm -r lint`, `pnpm -r test` e `pnpm -r build` e reportar comandos/resultados exatos
- [ ] 5.3 Conferência manual com os 226: digitar parte do nome filtra; itens mostram cidade/número; "Nenhum" disponível; tela não trava
