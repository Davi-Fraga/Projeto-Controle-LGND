'use client';

import { useId, useState, type ReactNode } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from './Button';

interface FilterPanelProps {
  /** Campo de busca: fica SEMPRE visível, em qualquer viewport. */
  search: ReactNode;
  /** Filtros secundários: recolhíveis no mobile, sempre abertos a partir de `md`. */
  children: ReactNode;
  /** Quantos filtros secundários estão aplicados — governa o resumo e o "limpar". */
  activeCount?: number;
  onClear?: () => void;
  /** Marcadores dos filtros aplicados (ex.: "Igreja: X"), visíveis mesmo com o painel fechado. */
  activeSummary?: ReactNode;
}

/**
 * Painel de filtros responsivo (change refinar-design-system, task 5.2).
 *
 * O problema que resolve: com muitos filtros, o mobile empilha tudo e empurra o primeiro
 * resultado para fora da tela. Aqui busca, ação de limpar e resumo dos filtros ativos
 * permanecem visíveis; só os campos secundários recolhem — e apenas no mobile, porque no
 * desktop há espaço e esconder viraria clique a mais sem motivo.
 *
 * O contador de ativos fica no rótulo do botão de propósito: painel fechado com filtro
 * aplicado é a receita para o usuário achar que a lista está errada.
 */
export function FilterPanel({ search, children, activeCount = 0, onClear, activeSummary }: FilterPanelProps) {
  const [openOnMobile, setOpenOnMobile] = useState(false);
  const panelId = useId();

  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex-1">{search}</div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            className="md:hidden"
            aria-expanded={openOnMobile}
            aria-controls={panelId}
            onClick={() => setOpenOnMobile((current) => !current)}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filtros
            {activeCount > 0 ? (
              <span className="ml-1 rounded-full bg-accent px-2 py-0.5 text-[11px] text-accent-foreground">{activeCount}</span>
            ) : null}
          </Button>

          {activeCount > 0 && onClear ? (
            <Button type="button" variant="ghost" onClick={onClear}>
              <X className="h-4 w-4" aria-hidden="true" />
              Limpar
            </Button>
          ) : null}
        </div>
      </div>

      {/* Resumo dos ativos: fora do bloco recolhível, senão some junto e o usuário
          fica sem saber por que a lista está curta. */}
      {activeSummary ? <div className="mt-3 flex flex-wrap gap-2">{activeSummary}</div> : null}

      <div
        id={panelId}
        data-testid="filtros-secundarios"
        className={`${openOnMobile ? 'grid' : 'hidden'} mt-4 gap-3 sm:grid-cols-2 md:!grid md:grid-cols-4`}
      >
        {children}
      </div>
    </section>
  );
}
