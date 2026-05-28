'use client';

import { ReactNode } from 'react';
import clsx from 'clsx';

interface DashboardCardProps {
  label: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  className?: string;
}

export function DashboardCard({
  label,
  value,
  description,
  icon,
  trend,
  className,
}: DashboardCardProps) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-all duration-300 hover:border-zinc-700/80 hover:bg-zinc-900/80 shadow-md group',
        className
      )}
    >
      {/* Background Accent Gradient */}
      <div className="absolute right-0 top-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-orange-600/5 blur-xl group-hover:bg-orange-600/10 transition-all duration-300" />

      <div className="flex items-center justify-between">
        <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
          {label}
        </span>
        {icon && <div className="text-zinc-400 group-hover:text-orange-500 transition-colors duration-300">{icon}</div>}
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold tracking-tight text-white group-hover:text-orange-400 transition-colors duration-300">
          {value}
        </span>
        {trend && (
          <span
            className={clsx(
              'text-xs font-semibold',
              trend.isPositive ? 'text-emerald-400' : 'text-rose-400'
            )}
          >
            {trend.value}
          </span>
        )}
      </div>

      {description && (
        <p className="mt-2 text-xs text-zinc-400 leading-relaxed font-medium">
          {description}
        </p>
      )}
    </div>
  );
}
