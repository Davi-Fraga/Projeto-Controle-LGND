'use client';

import { useEffect, useId, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  variant = 'danger',
}: ConfirmDialogProps) {
  const tituloId = useId();
  const descricaoId = useId();
  const painelRef = useRef<HTMLDivElement>(null);
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const origemDoFocoRef = useRef<HTMLElement | null>(null);

  // Guarda de onde o foco veio e leva para a opção NÃO destrutiva. Na volta, devolve —
  // senão o usuário de teclado é despejado no início da página a cada confirmação.
  useEffect(() => {
    if (!isOpen) return undefined;
    origemDoFocoRef.current = document.activeElement as HTMLElement | null;
    cancelarRef.current?.focus();
    return () => origemDoFocoRef.current?.focus();
  }, [isOpen]);

  // Escape e contenção de foco ouvidos no documento, não no painel: quando o diálogo abre,
  // o foco ainda está fora dele, então um handler preso ao painel não receberia a tecla.
  useEffect(() => {
    if (!isOpen) return undefined;
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

  // O early-return fica DEPOIS dos hooks de propósito: antes deles, abrir e fechar o diálogo
  // mudaria a ordem de chamada entre renders.
  if (!isOpen) return null;

  const colorVariants = {
    danger: {
      btn: 'bg-rose-600 hover:bg-rose-500 text-white focus:ring-rose-500/20',
      icon: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    },
    warning: {
      btn: 'bg-orange-600 hover:bg-orange-500 text-white focus:ring-orange-500/20',
      icon: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    },
    info: {
      btn: 'bg-zinc-700 hover:bg-zinc-650 text-white focus:ring-zinc-500/20',
      icon: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={onCancel} />

      {/* Dialog Panel */}
      <div
        ref={painelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descricaoId}
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-zinc-800 bg-[#0E0E10] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          aria-label="Fechar"
          className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="flex gap-4">
          {/* Icon */}
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${colorVariants[variant].icon}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>

          <div className="flex-1">
            <h3 id={tituloId} className="text-base font-bold tracking-wide text-zinc-100 uppercase">{title}</h3>
            <p id={descricaoId} className="mt-2 text-sm text-zinc-400 leading-relaxed font-medium">{description}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end gap-3 border-t border-zinc-800/60 pt-4">
          <button
            ref={cancelarRef}
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-800 bg-transparent px-4 py-2.5 text-xs font-bold tracking-wide text-zinc-400 uppercase transition-all hover:bg-zinc-900 hover:text-zinc-100"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2.5 text-xs font-bold tracking-wide uppercase transition-all focus:outline-none focus:ring-2 ${colorVariants[variant].btn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
