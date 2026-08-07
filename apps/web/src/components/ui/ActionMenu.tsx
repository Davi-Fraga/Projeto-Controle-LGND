'use client';

import Link from 'next/link';
import { type KeyboardEvent as ReactKeyboardEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import clsx from 'clsx';

export type ActionMenuItem = {
  label: string;
  href?: string;
  icon?: ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

export function ActionMenu({ items, label = 'Ações' }: { items: ActionMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  // Foco roving: o item ativo é o único focado; -1 = menu aberto sem item focado (abertura por mouse).
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (ref.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
      setActiveIndex(-1);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    function updatePosition() {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 176;
      const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.right - width));
      setPosition({ top: rect.bottom + 6, left });
    }
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  // Move o foco real para o item ativo. Sem isto o menu, que vive num portal no fim do
  // <body>, só seria alcançável tabulando a página inteira.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    itemRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  function fechar(devolverFoco: boolean) {
    setOpen(false);
    setActiveIndex(-1);
    if (devolverFoco) triggerRef.current?.focus();
  }

  // Índice do próximo item habilitado a partir de `from`, circulando. `null` se não houver nenhum.
  function proximoHabilitado(from: number, passo: number): number | null {
    for (let i = 0; i < items.length; i += 1) {
      const idx = (from + passo * (i + 1) + items.length * (i + 2)) % items.length;
      if (!items[idx].disabled) return idx;
    }
    return null;
  }

  function primeiroHabilitado(doFim: boolean): number | null {
    const ordem = doFim
      ? [...items.keys()].reverse()
      : [...items.keys()];
    const achado = ordem.find((i) => !items[i].disabled);
    return achado === undefined ? null : achado;
  }

  function abrirComFoco(doFim: boolean) {
    setOpen(true);
    setActiveIndex(primeiroHabilitado(doFim) ?? -1);
  }

  // Escape, Tab e setas são ouvidos no documento: a abertura por mouse deixa o foco no
  // gatilho (ou no body), então um handler preso ao menu não receberia a tecla.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          fechar(true);
          break;
        case 'Tab':
          // Fecha em vez de deixar o foco saltar para o fim do <body>, onde está o portal.
          fechar(false);
          break;
        case 'ArrowDown': {
          event.preventDefault();
          const proximo = activeIndex < 0 ? primeiroHabilitado(false) : proximoHabilitado(activeIndex, 1);
          if (proximo !== null) setActiveIndex(proximo);
          break;
        }
        case 'ArrowUp': {
          event.preventDefault();
          const anterior = activeIndex < 0 ? primeiroHabilitado(true) : proximoHabilitado(activeIndex, -1);
          if (anterior !== null) setActiveIndex(anterior);
          break;
        }
        case 'Home': {
          event.preventDefault();
          const primeiro = primeiroHabilitado(false);
          if (primeiro !== null) setActiveIndex(primeiro);
          break;
        }
        case 'End': {
          event.preventDefault();
          const ultimo = primeiroHabilitado(true);
          if (ultimo !== null) setActiveIndex(ultimo);
          break;
        }
        default:
          break;
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, activeIndex, items]);

  function onTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (open) return; // com o menu aberto quem responde é o listener do documento
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      // preventDefault evita que o browser converta Enter/Espaço em click e reabra o menu
      event.preventDefault();
      abrirComFoco(false);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      abrirComFoco(true);
    }
  }

  function closeAndRun(action?: () => void) {
    fechar(false);
    action?.();
  }

  // Com as ações filtradas por permission, um usuário sem nenhuma ação disponível não pode
  // ver um "⋮" que abre um menu vazio. O early-return fica DEPOIS dos hooks de propósito:
  // antes deles, mudar de 0 para N itens alteraria a ordem de chamada entre renders.
  if (items.length === 0) return null;

  return (
    <div ref={ref} className="relative inline-flex justify-end">
      {/* `aria-label` explícito: `title` sozinho é nome acessível só por fallback e não
          ajuda no toque. O gatilho é 44x44 por ser alvo de dedo numa lista densa. */}
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onKeyDown={onTriggerKeyDown}
        onClick={() => (open ? fechar(false) : setOpen(true))}
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-surface-raised text-content transition-colors hover:bg-surface-hover hover:text-content-strong"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && mounted ? createPortal(
        <div
          ref={menuRef}
          className="fixed z-[100] min-w-44 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 py-1 shadow-xl shadow-black/40"
          style={{ top: position.top, left: position.left }}
          role="menu"
        >
          {items.map((item, index) => {
            const className = clsx(
              'flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold uppercase tracking-wider transition-colors',
              item.destructive ? 'text-rose-400 hover:bg-rose-950/30 hover:text-rose-300' : 'text-zinc-300 hover:bg-zinc-900 hover:text-white',
              item.disabled && 'pointer-events-none opacity-40',
            );
            // tabIndex -1 em todos: a navegação é por seta, não por Tab. Sem isto os itens
            // entrariam na ordem de tabulação da página no ponto do portal — o fim do <body>.
            if (item.href) {
              return (
                <Link
                  key={item.label}
                  ref={(node) => { itemRefs.current[index] = node; }}
                  href={item.href}
                  className={className}
                  role="menuitem"
                  tabIndex={-1}
                  onClick={() => fechar(false)}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            }
            return (
              <button
                key={item.label}
                ref={(node) => { itemRefs.current[index] = node; }}
                type="button"
                className={className}
                role="menuitem"
                tabIndex={-1}
                disabled={item.disabled}
                onClick={() => closeAndRun(item.onClick)}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
