'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'border-accent bg-accent text-accent-foreground shadow-sm shadow-black/20 hover:border-accent-hover hover:bg-accent-hover active:border-accent-pressed active:bg-accent-pressed',
  secondary:
    'border-line bg-surface-raised text-content hover:border-line-strong hover:bg-surface-hover hover:text-content-strong active:bg-surface',
  ghost:
    'border-transparent bg-transparent text-content-muted hover:bg-surface-raised hover:text-content-strong active:bg-surface',
  danger:
    'border-feedback-danger/80 bg-feedback-danger text-white hover:bg-feedback-danger/90 active:bg-feedback-danger/80',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 py-2 text-xs',
  md: 'min-h-11 px-4 py-2.5 text-sm',
  lg: 'min-h-12 px-5 py-3 text-sm',
  icon: 'h-11 w-11 p-0',
};

export function buttonStyles({
  variant = 'secondary',
  size = 'md',
  selected = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  selected?: boolean;
  className?: string;
} = {}) {
  return clsx(
    'motion-displacement inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border font-bold tracking-wide transition-[color,background-color,border-color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:translate-y-px disabled:pointer-events-none disabled:border-line disabled:bg-surface disabled:text-content-disabled disabled:opacity-70',
    variantStyles[variant],
    sizeStyles[size],
    selected && 'border-accent/70 bg-accent/10 text-accent ring-1 ring-accent/30',
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  selected?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, type = 'button', variant = 'secondary', size = 'md', selected = false, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonStyles({ variant, size, selected, className })}
      data-selected={selected ? 'true' : undefined}
      {...props}
    />
  );
});
