import { type ElementType, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';

type SurfaceTone = 'subtle' | 'base' | 'raised';
type SurfaceBorder = 'none' | 'subtle' | 'strong';
type SurfacePadding = 'none' | 'sm' | 'md' | 'lg';

const toneStyles: Record<SurfaceTone, string> = {
  subtle: 'bg-surface-subtle',
  base: 'bg-surface',
  raised: 'bg-surface-raised',
};

const borderStyles: Record<SurfaceBorder, string> = {
  none: 'border border-transparent',
  subtle: 'border border-line',
  strong: 'border border-line-strong',
};

const paddingStyles: Record<SurfacePadding, string> = {
  none: '',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
};

export interface SurfaceProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'article' | 'aside';
  children: ReactNode;
  tone?: SurfaceTone;
  border?: SurfaceBorder;
  padding?: SurfacePadding;
}

export function Surface({
  as = 'div',
  children,
  tone = 'base',
  border = 'subtle',
  padding = 'md',
  className,
  ...props
}: SurfaceProps) {
  const Component = as as ElementType;

  return (
    <Component
      className={clsx('rounded-xl text-content', toneStyles[tone], borderStyles[border], paddingStyles[padding], className)}
      {...props}
    >
      {children}
    </Component>
  );
}
