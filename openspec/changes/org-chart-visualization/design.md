## Context

A hierarquia de um TOP já está modelada no Prisma, espalhada por vários modelos ligados a `TopEvent` via `topEventId`:

- **Coordenação do evento**: `TopEvent.representative` / `deputyRepresentative` / `generalCoordinator` / `familyCoordinator` (+deputy/+general) — todos `Legendary?`.
- **Equipes**: `TopTeam` (liga `Team` ao TOP) com `coordinator` / `deputyCoordinator`; `TopServant` (servos do TOP, opcionalmente com `teamId` e `role`).
- **Famílias**: `TopFamily` (representante = "chefe de família", + deputy) → `TopFamilyMember` (liga `TopParticipant` à família).
- **Pessoas / cidade**: `TopParticipant` (legendários participantes) → `Legendary.city` é a fonte de cidade.

O módulo `apps/api/src/modules/tops` é o exemplo canônico em uso (controller fino com `@UseGuards(JwtAuthGuard, PermissionsGuard)` + `@Permissions('tops.*')`, service com a regra, `PrismaService` isolando o banco, resposta no formato `{ data }`). No front, `apps/web/src/features/tops` consome via `@/lib/api` e há rotas em `apps/web/src/app/dashboard/tops/[id]/`. **Não existe biblioteca de grafo/visualização instalada** (sem react-flow, d3, dagre, cytoscape).

## Goals / Non-Goals

**Goals:**
- Renderizar a hierarquia de um TOP como **árvore top-down** (mind map), somente leitura.
- Interações de **navegação**: zoom, pan, expandir/recolher subárvores.
- **Três visões** por `topEventId`: Equipes, Chefes de Família, Cidades.
- Estética: **cor por líder** e **contador de pessoas no nó** ("bolinha").
- Montar a árvore no **backend** (uma forma normalizada por visão), front só renderiza.

**Non-Goals:**
- Nenhuma edição/arrastar-para-reorganizar, nenhum CRUD a partir do organograma.
- Não altera schema, migrations nem regras de autorização existentes.
- Não exporta imagem/PDF (pode virar follow-up).
- Não cobre TOPs de forma cruzada — sempre um TOP por vez.

## Decisions

### 1. Árvore montada no backend, por visão
Novo endpoint `GET /tops/:id/org-chart?view=teams|families|cities` no `TopsController` (fino) + método no `TopsService`, protegido por `JwtAuthGuard` + `PermissionsGuard` e `@Permissions('tops.read')` (reusa a permissão de leitura de TOP — é leitura de dados do TOP). Retorna `{ data: OrgChartNode }`.
*Por quê:* mantém o conhecimento de relacionamentos e o acesso ao banco no service (regra do projeto: controller não consulta banco), e deixa o front burro/renderizador. *Alternativa rejeitada:* mandar dados crus e montar a árvore no front — duplicaria a lógica de hierarquia e vazaria mais dados que o necessário.

### 2. Contrato normalizado único (`OrgChartNode`)
Tipo compartilhado em `packages/shared`:
```ts
type OrgChartView = 'teams' | 'families' | 'cities';
interface OrgChartNode {
  id: string;            // estável por nó (ex.: `team:<topTeamId>`, `legendary:<id>`, `city:<slug>`)
  kind: 'root' | 'group' | 'leader' | 'person' | 'city';
  label: string;         // nome exibido
  subtitle?: string;     // papel/cargo (ex.: "Coordenador", "Chefe de família")
  leaderId?: string;     // legendaryId que define a COR da subárvore
  count: number;         // total de pessoas sob o nó (descendentes do tipo pessoa)
  children: OrgChartNode[];
}
```
As três visões produzem o **mesmo** shape, então o renderizador é único. *Por quê:* um só componente de árvore atende as 3 visões; trocar de visão = trocar a fonte de dados.

