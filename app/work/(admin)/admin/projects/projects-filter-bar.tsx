'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { useWorkHref } from '@/components/work/layout/work-link-context'
import { PROJECT_STATUS_LABELS, PROJECT_TYPE_LABELS } from '@/lib/work/format'
import type { ProjectStatus, ProjectType } from '@/lib/work/types/enums'

/**
 * Status / type / payment filters + search (docs/ADMIN_PROJECT_REVIEW.md §1)
 * — everything server-rendered via the URL's own searchParams (page.tsx),
 * this component only builds and navigates to that URL. No client-side
 * project list lives here; a shared link or a browser back always shows the
 * right filtered view, the same reasoning the Inbox's own filter strip uses.
 */
export function ProjectsFilterBar({
  filters,
  view,
  statuses,
  types,
}: {
  filters: { status?: string; type?: string; payment?: string; q?: string; bucket?: string }
  /** Carried through every filter change so changing a filter does not throw
      you back to the active list while you are reading the archived one. */
  view?: 'active' | 'archived' | 'all'
  statuses: readonly ProjectStatus[]
  types: readonly ProjectType[]
}) {
  const router = useRouter()
  const [q, setQ] = useState(filters.q ?? '')
  const projectsHref = useWorkHref('/work/admin/projects')

  function update(next: Partial<typeof filters>) {
    const merged = { ...filters, ...next }
    const params = new URLSearchParams()
    if (merged.status) params.set('status', merged.status)
    if (merged.type) params.set('type', merged.type)
    if (merged.payment) params.set('payment', merged.payment)
    if (merged.q) params.set('q', merged.q)
    if (merged.bucket) params.set('bucket', merged.bucket)
    if (view && view !== 'active') params.set('view', view)
    router.push(`${projectsHref}${params.toString() ? `?${params.toString()}` : ''}`)
  }

  return (
    <div className="projects-filter-bar">
      <input
        type="search"
        placeholder="ค้นหาชื่อโปรเจกต์ / ลูกค้า / รหัสโปรเจกต์"
        value={q}
        onChange={(event) => setQ(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') update({ q })
        }}
        onBlur={() => update({ q })}
      />

      <select value={filters.status ?? ''} onChange={(event) => update({ status: event.target.value || undefined })}>
        <option value="">ทุกสถานะ</option>
        {statuses.map((status) => (
          <option key={status} value={status}>
            {PROJECT_STATUS_LABELS[status]}
          </option>
        ))}
      </select>

      <select value={filters.type ?? ''} onChange={(event) => update({ type: event.target.value || undefined })}>
        <option value="">ทุกประเภท</option>
        {types.map((type) => (
          <option key={type} value={type}>
            {PROJECT_TYPE_LABELS[type] ?? type}
          </option>
        ))}
      </select>

      <select value={filters.payment ?? ''} onChange={(event) => update({ payment: event.target.value || undefined })}>
        <option value="">การชำระเงินทั้งหมด</option>
        <option value="PAID">ชำระครบแล้ว</option>
        <option value="UNPAID">ยังไม่ครบ</option>
      </select>
    </div>
  )
}
