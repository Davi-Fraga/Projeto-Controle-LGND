# Inventário — ações visuais, permissions e seletores

> Artefato da §1 da change `acoes-web-e-seletores-contextuais`. Produzido em 31/07/2026.
> **Requer aval do Davi antes de qualquer código** (§1 do design: o inventário pode eliminar
> ou renomear endpoints propostos, mas não pode mudar o princípio).

## 1. Superfície autoritativa da API

Extraída dos controllers. **É a fonte da verdade** para o mapa permission→controle: uma ação
visual só pode ser condicionada à permission que o seu endpoint realmente exige.

| domínio | permissions |
|---|---|
| churches | `churches.{create,read,update,delete}` · `spiritual-leaders.read` |
| communications | `communications.{create,read,update,delete,send}` · `communications.recipients.{read,update}` |
| dashboard | `dashboard.read` |
| expertises | `expertises.{create,read,update}` |
| invites | `users.create` |
| legendarios | `legendarios.{create,read,delete,restore}` · `legendarios.history.{create,read}` |
| management | `organogram.group.reorder` |
| map | `map.read` |
| org-chart | `legendarios.read` · `teams.read` · `tops.read` |
| preregistrations | `tops.preregistrations.{read,approve,reject,delete}` |
| professions | `professions.{create,read,update}` |
| reports | `reports.{read,export}` |
| social-actions | `social-actions.{create,read,update,delete}` · `social-actions.participants.{read,add,update,remove}` |
| teams | `teams.{create,read,update,delete,restore}` · `teams.members.{read,add,update,remove}` |
| tops | `tops.{create,read,update,delete,restore}` · `tops.families.*` · `tops.participants.*` · `tops.servants.*` · `tops.teams.*` |

### 1.1 ⚠️ Existem DOIS decorators, e o segundo tem semântica OR

O inventário quase saiu errado por isso. Além de `@Permissions` (AND), há **`@AnyPermissions`**
(OR), usado em duas rotas de Legendários:

| rota | decorator | efeito |
|---|---|---|
| `GET /legendarios/:id` | `@AnyPermissions('legendarios.read', 'teams.members.read')` | quem coordena equipe abre o perfil sem ter a tela de Legendários |
| `PATCH /legendarios/:id` | `@AnyPermissions('legendarios.update', 'organogram.person.edit')` | quem edita pelo Organograma edita o perfil |

**Consequência para a change:** condicionar o botão "Editar" de Legendários a `legendarios.update`
sozinho **esconderia a ação de quem legitimamente pode executá-la** via `organogram.person.edit`.
Toda regra visual dessas duas rotas precisa ser `anyOf`, não uma permission única.

### 1.2 ⚠️ `legendarios.update` não é declarada por nenhum `@Permissions`

Ela só aparece dentro do `@AnyPermissions` acima. Ao montar o mapa, não presumir que existe uma
rota "canônica" de update guardada por ela isoladamente.

## 2. A primitiva atual não atende ao contrato

`apps/web/src/lib/permissions.ts`:

```ts
export function hasPermission(user, ...permissions) {
  return permissions.some((p) => user?.permissions?.includes(p));  // OR
}
```

- Semântica é **OR** (`some`). A spec pede `allOf` **e** `anyOf` — **o AND não existe**.
- Usada **32 vezes em 12 páginas**, ad hoc, sem composição.
- Casa por acidente com `@AnyPermissions`, mas é a ferramenta errada para tudo que é `@Permissions`
  com mais de uma exigência.

**Ação (§2.1):** criar `useCan` com `allOf`/`anyOf` explícitos e migrar os 32 pontos, em vez de
adicionar um segundo helper e conviver com dois jeitos.

## 3. `ActionMenu` renderiza menu vazio

`apps/web/src/components/ui/ActionMenu.tsx:79` mapeia `items` direto, **sem guarda de lista
vazia**. Com as ações filtradas por permission, um usuário sem nenhuma ação disponível verá um
botão ⋮ que abre um menu sem nada.

**Ação (§2.3):** retornar `null` quando `items.length === 0`. Correção no componente cobre todos
os consumidores de uma vez — melhor que filtrar em cada página.

## 4. Páginas na superfície do inventário

32 `page.tsx` em `apps/web/src/app/dashboard`. Os 12 arquivos que já usam `hasPermission` são o
baseline do que está parcialmente certo:

`acoes-sociais` · `comunicacao` · `equipes` · `equipes/[id]` · `igrejas` · `legendarios` ·
`legendarios/[id]` · `lideres-espirituais` · `organograma` · `dashboard` · `tops` · `tops/[id]`

Sem nenhuma checagem hoje: `mapa`, `relatorios`, `usuarios`, `tops/[id]/pre-inscricoes`,
`acoes-sociais/[id]`, `comunicacao/[id]`, e todas as rotas `nova|novo|editar`.

## 5. Ações por tela (§1.1/§1.2)

### 5.1 Listas — o botão "criar" é gated, o `ActionMenu` NÃO

Padrão idêntico em Legendários, Equipes, Igrejas, TOPs, Ações Sociais e Comunicação: o botão de
criação checa `<dominio>.create`, mas os itens do menu são um **array literal plano, sem filtro
nenhum**. Exemplo em `legendarios/page.tsx:333-335`.