### 3. Mapeamento das três visões
- **teams**: raiz = TOP → coordenação geral (representante/coord. geral) → um nó `group/leader` por `TopTeam` (label = nome da equipe, `leaderId` = coordenador) → `person` por `TopServant` daquela equipe. Servos sem `teamId` caem num grupo "Sem equipe".
- **families**: raiz = TOP → coordenação de famílias (`familyCoordinator`) → um nó por `TopFamily` (label = nome, `leaderId` = representante/chefe) → `person` por `TopFamilyMember` (via `TopParticipant.legendary`).
- **cities**: raiz = TOP → um nó `city` por cidade distinta dos `TopParticipant` (de `Legendary.city`, normalizada) → `person` por participante. Participantes sem cidade caem em "Sem cidade".

### 4. `count` = descendentes-pessoa; cor derivada de `leaderId`
`count` é calculado no backend (soma de descendentes `kind: 'person'`), exibido na "bolinha" do nó. A **cor** é determinística a partir de `leaderId` (hash → paleta fixa), para que a mesma liderança tenha sempre a mesma cor e subárvores herdem a cor do líder. *Por quê:* contador no servidor evita recomputo no front; cor estável melhora leitura entre sessões.

### 5. Renderização no front: React Flow + layout d3-hierarchy (recomendado)
Adicionar **`@xyflow/react`** (React Flow) para o canvas com zoom/pan/recolher "de fábrica", e **`d3-hierarchy`** para calcular o layout top-down (coordenadas dos nós) a partir do `OrgChartNode`. Nó customizado renderiza label + subtitle + bolinha de contador, colorido por `leaderId`. Expandir/recolher = estado local (set de ids colapsados) que filtra os nós antes do layout.
*Alternativas consideradas:*
- **SVG custom + d3-hierarchy + d3-zoom**: mais leve (sem dep de canvas), controle total da estética mind-map, porém reimplementa pan/zoom/hit-testing. Boa opção se quisermos zero libs pesadas.
- **dagre** no lugar de d3-hierarchy: ok, mas d3-hierarchy é mais simples para árvore estrita top-down.
Recomendo React Flow por entregar as interações pedidas com menos código; se o time preferir não adicionar dependência de peso, cair para SVG custom é viável sem mudar o contrato do backend.

### 6. Local da UI
Nova rota `apps/web/src/app/dashboard/tops/[id]/organograma/page.tsx` + feature `apps/web/src/features/org-chart/` (componente de árvore, seletor de visão, `api.ts`). Um link "Organograma" na tela de detalhe do TOP. *Por quê:* segue o padrão de subrotas já usado em `tops/[id]/pre-inscricoes`.

## Risks / Trade-offs

- **TOP grande (muitos participantes)** → árvore com centenas de nós trava o render. **Mitigação:** começar com subárvores recolhidas além do 2º nível; contador no nó dá noção de tamanho sem expandir; paginação/virtualização fica como follow-up.
- **Nova dependência de front (React Flow + d3-hierarchy)** → peso de bundle e manutenção. **Mitigação:** decisão explícita acima; alternativa SVG custom mantém o mesmo contrato de backend, então trocar a lib não afeta a API.
- **Dados incompletos** (servo sem equipe, participante sem cidade, família sem chefe) → nós órfãos. **Mitigação:** grupos "Sem equipe"/"Sem cidade" e líder ausente renderizado como nó neutro (cinza), tornando o buraco visível em vez de quebrar.
- **Cidade não normalizada** → "Goiânia" vs "goiania" viram cidades diferentes na visão Cidades. **Mitigação:** normalizar a chave de cidade no backend (reusar a abordagem de normalização já adotada na importação de legendários, se aplicável).
- **Escopo de acesso** → a visão expõe a estrutura inteira do TOP. **Mitigação:** reusa `tops.read` (mesma porta de quem já vê o detalhe do TOP); não introduz novo nível de exposição.

## Open Questions

- Adotar **React Flow + d3-hierarchy** (recomendado) ou **SVG custom**? (Não muda o contrato do backend.)
- O `count` deve contar **todos os descendentes-pessoa** (proposto) ou apenas filhos diretos?
- A visão **Cidades** agrupa por cidade do `Legendary` de **todos os `TopParticipant`**, ou só de um subconjunto (ex.: servos)? (Proposto: todos os participantes.)
- O organograma é uma **subrota dedicada** (`/organograma`, proposto) ou uma **aba** dentro da tela de detalhe do TOP?
