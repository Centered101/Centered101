import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export type Column<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
  className?: string
  headerClassName?: string
}

type Props<T extends { id: string }> = {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  emptyMessage?: string
  emptyDescription?: string
  className?: string
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  loading = false,
  emptyMessage = 'No records found',
  emptyDescription,
  className,
}: Props<T>) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-[#27272A]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#52525b]',
                  col.headerClassName
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-14 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="size-5 animate-spin rounded-full border-2 border-[#27272A] border-t-[#409EFE]" />
                  <p className="text-sm text-[#52525b]">Loading data...</p>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-14 text-center">
                <p className="text-sm text-[#A1A1AA]">{emptyMessage}</p>
                {emptyDescription && (
                  <p className="mt-1 text-xs text-[#52525b]">{emptyDescription}</p>
                )}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[#27272A]/60 transition-colors hover:bg-[#27272A]/20"
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3 text-[#A1A1AA]', col.className)}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
