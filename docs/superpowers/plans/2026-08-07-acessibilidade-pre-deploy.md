# Acessibilidade pré-deploy — Plano de Implementação

> **Para quem executar:** siga fase a fase. Cada fase termina em entregável testável e commit próprio.
> Steps usam checkbox (`- [ ]`) para acompanhamento.

**Objetivo:** fechar os achados de acessibilidade levantados no QA das tasks 6.2 e 6.3 que ficaram
fora das 40 tasks da change, para que o deploy suba com o sistema limpo.

**Arquitetura:** todas as correções são no `apps/web`. Nenhuma toca API, banco, contrato ou
`packages/shared`. Duas são em componentes compartilhados (`ConfirmDialog`, `AsyncCombobox`) e se
propagam sozinhas para todas as telas; as outras são pontuais nos call sites.

**Stack:** Next.js App Router · React 19 · Tailwind 3.4 · Vitest + Testing Library.

## Restrições globais

- Verificação obrigatória antes de declarar qualquer fase pronta:
  `cd apps/web && npx vitest run --maxWorkers=1` — **o paralelo é instável nesta máquina** e os
  arquivos que falham mudam a cada rodada.
- `pnpm lint` **da raiz** (é o único que cobre `prisma/`; `pnpm -r lint` não substitui).
- Cores: usar os tokens do `tailwind.config.ts` — `surface`/`surface-raised`/`surface-hover`,
  `content`/`content-strong`/`content-muted`, `line`/`line-strong`, `accent`, `focus`,
  `feedback-{success,warning,danger,info}`. **Exceção seguida do vizinho:** o scrim de fundo
  continua `bg-black/NN`, como já faz o backdrop da `Sidebar` — scrim não é superfície da paleta.
- Nenhuma migration, nenhuma mudança de contrato. Se alguma fase exigir isso, **pare e pergunte**.
- Git: nada de commit/push/PR sem o Davi pedir explicitamente na interação.
- **Armadilha do DOM duplicado:** o `DataTable` renderiza tabela + cartões. No navegador só uma
  aparece; no JSDOM as duas coexistem. Em teste de tela migrada, escope as consultas com
  `within(screen.getByTestId('datatable-desktop'))`.
- **Hooks antes do early return:** vários componentes aqui têm `if (!isOpen) return null`. Ao
  adicionar hooks, eles vêm **antes** do return, senão a ordem de chamada muda entre renders.

---

## Fase 0 — Subir o que já está pronto

Não há código novo. São os 4 arquivos já implementados e verificados nesta sessão (224/224, lint
verde), hoje soltos na branch `feat/design-system-densidade-a11y` — que **já foi mesclada** pelo
#57 e portanto está contida no `main`.

**Arquivos:** `ActionMenu.tsx` · `ActionMenu.test.tsx` · `styles/globals.css` ·
`openspec/changes/refinar-design-system-e-acessibilidade-visual/tasks.md`

- [ ] **Passo 1:** branch nova a partir do `main` atualizado

```bash
git fetch origin
git checkout -b fix/actionmenu-teclado-e-cascata-input origin/main
```

- [ ] **Passo 2:** commit e PR (fecha as tasks 6.1, 6.2, 6.3 e 7.8)
- [ ] **Passo 3:** mesclar. A partir daqui o `main` é a base da Fase 1.

---

## Fase 1 — `ConfirmDialog`: semântica de diálogo e gestão de foco

**O que está errado hoje:** o componente é um `<div>` sem `role`. Medido no navegador — sem
`role`/`aria-modal`/`aria-labelledby`, o foco nunca entra (fica no cabeçalho da página), Escape não
fecha, e 6 Tabs seguidos vazam para a navegação lateral. O botão X não tem nome acessível.

**Por que importa:** é o modal que confirma **excluir e inativar** em 13 telas. Um usuário de
teclado ou leitor de tela não percebe que ele abriu, não alcança os botões e não consegue sair.

**Como corrigir:** `role="alertdialog"` + `aria-modal` + `aria-labelledby`/`aria-describedby`;
foco vai para "Cancelar" ao abrir (opção não destrutiva) e volta ao elemento de origem ao fechar;
contenção de foco circular no Tab/Shift+Tab; Escape chama `onCancel`; `aria-label` no X.

