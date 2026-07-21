# organogram-structural-changes Specification

## Purpose
TBD - created by archiving change organograma-navegacao-escalavel. Update Purpose after archive.
## Requirements
### Requirement: Drag-and-drop restrito a subdivisões pequenas

Drag-and-drop de pessoas SHALL ser habilitado **apenas** dentro de subdivisões pequenas (grupos de gestão de até 10 pessoas). Na árvore macro (entre escopos/gestores distintos), o rearranjo hierárquico NÃO SHALL usar drag-and-drop livre; SHALL usar ações explícitas com validação e confirmação. O drag-and-drop SHALL ser bloqueado quando o usuário não tiver a permissão correspondente.

#### Scenario: DnD dentro da subdivisão

- **WHEN** um usuário com permissão de reordenar arrasta uma pessoa dentro de uma subdivisão ≤10
- **THEN** a ação é permitida e aplicada com validação

#### Scenario: DnD não disponível na macro

- **WHEN** o usuário tenta arrastar um nó entre ramos distintos da árvore macro
- **THEN** o drag-and-drop não é oferecido ali; a mudança exige a ação explícita de mover/transferir

#### Scenario: DnD bloqueado sem permissão

- **WHEN** um usuário sem permissão de reordenar/mover tenta arrastar
- **THEN** a alça de arraste fica desabilitada e nenhuma movimentação é possível

### Requirement: UX segura de drag-and-drop

O drag-and-drop SHALL usar uma **alça de arraste dedicada** (não o card inteiro), mostrar estado "grabbed", exibir preview do destino antes do drop, destacar zonas válidas e inválidas, aplicar snapping no alvo válido e dar feedback visual durante todo o arraste. SHALL existir **alternativa por menu** equivalente para quem não pode/quer arrastar, com suporte a teclado e touch. O drag-and-drop NÃO SHALL depender exclusivamente do mouse.

#### Scenario: Alça, preview e zonas

- **WHEN** o usuário inicia um arraste pela alça
- **THEN** o card mostra "grabbed", zonas válidas/inválidas são destacadas e o destino é pré-visualizado com snapping antes do drop

#### Scenario: Alternativa por menu e teclado

- **WHEN** o usuário não usa mouse (teclado/touch) ou prefere menu
- **THEN** existe uma ação de menu equivalente para mover/reordenar a pessoa com o mesmo resultado

#### Scenario: Drop inválido não aplica

- **WHEN** o usuário solta sobre uma zona inválida
- **THEN** nenhuma mudança é aplicada e a interface volta ao estado anterior

### Requirement: Ações estruturais explícitas na macro

Mover, transferir para outro grupo, promover, alterar responsável e reorganizar grupo na árvore macro SHALL ser ações explícitas (botão de ação / menu contextual), com validação de destino antes de persistir. Mudanças estruturais críticas SHALL exigir modal de confirmação. A reordenação interna a um grupo SHALL ser diferenciada de mudança hierárquica real (troca de gestor/vínculo).

#### Scenario: Mover com validação e confirmação

- **WHEN** o usuário aciona "mover" na macro e escolhe um destino válido
- **THEN** o sistema valida o destino e, sendo mudança crítica, pede confirmação antes de persistir

#### Scenario: Reordenar não é mudança de vínculo

- **WHEN** o usuário reordena pessoas dentro do mesmo grupo
- **THEN** a operação altera só a ordem, sem trocar o gestor/vínculo hierárquico

### Requirement: Validação de destino, capacidade e integridade

Antes de persistir qualquer movimentação, o backend SHALL validar: que o destino é válido; que o grupo de destino não excede o **teto de 10** (admin isento, conforme `org-hierarchy-limits`); que a operação não cria loop hierárquico; e que a movimentação está dentro do escopo autorizado do usuário. Operações inválidas SHALL ser recusadas com erro tratado, sem deixar vínculos duplicados ou inconsistentes.

#### Scenario: Destino cheio é recusado

- **WHEN** o usuário tenta mover uma pessoa para um grupo que já tem 10
- **THEN** o backend recusa com mensagem clara de capacidade excedida e nada é alterado

#### Scenario: Loop hierárquico é impedido

- **WHEN** uma movimentação tornaria um ancestral subordinado do próprio descendente
- **THEN** o backend recusa a operação

#### Scenario: Movimentação fora do escopo é impedida

- **WHEN** um usuário restrito tenta mover pessoa para/entre um escopo fora do seu acesso
- **THEN** o backend recusa (403), mesmo que a chamada seja feita diretamente na API

### Requirement: Undo e feedback de ações estruturais

Toda ação estrutural SHALL prever undo (desfazer a última alteração) e feedback visual imediato. O undo SHALL restaurar o estado anterior respeitando as mesmas validações (teto, escopo, integridade) e SHALL ser registrado.

#### Scenario: Desfazer última movimentação

- **WHEN** o usuário desfaz a última movimentação estrutural
- **THEN** o vínculo anterior é restaurado e a interface reflete a reversão

#### Scenario: Undo revalida regras

- **WHEN** o estado de destino da reversão mudou e violaria o teto
- **THEN** o undo é recusado com explicação, sem criar inconsistência

### Requirement: Auditoria das mudanças estruturais

O sistema SHALL registrar em auditoria as mudanças estruturais (mover, transferir, promover, alterar responsável), as tentativas de ação sensível negadas e os undos, com autor, alvo, origem, destino e horário.

#### Scenario: Movimentação é auditada

- **WHEN** uma pessoa é movida entre gestores
- **THEN** a auditoria registra autor, pessoa, gestor de origem, gestor de destino e horário

#### Scenario: Tentativa negada é auditada

- **WHEN** um usuário tenta uma ação estrutural sem permissão ou fora do escopo
- **THEN** a tentativa negada é registrada para rastreabilidade