| tela | criar (hoje) | itens do menu (hoje: sem gate) | permission correta |
|---|---|---|---|
| Legendários | ✅ `legendarios.create` | Ver · Editar · Inativar | `legendarios.read` · **anyOf(`legendarios.update`, `organogram.person.edit`)** · `legendarios.delete` |
| Equipes | ✅ `teams.create` | Ver · Editar · Inativar | `teams.read` · `teams.update` · `teams.delete` |
| Igrejas | ✅ `churches.create` | Ver · Editar · Excluir | `churches.read` · `churches.update` · `churches.delete` |
| TOPs | ✅ `tops.create` | Ver · Editar · Inativar | `tops.read` · `tops.update` · `tops.delete` |
| Ações Sociais | ✅ `social-actions.create` | Ver · Editar · Excluir | `social-actions.read` · `social-actions.update` · `social-actions.delete` |
| Comunicação | ✅ `communications.create` | Ver · Excluir | `communications.read` · `communications.delete` |

### 5.2 Detalhes — dois já corretos, três sem nada

**Referência a generalizar** (o design já apontava): `equipes/[id]` e `tops/[id]` condicionam
cada ação à permission granular (`teams.members.{add,update,remove}`,
`tops.families.{create,update,delete}`, `tops.families.members.{add,remove,transfer}`).

⚠️ **Bug encontrado:** `equipes/[id]/page.tsx` usa `hasPermission(user, 'legendarios.update')`
sozinho. A rota é `@AnyPermissions('legendarios.update', 'organogram.person.edit')` — o gate está
**mais restrito que a API** e esconde a ação de quem pode executá-la pelo Organograma.

**Sem nenhuma checagem** (`hasPermission` = 0 ocorrências):

| tela | ações expostas | permission correta |
|---|---|---|
| `acoes-sociais/[id]` | `addParticipant`, `finish`, `cancel` | `social-actions.participants.add` · `social-actions.update` |
| `comunicacao/[id]` | `save` (+ envio) | `communications.update` · `communications.send` |
| `tops/[id]/pre-inscricoes` | aprovar / rejeitar / excluir | `tops.preregistrations.{approve,reject,delete}` |
| `relatorios` | `exportActive` | `reports.export` |

**Usuários** fica fora: é exceção administrativa `COORDINATION_ADMIN`, e o gate de papel na rota
já cobre o menu inteiro (ver capability `permission-driven-navigation`).

## 6. Seletores (§1.3-1.5)

`LegendarioCombobox` → `GET /legendarios/options` (exige `legendarios.read`) é consumido por
**13 arquivos**. Cada um pertence a uma operação com permission própria: é exatamente aqui que
nasce o 403 em ação autorizada.

`ParticipantCombobox` → `GET /tops/:id/participants/options` tem **um único consumidor**
(`top-families-section.tsx`) e já está correto: escopo autoritativo pelo `TopScopeGuard`,
permission `tops.participants.read`, projeção enxuta. **Não mexer** (§1.5 fechada).

### Classificação, aplicando a decisão aprovada (A onde expõe pessoas, B onde é mínimo/escopado)

**A — endpoint contextual novo** (busca pessoas para vincular; projeção mínima; sem abrir perfil):

| formulário | operação | endpoint proposto |
|---|---|---|
| `team-member-form` | `teams.members.add` | `GET /teams/:teamId/member-candidates/options` |
| `top-participant-form` | `tops.participants.add` | `GET /tops/:topId/participant-candidates/options` |
| `top-servant-form` | `tops.servants.add` | `GET /tops/:topId/servant-candidates/options` |
| `social-action-form` · `acoes-sociais/[id]` | `social-actions.participants.add` | `GET /social-actions/:id/participant-candidates/options` |

**B — `@AnyPermissions` no endpoint existente** (o campo escolhe um dirigente já dentro de um
recurso que o usuário administra; o contrato de options já é mínimo):

| formulário | campo | tratamento |
|---|---|---|
| `top-form` | representante / vice do TOP | `anyOf('legendarios.read', 'tops.create', 'tops.update')` |
| `team-form` | coordenador / vice da Equipe | `anyOf('legendarios.read', 'teams.create', 'teams.update')` |
| `top-team-form` | coordenador da equipe no TOP | `anyOf('legendarios.read', 'tops.teams.add', 'tops.teams.update')` |
| `top-families-section` | representante / vice da Família | `anyOf('legendarios.read', 'tops.families.create', 'tops.families.update')` |

**C — preservar, não é `Legendary`:**

| formulário | achado |
|---|---|
| `church-form` | ⚠️ tem **os dois** campos: `spiritualLeaderUserId` (User) **e** `spiritualLeaderLegendaryId` (Legendary). **Resolve a open question do design** — não são o mesmo seletor e não podem ser unificados. |
| `user-form` · `usuarios/convidar` | vinculam um `Legendary` a um `User`, em tela admin-only. Sem mudança. |
| `communication-form` | destinatários — checar se cai em `communications.recipients.update` antes de decidir. |

**Placar:** dos 6 endpoints propostos no design, **4 sobrevivem**. Os de Equipes candidatas em TOP
e de líder de Igreja saem: o primeiro vira caso B, o segundo é o caso C acima.

## 7. Ordem de implementação sugerida

1. **§2** — `useCan` com `allOf`/`anyOf` + guarda de menu vazio no `ActionMenu`, migrando os 32
   pontos existentes. Sem isso, todo o resto vira condicional ad hoc.
2. **§4.9 + telas sem gate nenhum** — `acoes-sociais/[id]`, `comunicacao/[id]`,
   `tops/[id]/pre-inscricoes`, `relatorios`. Maior risco por menor esforço.
3. **Corrigir o gate estrito** de `equipes/[id]` (`legendarios.update` → `anyOf`).
4. **§4.1-4.8** — itens de `ActionMenu` das 6 listas.
5. **§3 (A)** — os 4 endpoints contextuais, cada um com teste de 403/404/elegibilidade/projeção.
6. **§3 (B)** — `@AnyPermissions` nos 4 formulários de dirigente.
7. **§5-§6** — ligar formulários e verificação integrada.
