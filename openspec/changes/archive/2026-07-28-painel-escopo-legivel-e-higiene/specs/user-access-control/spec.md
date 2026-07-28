## ADDED Requirements

### Requirement: Escopo apresentado com rótulo humano
A tela administrativa de Controle de Acessos SHALL apresentar todo valor de escopo por um
**rótulo humano**, nunca por identificador técnico. O backend SHALL preencher o rótulo de
cada valor de escopo que devolve — nome da igreja, nome da equipe, identificação do TOP,
nome da cidade — tanto para os valores **configurados** quanto para os **efetivos**. A UI
NÃO SHALL exibir UUID em nenhuma situação, inclusive durante a edição de uma seleção.

Quando um valor de escopo apontar para uma entidade que não existe mais (excluída ou
soft-deleted), a UI SHALL sinalizar essa condição de forma explícita, em vez de cair no
identificador cru.

#### Scenario: Chips de escopo mostram nome, não UUID
- **WHEN** o admin abre o Controle de Acessos de um usuário com escopo de igreja, equipe e TOP
- **THEN** cada chip mostra o nome da entidade (ex.: "Igreja Batista Central", "Equipe Segurança", "TOP #12 — Rota do Cerrado"), e nenhum UUID aparece na tela

#### Scenario: Desambiguação por subtítulo
- **WHEN** duas igrejas de cidades diferentes têm nomes parecidos
- **THEN** o rótulo exibe a cidade como subtítulo, permitindo distinguir qual está no escopo

#### Scenario: Valor órfão é sinalizado
- **WHEN** um valor de escopo referencia uma entidade que foi excluída
- **THEN** a UI o marca como indisponível/removido, em vez de exibir o identificador cru

### Requirement: Escopo é global por dimensão, não por tela
O escopo de uma dimensão (cidade, equipe, igreja, TOP) SHALL ser **único por usuário**,
compartilhado por todas as telas que usam aquela dimensão. A tela administrativa SHALL
deixar esse alcance explícito antes da edição: alterar uma dimensão a partir do card de uma
tela SHALL indicar quais outras telas concedidas são afetadas pela mesma alteração. A UI
NÃO SHALL sugerir, por layout ou texto, que o escopo é configurável por tela.

#### Scenario: Alcance visível antes de editar
- **WHEN** o admin abre o editor da dimensão Igreja a partir do card "Líderes Espirituais", tendo o usuário também a tela "Igrejas" concedida
- **THEN** o painel informa que a alteração vale para as duas telas

#### Scenario: Alteração se reflete em todos os cards da dimensão
- **WHEN** o admin aplica uma nova seleção de igrejas a partir de um card
- **THEN** todos os cards de telas que usam a dimensão Igreja passam a exibir a mesma seleção

#### Scenario: Dimensão sem outra tela concedida
- **WHEN** apenas uma tela que usa aquela dimensão está concedida
- **THEN** o painel não anuncia telas adicionais afetadas

### Requirement: Modo de escopo configurado distinto do efetivo
A tela administrativa SHALL distinguir o **modo configurado** (o que o admin definiu:
Nenhum / Selecionados / Todos) do **modo efetivo** (o resultado após compor com os vínculos
derivados da função do usuário). O controle de modo SHALL refletir o **configurado**, pois é
o que a ação do admin altera. Os valores derivados da função SHALL ser exibidos à parte,
identificados como tal e **não editáveis**, e NÃO SHALL fazer o controle indicar um modo que
o admin não escolheu.

#### Scenario: Vínculo derivado da função não falseia o modo
- **WHEN** um Líder Espiritual tem igrejas derivadas da função e nenhum escopo de igreja configurado
- **THEN** o controle indica "Nenhum" (o configurado), e as igrejas derivadas aparecem à parte como somente-leitura

#### Scenario: Entrar em edição a partir do configurado
- **WHEN** o admin entra no modo "Selecionados" para essa mesma dimensão
- **THEN** a edição parte dos valores configurados, sem estado sem saída, e é possível concluir a seleção

#### Scenario: Modo configurado é o que se persiste
- **WHEN** o admin aplica "Todos" a uma dimensão
- **THEN** o modo configurado passa a "Todos" e o painel deixa claro que novos cadastros entram automaticamente no escopo

## MODIFIED Requirements

### Requirement: Escopo aplicado por dimensão da tela
O escopo SHALL ser aplicado conforme a **dimensão de cada tela**: telas de dados geográficos (**Legendários, Relatórios, Mapa**) filtram por **cidade** e **igreja**; a tela **Equipes** e o **Organograma** por **equipe**; **TOPs** por **TOP**. Um escopo de um tipo NÃO SHALL vazar para telas de outra dimensão (ex.: escopo de equipe não amplia a listagem de Legendários com membros de outras cidades). Múltiplos escopos do mesmo tipo continuam em união (1-N).

O escopo SHALL valer também para **valores agregados** (contagens, totais, somatórios) exibidos ao usuário, e não apenas para as listagens: um agregado NÃO SHALL revelar o volume de dados fora do escopo de quem o consulta.

#### Scenario: Escopo de equipe não vaza em Legendários
- **WHEN** um usuário tem cidade Caldas Novas e equipe ADM, e abre Legendários
- **THEN** vê apenas legendários de Caldas Novas (o escopo de equipe vale na tela Equipes/Organograma, não em Legendários)

#### Scenario: Relatórios agregados respeitam o escopo
- **WHEN** um usuário restrito abre relatórios por profissão/perícia
- **THEN** as contagens consideram apenas os legendários do seu escopo

#### Scenario: Contagem por igreja no Mapa respeita o escopo
- **WHEN** um usuário restrito abre o Mapa e uma igreja do seu escopo tem legendários fora da fatia dele
- **THEN** a contagem exibida para aquela igreja considera apenas os legendários do seu escopo, não o total real da igreja

#### Scenario: Tradução tela→permissions
- **WHEN** a UI envia "tela=Equipes, nível=Ver e editar"
- **THEN** o backend resolve o conjunto de permissions daquela tela e nível e aplica como concessões efetivas

#### Scenario: UI não envia permissions cruas
- **WHEN** uma requisição da tela administrativa tenta enviar uma permission key arbitrária fora do contrato tela+nível
- **THEN** o backend a ignora/recusa; o contrato é por tela e nível
