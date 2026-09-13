import type { ReactNode } from 'react';
import clsx from 'clsx';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

export function DataTable<T extends { id: string }>({ columns, rows, onRowClick, emptyMessage = 'Sin registros', className }: { columns: Column<T>[]; rows: T[]; onRowClick?: (row: T) => void; emptyMessage?: string; className?: string }) {
  return (
    <div className={clsx('card overflow-hidden', className)}>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              {columns.map((c) => (
                <th key={c.key} className={clsx('px-4 py-3', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} onClick={onRowClick ? () => onRowClick(r) : undefined} className={clsx('transition-colors', onRowClick && 'cursor-pointer hover:bg-brand-50/40')}>
                  {columns.map((c) => (
                    <td key={c.key} className={clsx('px-4 py-3 align-middle text-slate-700', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.className)}>
                      {c.render(r)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
