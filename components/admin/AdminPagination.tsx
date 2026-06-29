import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  page: number
  total: number
  pageSize: number
  onChange: (page: number) => void
  className?: string
}

export function AdminPagination({ page, total, pageSize, onChange, className }: Props) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const pages: (number | '…')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('…')
    pages.push(totalPages)
  }

  return (
    <div className={cn('flex items-center justify-between border-t border-surface-300 px-5 py-3', className)}>
      <p className="text-[11px] text-foreground-muted">
        {from}–{to} of {total.toLocaleString()}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="grid size-7 place-items-center rounded-lg border border-surface-300 text-foreground-muted transition-colors hover:border-border-strong hover:text-foreground-light disabled:opacity-30"
        >
          <ChevronLeft className="size-3.5" />
        </button>

        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="grid size-7 place-items-center text-[11px] text-foreground-faint">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={cn(
                'grid size-7 place-items-center rounded-lg text-[12px] font-medium transition-colors',
                p === page
                  ? 'bg-[#409EFE]/10 text-[#409EFE]'
                  : 'text-foreground-muted hover:bg-surface-200 hover:text-foreground-light'
              )}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="grid size-7 place-items-center rounded-lg border border-surface-300 text-foreground-muted transition-colors hover:border-border-strong hover:text-foreground-light disabled:opacity-30"
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
