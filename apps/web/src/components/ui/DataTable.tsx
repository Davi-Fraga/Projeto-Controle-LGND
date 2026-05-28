'use client';

import { ReactNode } from 'react';
import clsx from 'clsx';

interface Column<T> {
  header: string;
  accessor: (item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  items: T[];
  loading?: boolean;
  emptyMessage?: string;
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
  onRowClick,
  currentPage,
  totalPages,
  onPageChange,
}: DataTableProps<T>) {
  return (
    <div className="flex flex-col gap-4">
      {/* Scrollable Container */}
      <div className="w-full overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/30">
        <table className="w-full border-collapse text-left text-sm text-zinc-300">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950/80 text-xs font-bold tracking-wider text-zinc-400 uppercase">
              {columns.map((col, idx) => (
                <th key={idx} className={clsx('px-6 py-4 font-semibold', col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-zinc-500">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                    <span className="font-medium text-xs tracking-wider uppercase">Carregando dados...</span>
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-10 text-center text-zinc-500 font-medium">
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
                    onRowClick ? 'cursor-pointer hover:bg-zinc-800/30' : 'hover:bg-zinc-800/10'
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

      {/* Pagination Controls */}
      {totalPages !== undefined && currentPage !== undefined && onPageChange && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-zinc-800/60 pt-4 px-2">
          <button
            type="button"
            disabled={currentPage <= 1 || loading}
            onClick={() => onPageChange(currentPage - 1)}
            className="flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-xs font-semibold text-zinc-300 transition-all hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-40 disabled:hover:bg-zinc-900/50 disabled:hover:text-zinc-300"
          >
            Anterior
          </button>
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
            Página <span className="text-zinc-300">{currentPage}</span> de <span className="text-zinc-300">{totalPages}</span>
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages || loading}
            onClick={() => onPageChange(currentPage + 1)}
            className="flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-xs font-semibold text-zinc-300 transition-all hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-40 disabled:hover:bg-zinc-900/50 disabled:hover:text-zinc-300"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
