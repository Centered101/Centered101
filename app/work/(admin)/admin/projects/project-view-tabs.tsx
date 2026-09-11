import { WorkLink } from '@/components/work/layout/work-link'

export type ProjectView = 'active' | 'archived' | 'all'

/**
 * Active / archived / all.
 *
 * Server-rendered links rather than client state, matching ProjectsFilterBar's
 * own reasoning: the view lives in the URL, so a shared link or a browser back
 * lands on the same list. Reuses `.range-tabs`, the strip already used by the
 * dashboard range selector and the project activity page.
 *
 * THE COUNTS ARE THE POINT. They are computed from the full set including
 * archived, so the archived tab shows a real number even while you are looking
 * at the active one — the situation this page previously hid was four archived
 * projects with nothing on screen to suggest they existed.
 *
 * Existing filters travel with the view, so switching tabs does not silently
 * discard a search someone just typed.
 */
export function ProjectViewTabs({
  view,
  counts,
  filters,
}: {
  view: ProjectView
  counts: { active: number; archived: number; all: number }
  filters: { status?: string; type?: string; payment?: string; q?: string; bucket?: string }
}) {
  const href = (next: ProjectView) => {
    const params = new URLSearchParams()
    if (filters.status) params.set('status', filters.status)
    if (filters.type) params.set('type', filters.type)
    if (filters.payment) params.set('payment', filters.payment)
    if (filters.q) params.set('q', filters.q)
    if (filters.bucket) params.set('bucket', filters.bucket)
    // 'active' is the default, so it stays out of the URL — a clean
    // /work/admin/projects keeps meaning what it has always meant.
    if (next !== 'active') params.set('view', next)
    const qs = params.toString()
    return `/work/admin/projects${qs ? `?${qs}` : ''}`
  }

  const tabs: { key: ProjectView; label: string; count: number }[] = [
    { key: 'active', label: 'ใช้งานอยู่', count: counts.active },
    { key: 'archived', label: 'จัดเก็บแล้ว', count: counts.archived },
    { key: 'all', label: 'ทั้งหมด', count: counts.all },
  ]

  return (
    <nav className="range-tabs project-view-tabs">
      {tabs.map((tab) => (
        <WorkLink key={tab.key} href={href(tab.key)} className={view === tab.key ? 'selected' : ''}>
          {tab.label} ({tab.count})
        </WorkLink>
      ))}
    </nav>
  )
}
