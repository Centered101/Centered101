'use client'

import Link from 'next/link'

/** Simple query-string filter strip — no client state, so a shared link (or a browser back) always shows the right filter. */
export function InboxFilter({
  active,
  filters,
}: {
  active: string
  filters: readonly { key: string; label: string }[]
}) {
  return (
    <nav className="range-tabs">
      {filters.map((filter) => (
        <Link
          key={filter.key}
          href={filter.key === 'all' ? '/work/admin/inbox' : `/work/admin/inbox?filter=${filter.key}`}
          className={filter.key === active ? 'selected' : ''}
        >
          {filter.label}
        </Link>
      ))}
    </nav>
  )
}
