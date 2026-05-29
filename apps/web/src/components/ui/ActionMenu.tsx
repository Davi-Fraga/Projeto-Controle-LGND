'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useRef, useState } from 'react';
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

export function ActionMenu({ items, label = 'Acoes' }: { items: ActionMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (ref.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
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

  function closeAndRun(action?: () => void) {
    setOpen(false);
    action?.();
  }

  return (
    <div ref={ref} className="relative inline-flex justify-end">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/70 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
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
          {items.map((item) => {
            const className = clsx(
              'flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold uppercase tracking-wider transition-colors',
              item.destructive ? 'text-rose-400 hover:bg-rose-950/30 hover:text-rose-300' : 'text-zinc-300 hover:bg-zinc-900 hover:text-white',
              item.disabled && 'pointer-events-none opacity-40',
            );
            if (item.href) {
              return (
                <Link key={item.label} href={item.href} className={className} role="menuitem" onClick={() => setOpen(false)}>
                  {item.icon}
                  {item.label}
                </Link>
              );
            }
            return (
              <button key={item.label} type="button" className={className} role="menuitem" disabled={item.disabled} onClick={() => closeAndRun(item.onClick)}>
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
