'use client';

import { ReactNode } from 'react';
import clsx from 'clsx';

interface Column<T> {
  header: string;
  accessor: (item: T) => ReactNode;
  className?: string;
  /**
   * `title` = identidade do registro (vira o cabeçalho do cartão no mobile).
   * `actions` = coluna de ações (vai para o rodapé do cartão, sem rótulo).
   * `hideOnMobile` = detalhe secundário, omitido no cartão para não virar parede de texto.
   */
  role?: 'title' | 'actions' | 'hideOnMobile';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  items: T[];
  loading?: boolean;
  /** Conteúdo do estado vazio. Aceita nó para usar os estados compartilhados. */
  emptyMessage?: ReactNode;
  /** Rótulo acessível da tabela — obrigatório na prática quando há mais de uma na tela. */
  caption?: string;
  onRowClick?: (item: T) => void;
  // Pagination
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export function DataTable<T extends { id: string | number }>({
  columns,
  items,
  loading = false,
  emptyMessage = 'Nenhum registro encontrado.',
  caption,
  onRowClick,
  currentPage,
  totalPages,
  onPageChange,
}: DataTableProps<T>) {
  return (
    <div className="flex flex-col gap-4">
      {/* Desktop: tabela. A rolagem horizontal fica explicitamente delimitada pela borda. */}
      <div data-testid="datatable-desktop" className="hidden w-full overflow-x-auto rounded-xl border border-line bg-surface md:block">
        <table className="w-full border-collapse text-left text-sm text-content">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="border-b border-line bg-surface-subtle text-xs font-bold uppercase tracking-wider text-content-muted">
              {columns.map((col, idx) => (
                <th key={idx} className={clsx('px-6 py-4 font-semibold', col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-content-muted">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                    <span className="font-medium text-xs tracking-wider uppercase">Carregando dados...</span>
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-10 text-center font-medium text-content-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onRowClick?.(item)}
                  className={clsx(
                    'transition-colors duration-150',
                    onRowClick ? 'cursor-pointer hover:bg-surface-hover' : 'hover:bg-surface-raised/40'
                  )}
                >
                  {columns.map((col, idx) => (
                    <td key={idx} className={clsx('px-6 py-4.5 font-medium whitespace-nowrap', col.className)}>
                      {col.accessor(item)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: cada registro vira um cartão. Tabela larga em 390px ou vira rolagem
          horizontal (que esconde as ações) ou espreme as colunas até ilegível — o cartão
          preserva as duas coisas que importam: quem é o registro e o que dá para fazer. */}
      <ul data-testid="datatable-mobile" className="flex list-none flex-col gap-3 p-0 md:hidden">
        {loading ? (
          <li className="rounded-xl border border-line bg-surface p-6 text-center text-sm text-content-muted" aria-busy="true">
            Carregando dados…
          </li>
        ) : items.length === 0 ? (
          <li className="rounded-xl border border-line bg-surface p-6 text-center text-sm text-content-muted">
            {emptyMessage}
          </li>
        ) : (
          items.map((item) => {
            // Sem `role: 'title'` declarado, a primeira coluna vira o cabeçalho do cartão —
            // e precisa sair dos detalhes, senão o mesmo dado aparece duas vezes.
            const tituloDeclarado = columns.find((col) => col.role === 'title');
            const titulo = tituloDeclarado ?? columns[0];
            const acoes = columns.find((col) => col.role === 'actions');
            const detalhes = columns.filter((col) => !col.role && col !== titulo);

            return (
              <li key={item.id} className="rounded-xl border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {titulo?.accessor(item)}
                  </div>
                  {acoes ? <div className="shrink-0">{acoes.accessor(item)}</div> : null}
                </div>

                {detalhes.length > 0 ? (
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-3">
                    {detalhes.map((col, idx) => (
                      <div key={idx} className="min-w-0">
                        <dt className="text-[10px] font-bold uppercase tracking-wider text-content-muted">{col.header}</dt>
                        <dd className="mt-0.5 truncate text-sm text-content">{col.accessor(item)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </li>
            );
          })
        )}
      </ul>

      {/* Pagination Controls */}
      {totalPages !== undefined && currentPage !== undefined && onPageChange && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-line pt-4 px-2">
          <button
            type="button"
            disabled={currentPage <= 1 || loading}
            onClick={() => onPageChange(currentPage - 1)}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface-raised px-4 text-xs font-semibold text-content transition-colors hover:bg-surface-hover hover:text-content-strong disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-xs font-bold uppercase tracking-widest text-content-muted">
            Página <span className="text-content-strong">{currentPage}</span> de <span className="text-content-strong">{totalPages}</span>
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages || loading}
            onClick={() => onPageChange(currentPage + 1)}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface-raised px-4 text-xs font-semibold text-content transition-colors hover:bg-surface-hover hover:text-content-strong disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
