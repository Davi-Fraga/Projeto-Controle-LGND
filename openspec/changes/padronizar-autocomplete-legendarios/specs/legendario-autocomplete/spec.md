## MODIFIED Requirements

### Requirement: Busca de Legendários no backend para o campo vinculado
Todo campo que seleciona diretamente um Legendário SHALL obter opções por busca no backend a partir do termo digitado. O frontend NÃO SHALL carregar a lista completa nem uma página fixa de 100/200 Legendários para filtrar ou renderizar opções. O sistema SHALL reutilizar `GET /legendarios/options`, com payload enxuto e no máximo o limite solicitado, padrão 20.

#### Scenario: Digitar filtra no backend
- **WHEN** o usuário digita parte de um nome em qualquer seletor de Legendário
- **THEN** uma requisição com debounce é enviada a `GET /legendarios/options` e a lista exibida vem desse resultado

#### Scenario: Resultado limitado
- **WHEN** o termo corresponde a mais Legendários do que o limite
- **THEN** o backend retorna apenas os primeiros N resultados e o frontend não carrega o restante da base

#### Scenario: Abrir não carrega a base inteira
- **WHEN** o usuário abre o seletor sem termo de busca
- **THEN** o endpoint retorna no máximo o limite padrão, sem uma carga antecipada da listagem de Legendários

### Requirement: Busca tolerante a acento e caixa
A busca SHALL reutilizar a normalização de `Legendary.searchText` e SHALL encontrar por nome ou número LGND independentemente de acentos e caixa aplicáveis ao texto. A busca SHALL ocorrer no `where` do backend antes do limite de resultados.

#### Scenario: Nome indiferente a caixa e acento
- **WHEN** o usuário digita `joao`
- **THEN** Legendários como `João` aparecem nos resultados

#### Scenario: Busca por número LGND
- **WHEN** o usuário digita o número LGND completo ou parcial armazenado em `searchText`
- **THEN** o Legendário correspondente aparece nos resultados mesmo sem o nome no termo

### Requirement: Opção "Nenhum" como padrão
Seletores opcionais SHALL permitir limpar o valor e exibir um rótulo de vazio apropriado, como `Não definido` ou `Nenhum`. Seletores obrigatórios SHALL exigir um Legendário e NÃO SHALL oferecer uma seleção vazia como resultado válido. Ao editar, o seletor SHALL preservar o ID e mostrar o rótulo atual antes de qualquer nova busca.

#### Scenario: Campo opcional sem valor
- **WHEN** um formulário abre com campo opcional sem Legendário
- **THEN** o seletor mostra o rótulo vazio configurado e permite salvar sem vínculo

#### Scenario: Limpar campo opcional
- **WHEN** o usuário limpa um Legendário selecionado em campo opcional
- **THEN** o callback recebe valor vazio e o payload mantém a semântica anterior de não definido

#### Scenario: Campo obrigatório
- **WHEN** o campo de Legendário é obrigatório
- **THEN** o usuário deve selecionar um resultado válido e não pode confirmar uma opção vazia

#### Scenario: Valor atual na edição
- **WHEN** um registro já possui `legendaryId` e relação/rótulo autorizado
- **THEN** o seletor mostra esse nome sem depender de carregar a lista inteira e mantém o ID até troca ou limpeza permitida

### Requirement: Padrão de combobox reaproveitável
O sistema SHALL manter um único `LegendarioCombobox` para a integração de domínio e SHALL reutilizar o `AsyncCombobox` como infraestrutura genérica. Consumidores NÃO SHALL duplicar o fetch, a conversão de metadata ou um seletor local como `PersonSelect`.

#### Scenario: Reuso em qualquer formulário de Legendário
- **WHEN** um formulário precisa selecionar diretamente um `legendaryId`
- **THEN** ele usa `LegendarioCombobox` e não implementa lista, busca ou normalização própria

