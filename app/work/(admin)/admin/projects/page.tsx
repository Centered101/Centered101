import { WorkLink } from '@/components/work/layout/work-link'
import {
  Archive,
  Clock3,
  FolderKanban,
  HeartPulse,
  Inbox,
  Plus,
  Rocket,
  Search,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Panel, PageHeading } from '@/components/work/data/panel'
import { ProjectViewTabs, type ProjectView } from './project-view-tabs'
import { StatCard } from '@/components/work/data/stat-card'
import { ProjectsTable } from '@/components/work/data/projects-table'
import { requireAdmin } from '@/lib/work/auth/permissions'
import { PROJECT_STATUSES, PROJECT_TYPES } from '@/lib/work/types/enums'
import { getProjects, type ProjectListItem } from '@/lib/work/queries/projects'
import { ProjectsFilterBar } from './projects-filter-bar'

export const metadata = { title: 'โปรเจกต์' }

/**
 * Dashboard cards (docs/ADMIN_PROJECT_REVIEW.md §1) — bucketed off the same
 * `ProjectListItem[]` the table already renders, no extra query. The
 * buckets deliberately use the resolved status vocabulary
 * (docs/ADMIN_PROJECT_REVIEW.md §2's mapping table), not a literal
 * re-listing of every project_status value — "Awaiting Client" covers three
 * different statuses that all mean the same thing from this card's point
 * of view.
 */
const CARD_BUCKETS: {
  key: string
  label: string
  statuses: readonly ProjectListItem['status'][]
  icon: LucideIcon
}[] = [
  { key: 'new', label: 'ใหม่', statuses: ['SUBMITTED'], icon: Inbox },
  { key: 'reviewing', label: 'กำลังตรวจสอบ', statuses: ['UNDER_REVIEW', 'NEEDS_INFORMATION'], icon: Search },
  {
    key: 'awaiting_client',
    label: 'รอลูกค้า',
    statuses: ['QUOTATION_SENT', 'AWAITING_CLIENT_APPROVAL', 'WAITING_FOR_DEPOSIT', 'CLIENT_APPROVAL'],
    icon: Clock3,
  },
  { key: 'in_progress', label: 'กำลังดำเนินการ', statuses: ['IN_PROGRESS', 'IN_REVIEW'], icon: Rocket },
  { key: 'ready', label: 'พร้อมส่งมอบ', statuses: ['READY_FOR_DELIVERY', 'READY_FOR_HANDOVER'], icon: Rocket },
  { key: 'maintenance', label: 'ดูแลรักษา', statuses: ['MAINTENANCE'], icon: HeartPulse },
]

function matchesFilters(
  project: ProjectListItem,
  filters: { status?: string; type?: string; payment?: string; q?: string },
): boolean {
  if (filters.status && project.status !== filters.status) return false
  if (filters.type && project.type !== filters.type) return false
  if (filters.payment === 'PAID' && !(project.totalAmount > 0 && project.paidAmount >= project.totalAmount)) {
    return false
  }
  if (filters.payment === 'UNPAID' && project.totalAmount > 0 && project.paidAmount >= project.totalAmount) {
    return false
  }
  if (filters.q) {
    const q = filters.q.toLowerCase()
    const haystack = `${project.name} ${project.clientName} ${project.projectCode} ${project.id}`.toLowerCase()
    if (!haystack.includes(q)) return false
  }
  return true
}

/**
 * All projects in the organization — extended per
 * docs/ADMIN_PROJECT_REVIEW.md §1 with status-summary cards, filters
 * (status/type/payment) and search (name/client/id). `getProjects()` applies
 * no organization filter of its own — RLS scopes the result to the caller's
 * memberships, so this page cannot show another tenant's work even if the
 * guard above were removed. Filtering happens in JS over the already-RLS-
 * scoped array — matching this app's existing scale, not a new query shape.
 */
