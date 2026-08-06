'use client';

import { CheckCircle2, Inbox, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { Surface } from './Surface';

type StateAction = {
  label: string;
  onClick: () => void;
};

interface AsyncStateProps {
  title: string;
  description: string;
  action?: StateAction;
  compact?: boolean;
}

export function LoadingState({
  title = 'Carregando dados',
  description = 'Aguarde enquanto preparamos esta região.',
}: Partial<Pick<AsyncStateProps, 'title' | 'description'>>) {
  return (
    <Surface className="min-h-56" aria-busy="true" aria-live="polite">
      <div className="flex h-full min-h-44 flex-col justify-center gap-5">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden="true" />
          <div>
            <p className="type-section-title">{title}</p>
            <p className="type-helper mt-1">{description}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3" aria-hidden="true">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-16 animate-pulse rounded-lg bg-surface-raised" />
          ))}
        </div>
      </div>
    </Surface>
  );
}

export function EmptyState({ title, description, action, compact = false }: AsyncStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'min-h-36 p-5' : 'min-h-56 p-8'}`}>
      <Inbox className="h-7 w-7 text-content-muted" aria-hidden="true" />
      <h2 className="type-section-title mt-3">{title}</h2>
      <p className="type-body mt-2 max-w-md text-content-muted">{description}</p>
      {action ? <Button className="mt-5" onClick={action.onClick}>{action.label}</Button> : null}
    </div>
  );
}

export function ErrorState({ title, description, action, compact = false }: AsyncStateProps) {
  return (
    <Surface className={compact ? '' : 'min-h-56'}>
      <div className={`flex flex-col items-start justify-center ${compact ? 'min-h-32' : 'min-h-44'}`} role="alert">
        <p className="type-label text-feedback-danger">Não foi possível carregar</p>
        <h2 className="type-section-title mt-2">{title}</h2>
        <p className="type-body mt-2 max-w-xl text-content-muted">{description}</p>
        {action ? (
          <Button className="mt-5" onClick={action.onClick}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {action.label}
          </Button>
        ) : null}
      </div>
    </Surface>
  );
}

export function SuccessState({ title, description, action, compact = false }: AsyncStateProps) {
  return (
    <div className={`flex items-start gap-3 rounded-lg border border-feedback-success/25 bg-feedback-success/10 ${compact ? 'p-3' : 'p-4'}`} role="status">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-feedback-success" aria-hidden="true" />
      <div>
        <p className="font-bold text-content-strong">{title}</p>
        <p className="type-helper mt-1">{description}</p>
        {action ? <Button variant="ghost" size="sm" className="mt-2" onClick={action.onClick}>{action.label}</Button> : null}
      </div>
    </div>
  );
}
