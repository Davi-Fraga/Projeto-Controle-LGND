'use client';

import {
  cloneElement,
  isValidElement,
  useId,
  type HTMLAttributes,
  type ReactElement,
} from 'react';
import clsx from 'clsx';

type FieldControlProps = {
  id?: string;
  className?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
};

export interface FieldProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  label: string;
  children: ReactElement<FieldControlProps>;
  htmlFor?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
}

export function Field({
  label,
  children,
  htmlFor,
  hint,
  error,
  optional = false,
  className,
  ...props
}: FieldProps) {
  const generatedId = useId();
  const controlId = htmlFor ?? (isValidElement(children) ? children.props.id : undefined) ?? generatedId;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [children.props['aria-describedby'], hintId, errorId].filter(Boolean).join(' ') || undefined;

  const control = cloneElement(children, {
    id: controlId,
    className: clsx('input', children.props.className),
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : children.props['aria-invalid'],
  });

  return (
    <div className={clsx('space-y-2', className)} {...props}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={controlId} className="type-label text-content">
          {label}
        </label>
        {optional ? <span className="text-helper text-content-muted">Opcional</span> : null}
      </div>
      {control}
      {hint ? (
        <p id={hintId} className="type-helper">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-helper font-semibold text-feedback-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
