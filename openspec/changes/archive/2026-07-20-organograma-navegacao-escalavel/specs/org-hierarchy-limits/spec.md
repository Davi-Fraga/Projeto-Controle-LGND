## ADDED Requirements

### Requirement: Redistribuição manual tem interface no Organograma

A redistribuição manual entre gestores — já suportada no backend (`Redistribuição manual entre gestores`) — SHALL ganhar interface no Organograma: drag-and-drop dentro de subdivisões ≤10 e ação explícita (mover/transferir) na macro. A interface NÃO SHALL contornar as regras existentes: o backend continua sendo a barreira do teto de 10 e da consistência dos vínculos, revalidando toda operação vinda da UI.

#### Scenario: Mover pela UI respeita o teto

- **WHEN** o admin move um Legendário para um Líder pela interface do Organograma
- **THEN** a operação passa pela mesma validação de teto/consistência do backend, e é recusada se violar o teto

#### Scenario: UI não é a barreira

- **WHEN** uma redistribuição é solicitada diretamente na API sem passar pela UI
- **THEN** as mesmas regras de teto, escopo e consistência são aplicadas

### Requirement: Auditoria e undo da redistribuição

As redistribuições feitas pela interface do Organograma SHALL ser auditadas e SHALL suportar undo da última alteração, sem alterar as regras de teto e consistência já definidas.

#### Scenario: Redistribuição auditada

- **WHEN** uma pessoa é redistribuída entre gestores pela interface
- **THEN** a mudança é registrada em auditoria (autor, origem, destino, horário)

#### Scenario: Undo respeita o teto

- **WHEN** o admin desfaz a última redistribuição
- **THEN** o vínculo anterior é restaurado apenas se não violar o teto de 10, e a reversão é registrada
