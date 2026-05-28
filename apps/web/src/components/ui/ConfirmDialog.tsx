'use client';

import { ReactNode } from 'react';
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
      <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-zinc-800 bg-[#0E0E10] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex gap-4">
          {/* Icon */}
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${colorVariants[variant].icon}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>

          <div className="flex-1">
            <h3 className="text-base font-bold tracking-wide text-zinc-100 uppercase">{title}</h3>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed font-medium">{description}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end gap-3 border-t border-zinc-800/60 pt-4">
          <button
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