export default async function AdminProjectsPage(props: {
  searchParams: Promise<{
    status?: string
    type?: string
    payment?: string
    q?: string
    view?: string
    bucket?: string
  }>
}) {
  const staff = await requireAdmin()

  // Archived projects are fetched HERE and nowhere else in the app. Every
  // other list keeps the default (active only) — archiving still means "out of
  // the way", it just stops meaning "unreachable".
  const [all, params] = await Promise.all([
    getProjects({ includeArchived: true }),
    props.searchParams,
  ])

  const view: ProjectView =
    params.view === 'archived' || params.view === 'all' ? params.view : 'active'

  const active = all.filter((project) => project.archivedAt === null)
  const archived = all.filter((project) => project.archivedAt !== null)

  const inView = view === 'archived' ? archived : view === 'all' ? all : active

  const filters = {
    status: params.status,
    type: params.type,
    payment: params.payment,
    q: params.q,
    bucket: params.bucket,
  }

  // A card's statuses, when one is selected. Applied ON TOP of the dropdown
  // filters rather than instead of them, so the two never fight over the list.
  const bucket = CARD_BUCKETS.find((b) => b.key === params.bucket)

  const filtered = inView
    .filter((project) => matchesFilters(project, filters))
    .filter((project) => !bucket || bucket.statuses.includes(project.status))

  /**
   * Every card is a link back to this same page with one thing changed.
   * Clicking the card that is already applied clears it, so a card is a
   * toggle rather than a one-way trip that forces a trip to the dropdown to
   * undo.
   */
  const cardHref = (next: { view?: ProjectView; bucket?: string }) => {
    const p = new URLSearchParams()
    if (filters.status) p.set('status', filters.status)
    if (filters.type) p.set('type', filters.type)
    if (filters.payment) p.set('payment', filters.payment)
    if (filters.q) p.set('q', filters.q)

    const nextView = next.view ?? view
    if (nextView !== 'active') p.set('view', nextView)
    if (next.bucket) p.set('bucket', next.bucket)

    const qs = p.toString()
    return `/work/admin/projects${qs ? `?${qs}` : ''}`
  }

  return (
    <>
      <PageHeading
        title="โปรเจกต์"
        description={
          archived.length > 0
            ? `ใช้งานอยู่ ${active.length} · จัดเก็บแล้ว ${archived.length}`
            : `ใช้งานอยู่ ${active.length} โปรเจกต์`
        }
        action={
          staff.can('project:write') ? (
            <WorkLink className="primary" href="/work/admin/projects/new">
              <Plus size={17} />
              สร้างโปรเจกต์
            </WorkLink>
          ) : undefined
        }
      />

      {/* Cards count the ACTIVE set and now say so. The previous label read
          "ทั้งหมด" over a number that excluded archived projects, so four of
          five could disappear with nothing on screen admitting it. */}
      <section className="stats-grid">
        <StatCard
          label="ใช้งานอยู่"
          value={String(active.length)}
          icon={FolderKanban}
          href={cardHref({ view: 'active' })}
          selected={view === 'active' && !bucket}
        />
        {CARD_BUCKETS.map((b) => (
          <StatCard
            key={b.key}
            label={b.label}
            // Counted against the view being looked at, so the numbers agree
            // with the table underneath instead of describing a different set.
            value={String(inView.filter((p) => b.statuses.includes(p.status)).length)}
            icon={b.icon}
            href={cardHref({ bucket: bucket?.key === b.key ? undefined : b.key })}
            selected={bucket?.key === b.key}
          />
        ))}
        {archived.length > 0 && (
          <StatCard
            label="จัดเก็บแล้ว"
            value={String(archived.length)}
            icon={Archive}
            href={cardHref({ view: 'archived', bucket: undefined })}
            selected={view === 'archived'}
          />
        )}
      </section>

      <ProjectViewTabs
        view={view}
        counts={{ active: active.length, archived: archived.length, all: all.length }}
        filters={filters}
      />

      <ProjectsFilterBar
        filters={filters}
        view={view}
        statuses={PROJECT_STATUSES}
        types={PROJECT_TYPES}
      />

      <Panel className="projects-panel">
        <ProjectsTable
          projects={filtered}
          emptyDescription={
            view === 'archived'
              ? 'ยังไม่มีโปรเจกต์ที่จัดเก็บไว้'
              : 'เมื่อสร้างโปรเจกต์แล้ว รายการจะแสดงที่นี่'
          }
        />
      </Panel>
    </>
  )
}
