'use client';

import clsx from 'clsx';

interface StatusBadgeProps {
  status: string;
  type?: 'legendary' | 'team' | 'top' | 'participant' | 'social-action' | 'message' | 'general';
}

const TRANS_MAP: Record<string, string> = {
  // Legendary Status
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  AWAY: 'Afastado',
  VISITOR: 'Visitante',
  UNKNOWN: 'Desconhecido',
  
  // Team / Membership
  PAUSED: 'Pausado',

  // TOP Event / Social Action
  PLANNED: 'Planejado',
  REGISTRATION_OPEN: 'Inscrições Abertas',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',

  // Participant / Servant / Recipient
  REGISTERED: 'Inscrito',
  CONFIRMED: 'Confirmado',
  PENDING: 'Pendente',
  READ: 'Lido',

  // Message
  DRAFT: 'Rascunho',
  SENT: 'Enviado',
};

const COLOR_MAP: Record<string, string> = {
  // Active/Success states
  ACTIVE: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  CONFIRMED: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  COMPLETED: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  READ: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',

  // Planned/Pending/Draft states
  PLANNED: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  REGISTRATION_OPEN: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  REGISTERED: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  PENDING: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  DRAFT: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  VISITOR: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',

  // Warning/Inactivation states
  INACTIVE: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  CANCELLED: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  AWAY: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  PAUSED: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  UNKNOWN: 'bg-zinc-700/10 text-zinc-500 border border-zinc-700/20',

  // Message Sent
  SENT: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

export function StatusBadge({ status, type = 'general' }: StatusBadgeProps) {
  const normalized = status?.toUpperCase() || 'UNKNOWN';
  const label = TRANS_MAP[normalized] || status || 'Desconhecido';
  const colorClass = COLOR_MAP[normalized] || 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase',
        colorClass
      )}
    >
      <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {label}
    </span>
  );
}