#### Scenario: Metadata consistente
- **WHEN** resultados são exibidos em consumidores diferentes
- **THEN** todos apresentam nome e, quando disponíveis, número LGND, cidade e igreja segundo o mesmo adaptador

## ADDED Requirements

### Requirement: Sugestões respeitam o escopo de acesso
O endpoint de opções SHALL resolver o escopo do usuário com `AccessPolicyService` e SHALL combinar `buildLegendaryWhere(scope)` com busca, status e limite no backend. Nenhuma sugestão fora do escopo SHALL ser retornada ou inferível pelo autocomplete.

#### Scenario: Usuário restrito busca nome fora do escopo
- **WHEN** um usuário restrito pesquisa um nome que existe apenas fora de suas cidades/igrejas autorizadas
- **THEN** o endpoint retorna zero resultados para esse nome

#### Scenario: Usuário restrito recebe apenas resultados permitidos
- **WHEN** o mesmo termo corresponde a Legendários dentro e fora do escopo
- **THEN** somente os Legendários que satisfazem `buildLegendaryWhere(scope)` são retornados

#### Scenario: Administrador permanece irrestrito
- **WHEN** um administrador consulta as opções
- **THEN** a busca não adiciona restrição geográfica e continua respeitando status e limite

### Requirement: Combobox operável por teclado e acessível
O seletor SHALL implementar semântica de combobox/listbox e SHALL permitir abrir, navegar, selecionar e fechar sem mouse. O estado visual ativo SHALL acompanhar o estado anunciado por ARIA.

#### Scenario: Navegação e seleção por teclado
- **WHEN** o usuário abre o campo e usa ArrowDown ou ArrowUp seguido de Enter
- **THEN** a opção ativa muda, é anunciada e o Legendário escolhido é selecionado

#### Scenario: Fechar com Escape
- **WHEN** o listbox está aberto e o usuário pressiona Escape
- **THEN** o listbox fecha sem alterar o valor e o foco retorna ao controle

#### Scenario: Estado selecionado anunciado
- **WHEN** o listbox exibe o valor atual entre os resultados
- **THEN** a opção correspondente possui `aria-selected` coerente e o combobox referencia listbox/opção ativa

### Requirement: Todos os seletores diretos de Legendário usam o componente único
O sistema SHALL migrar os 20 campos identificados nas 12 superfícies: seis coordenações em `top-form`; dois representantes em `top-families-section`; dois coordenadores em `top-team-form`; Legendário de `top-participant-form`; Legendário de `top-servant-form`; dois coordenadores em `team-form`; Legendário de `team-member-form`; destinatário individual em `communication-form`; vínculo em `user-form`; vínculo no convite de usuário; responsável em `social-action-form`; e participante na tela de detalhe da ação social.

#### Scenario: Formulários de TOP migrados
- **WHEN** TOP, família, equipe do TOP, participante ou servo precisa selecionar Legendário
- **THEN** cada um dos 12 campos desses formulários usa `LegendarioCombobox` sem `PersonSelect` nem listagem antecipada

#### Scenario: Formulários de equipe migrados
- **WHEN** equipe ou membro de equipe precisa selecionar Legendário
- **THEN** os três campos usam `LegendarioCombobox`, preservando opcionalidade e o bloqueio do membro na edição

#### Scenario: Comunicação e usuários migrados
- **WHEN** comunicação individual, edição de usuário ou convite seleciona Legendário
- **THEN** os três campos usam o mesmo componente e nenhum adaptador local duplicado

#### Scenario: Ações sociais não exigem UUID manual
- **WHEN** o usuário escolhe responsável ou adiciona participante de ação social
- **THEN** os dois campos usam busca por nome/número e nenhum placeholder ou input manual de UUID permanece

#### Scenario: Exclusões não são migradas indevidamente
- **WHEN** um seletor escolhe `User`, `TopParticipant`, equipe, TOP, cidade ou escopo, ou apenas filtra uma visualização
- **THEN** ele permanece fora desta migração por não selecionar diretamente um `Legendary`