**Arquivos:**
- Modificar: `apps/web/src/components/ui/ConfirmDialog.tsx`
- Criar: `apps/web/src/components/ui/ConfirmDialog.test.tsx`

**Interfaces:** a assinatura pública (`ConfirmDialogProps`) **não muda** — nenhum dos 13 call sites
precisa ser tocado.

- [ ] **Passo 1: escrever os testes que falham**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

function montar(overrides = {}) {
  const props = {
    isOpen: true,
    title: 'Inativar Legendário',
    description: 'Tem certeza que deseja inativar este Legendário?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
  render(<ConfirmDialog {...props} />);
  return props;
}

describe('ConfirmDialog', () => {
  it('se anuncia como diálogo modal rotulado pelo título e descrito pelo texto', () => {
    montar();
    const dialogo = screen.getByRole('alertdialog');

    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(dialogo).toHaveAccessibleName('Inativar Legendário');
    expect(dialogo).toHaveAccessibleDescription(
      'Tem certeza que deseja inativar este Legendário?',
    );
  });

  it('leva o foco para Cancelar ao abrir — a opção não destrutiva', () => {
    montar();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
  });

  it('Escape cancela', () => {
    const { onCancel } = montar();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('o botão de fechar tem nome acessível', () => {
    montar();
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument();
  });

  it('Tab circula dentro do diálogo em vez de vazar para a página', () => {
    montar();
    const focaveis = screen.getAllByRole('button');
    const ultimo = focaveis[focaveis.length - 1];

    ultimo.focus();
    fireEvent.keyDown(document, { key: 'Tab' });

    expect(focaveis[0]).toHaveFocus();
  });

  it('Shift+Tab circula para trás', () => {
    montar();
    const focaveis = screen.getAllByRole('button');

    focaveis[0].focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });

    expect(focaveis[focaveis.length - 1]).toHaveFocus();
  });

  it('devolve o foco ao elemento de origem ao fechar', () => {
    const origem = document.createElement('button');
    origem.textContent = 'Abrir';
    document.body.appendChild(origem);
    origem.focus();

    const { rerender } = render(
      <ConfirmDialog
        isOpen
        title="T"
        description="D"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    rerender(
      <ConfirmDialog
        isOpen={false}
        title="T"
        description="D"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(origem).toHaveFocus();
    origem.remove();
  });

  it('não renderiza nada quando fechado', () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={false}
        title="T"
        description="D"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Passo 2: rodar e confirmar que falham**

```
cd apps/web && npx vitest run --maxWorkers=1 src/components/ui/ConfirmDialog.test.tsx
```

Esperado: falha em todos menos o último. O primeiro deve falhar com "Unable to find role
`alertdialog`".

- [ ] **Passo 3: implementar**

Substituir o topo de `ConfirmDialog.tsx`. **Os hooks vêm antes do `if (!isOpen) return null`.**

```tsx
'use client';

import { ReactNode, useEffect, useId, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

// ...ConfirmDialogProps inalterada...

export function ConfirmDialog({
  isOpen, title, description,
  confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  onConfirm, onCancel, variant = 'danger',
}: ConfirmDialogProps) {
  const tituloId = useId();
  const descricaoId = useId();
  const painelRef = useRef<HTMLDivElement>(null);
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const origemDoFocoRef = useRef<HTMLElement | null>(null);

  // Guarda de onde o foco veio e leva para a opção não destrutiva. Na volta, devolve.
  useEffect(() => {
    if (!isOpen) return;
    origemDoFocoRef.current = document.activeElement as HTMLElement | null;
    cancelarRef.current?.focus();
    return () => origemDoFocoRef.current?.focus();
  }, [isOpen]);

  // Escape e contenção de foco. No documento, não no painel: a abertura pode acontecer
  // com o foco ainda fora do diálogo.
  useEffect(() => {
    if (!isOpen) return;
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        onCancel();
        return;
      }
      if (evento.key !== 'Tab') return;
      const focaveis = painelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focaveis || focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;
```

No JSX, o painel e o botão de fechar:

```tsx
      <div
        ref={painelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descricaoId}
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-line bg-surface p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Fechar"
          className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-md text-content-muted hover:bg-surface-hover hover:text-content-strong"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
```

E o título/descrição recebem os ids:

```tsx
            <h3 id={tituloId} className="text-base font-bold tracking-wide text-content-strong uppercase">{title}</h3>
            <p id={descricaoId} className="mt-2 text-sm text-content-muted leading-relaxed font-medium">{description}</p>
```

- [ ] **Passo 4: rodar e confirmar que passam** (mesmo comando do Passo 2)
- [ ] **Passo 5: rodar a suíte inteira** — 13 telas usam este componente e várias têm teste próprio;
      o foco automático em "Cancelar" pode quebrar teste que assumia foco em outro lugar.

```
cd apps/web && npx vitest run --maxWorkers=1
```

- [ ] **Passo 6: commit**

---

## Fase 2 — `ConfirmDialog`: cores cruas para tokens

**O que está errado hoje:** 19 valores crus (`bg-zinc-900`, `text-rose-400`, `border-zinc-800`,
`bg-[#0E0E10]`...). O componente **não foi migrado** na change e **não está** na tabela de exceções
justificadas da task 6.6 — ou seja, a tabela está incompleta e afirma mais do que entrega.

**Como corrigir:** trocar pelos tokens. A Fase 1 já migra o painel, o X, o título e a descrição;
aqui sobram o scrim, o ícone e os três `colorVariants`.

**Arquivos:** modificar `apps/web/src/components/ui/ConfirmDialog.tsx`

- [ ] **Passo 1: migrar `colorVariants`**

```tsx
  const colorVariants = {
    danger: {
      btn: 'bg-feedback-danger hover:brightness-110 text-white focus-visible:ring-2 focus-visible:ring-focus',
      icon: 'bg-feedback-danger/10 text-feedback-danger border-feedback-danger/20',
    },
    warning: {
      btn: 'bg-feedback-warning hover:brightness-110 text-canvas focus-visible:ring-2 focus-visible:ring-focus',
      icon: 'bg-feedback-warning/10 text-feedback-warning border-feedback-warning/20',
    },
    info: {
      btn: 'bg-surface-hover hover:bg-surface-raised text-content-strong focus-visible:ring-2 focus-visible:ring-focus',
      icon: 'bg-feedback-info/10 text-feedback-info border-feedback-info/20',
    },
  };
```

- [ ] **Passo 2: scrim e botão Cancelar**

O scrim segue `bg-black/75` **de propósito** — mesmo padrão do backdrop da `Sidebar`. Cancelar:

```tsx
          <button
            ref={cancelarRef}
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-line bg-transparent px-4 py-2.5 text-xs font-bold tracking-wide text-content-muted uppercase transition-all hover:bg-surface-hover hover:text-content-strong"
          >
```

- [ ] **Passo 3: provar que não sobrou cor crua**

```bash
grep -nE "(bg|text|border|ring)-(zinc|rose|orange|slate|gray)-[0-9]|#[0-9A-Fa-f]{6}" \
  apps/web/src/components/ui/ConfirmDialog.tsx
```

Esperado: **sem saída** (o `bg-black/75` do scrim não casa com o padrão, é intencional).

- [ ] **Passo 4: conferir no navegador** — abrir um modal de inativar em desktop e mobile e comparar
      contraste e legibilidade com as capturas de antes.
- [ ] **Passo 5: rodar suíte + lint. Commit.**
- [ ] **Passo 6: atualizar a tabela de exceções da task 6.6** no `tasks.md`, registrando que o
      `ConfirmDialog` foi migrado e deixou de ser lacuna.

---

## Fase 3 — Nome acessível e alvo do "Sair" no mobile

**O que está errado hoje:** em `AppHeader.tsx` o botão tem `title="Sair do sistema"` e o texto
"Sair" em `hidden sm:inline`. Abaixo de 640px o texto some e o nome acessível passa a depender só
do `title` — fallback fraco e inútil no toque. Medido: **42x36**, abaixo dos 44 exigidos.
É o mesmo defeito que a task 6.4 corrigiu no `ActionMenu`.

**Arquivos:**
- Modificar: `apps/web/src/components/layout/AppHeader.tsx:72-75`
- Modificar: `apps/web/src/components/layout/AppHeader.test.tsx:29`

- [ ] **Passo 1: ajustar o teste existente** (hoje ele afirma o `title`, que é justamente o problema)

```tsx
  it('o botão de sair tem nome acessível próprio, não só title', () => {
    // ...render como já está no arquivo...
    const sair = screen.getByRole('button', { name: 'Sair do sistema' });
    expect(sair).toHaveAttribute('aria-label', 'Sair do sistema');
  });
```

- [ ] **Passo 2: rodar e confirmar que falha**

```
cd apps/web && npx vitest run --maxWorkers=1 src/components/layout/AppHeader.test.tsx
```

- [ ] **Passo 3: implementar** — `aria-label` explícito e alvo mínimo de 44px

```tsx
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Sair do sistema"
          title="Sair do sistema"
          className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 ..."
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Sair</span>
        </button>
```

- [ ] **Passo 4: rodar e confirmar que passa**
- [ ] **Passo 5: medir no navegador em 390x844** — esperado `44x44` ou mais. Commit.

---

## Fase 4 — Contexto de linha no gatilho de ações

**O que está errado hoje:** os 8 call sites do `ActionMenu` não passam `label`, então todos caem no
default. Medido na lista de Legendários: **20 botões com o nome idêntico "Ações"**. Quem navega por
lista de botões num leitor de tela ouve "Ações" vinte vezes, sem saber de qual registro.

**Como corrigir:** o componente já aceita `label` — basta passá-lo em cada call site com o nome do
registro. Zero mudança no componente.

**Arquivos (modificar):** `legendarios/page.tsx:378` · `igrejas/page.tsx:249` ·
`equipes/page.tsx:179` · `tops/page.tsx:215` · `acoes-sociais/page.tsx:181` ·
`comunicacao/page.tsx:185` · `usuarios/page.tsx:175` · `features/tops/top-families-section.tsx:252`

- [ ] **Passo 1: teste na tela de Legendários** (é a que tem o teste mais completo)

```tsx
  it('cada gatilho de ações identifica o registro da linha', async () => {
    // ...montar a lista como os outros testes deste arquivo já fazem...
    const gatilhos = await screen.findAllByRole('button', { name: /^Ações de / });

    const nomes = gatilhos.map((b) => b.getAttribute('aria-label'));
    expect(new Set(nomes).size).toBe(nomes.length); // nenhum nome repetido
  });
```

- [ ] **Passo 2: rodar e confirmar que falha** (hoje o nome é sempre "Ações")
- [ ] **Passo 3: aplicar nos 8 call sites.** Padrão:

```tsx
<ActionMenu label={`Ações de ${item.name}`} items={[...]} />
```

Em TOPs use o nome do TOP; em Usuários, o nome do usuário; em Comunicação, o título do comunicado.
**Atenção:** em Usuários o acessor do item é `item`, não `user` — `user` é o autenticado do escopo
externo (já documentado na task 5.5).

- [ ] **Passo 4: rodar suíte inteira** — mudar `aria-label` quebra teste que buscava por "Ações".
- [ ] **Passo 5: commit**

---

## Fase 5 — Nome de campo nos comboboxes

**O que está errado hoje:** o gatilho do `AsyncCombobox` não tem `aria-label` nem `aria-labelledby`.
Ele **tem** nome acessível — vem do conteúdo —, mas o conteúdo é o **valor atual**: um leitor de tela
anuncia "Todas as equipes, botão", sem dizer que aquilo é o filtro de Equipe. O nome descreve o
estado, não a função.

**Como corrigir:** prop `label` opcional no `AsyncCombobox` que vira `aria-label` do gatilho.
Opcional para não quebrar os call sites existentes.

**Arquivos:**
- Modificar: `apps/web/src/components/ui/AsyncCombobox.tsx` (tipo `Props` e o gatilho, ~linha 166)
- Modificar: `apps/web/src/components/ui/AsyncCombobox.test.tsx`
- Modificar os 5 call sites: `features/legendarios/legendario-combobox.tsx:115` ·
  `features/legendarios/legendario-service-section.tsx:213` · `features/teams/team-filter.tsx:14` ·
  `features/tops/participant-combobox.tsx:42` · `features/tops/top-team-form.tsx:79`

- [ ] **Passo 1: teste**

```tsx
  it('o gatilho anuncia a função do campo, não o valor selecionado', () => {
    render(
      <AsyncCombobox
        label="Equipe"
        value=""
        onChange={vi.fn()}
        fetchOptions={fetchOptions}
      />,
    );

    expect(screen.getByRole('button', { name: 'Equipe' })).toBeInTheDocument();
  });
```

- [ ] **Passo 2: rodar e confirmar que falha**
- [ ] **Passo 3: implementar** — em `Props` adicionar `label?: string;` e no gatilho:

```tsx
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
```

- [ ] **Passo 4: passar `label` nos 5 call sites**, com o mesmo texto do rótulo visível do campo
      (ex.: `label="Equipe"` no `team-filter`). O `LegendarioCombobox` repassa a sua própria prop,
      para os ~12 consumidores dele herdarem sem edição.
- [ ] **Passo 5: rodar suíte + lint. Commit.**

---

## Fase 6 — Escape fecha o drawer mobile

**O que está errado hoje:** a `Sidebar` não tem handler de teclado. Toggle e backdrop fecham
(verificado), Escape não. **Não é violação de spec** — a task 3.2 pede toggle e backdrop, e ambos
funcionam. É expectativa comum de drawer, e barato de fazer junto.

**Observação adicional:** o backdrop é um `<button aria-label="Fechar menu">`, mesmo nome acessível
do toggle. Tem `tabIndex={-1}`, então fica fora da tabulação, mas aparece duplicado na lista de
botões de um leitor de tela. Corrigir junto com `aria-hidden="true"` no backdrop.

**Arquivos:**
- Modificar: `apps/web/src/components/layout/Sidebar.tsx` (bloco do backdrop, ~linha 149)
- Modificar: `apps/web/src/components/layout/Sidebar.test.tsx`

- [ ] **Passo 1: teste**

```tsx
  it('Escape fecha o drawer mobile', () => {
    // ...render com o drawer aberto, como os testes existentes fazem...
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
    expect(screen.getByRole('button', { name: 'Fechar menu' })).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'false');
  });
```

- [ ] **Passo 2: rodar e confirmar que falha**
- [ ] **Passo 3: implementar** — efeito no `Sidebar`, ativo só com o drawer aberto:

```tsx
  useEffect(() => {
    if (!isOpen) return;
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [isOpen]);
```

E no backdrop, tirar o nome duplicado:

```tsx
          data-testid="sidebar-backdrop"
          aria-hidden="true"
          tabIndex={-1}
```

- [ ] **Passo 4: rodar e confirmar que passa. Commit.**

---

## Fase 7 — Verificação final e QA no navegador

Nenhuma fase anterior conta como pronta sem isto. As duas primeiras rodadas são a verdade sobre
"compila e não quebrou"; a terceira é a verdade sobre "funciona".

- [ ] **Passo 1: suíte completa**

```
cd apps/web && npx vitest run --maxWorkers=1
```

Esperado: tudo verde. Base atual: **224 testes**. Após as fases: ~240.

- [ ] **Passo 2: lint da raiz**

```
pnpm lint
```

Esperado: exit 0, cobrindo `packages/shared`, `apps/web`, `apps/api` e `prisma/`.

- [ ] **Passo 3: QA no navegador com sessão autenticada** — repetir as sondas que acharam os
      defeitos, agora esperando o oposto:

| Verificação | Esperado |
|---|---|
| Abrir modal de inativar, ler `role` e `aria-modal` | `alertdialog` / `true` |
| Foco após abrir o modal | dentro do painel, em "Cancelar" |
| Escape com o modal aberto | fecha |
| 6 Tabs com o modal aberto | todos **dentro** do painel |
| `aria-label` do X | "Fechar" |
| Botão "Sair" em 390x844 | ≥ 44x44 e `aria-label` presente |
| Nomes dos gatilhos de ação na lista | 20 nomes **distintos** |
| Escape com o drawer mobile aberto | fecha |
| Overflow horizontal, 12 telas × 2 viewports | zero |

- [ ] **Passo 4:** só depois disso, PR e merge. Então o deploy.

---

## O que este plano deliberadamente NÃO faz

- **Não mexe em `packages/shared`, API, banco ou contrato.** Se alguma fase parecer exigir isso,
  é sinal de que entendi errado — pare e pergunte.
- **Não migra `.card-premium`** para `@layer components`, embora esteja solto no `globals.css` com
  o mesmo risco de cascata que o `.input` tinha. É mudança de raio maior, sem defeito observado,
  e não deve entrar num lote pré-deploy. Fica registrado para depois.
- **Não reabre a decisão da task 5.3** (cartões no mobile x rolagem interna). Custa 7 telas agora.
