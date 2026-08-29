import Link from 'next/link'
import { Check, CreditCard, FileText, GitBranch } from 'lucide-react'
import type { ElementType, ReactNode } from 'react'

import { formatRelative } from '@/lib/work/format'
import { activityDetail, activityHref, type ActivityItem } from '@/lib/work/queries/activity'

const icons: Record<ActivityItem['icon'], ElementType> = {
  payment: CreditCard,
  check: Check,
  branch: GitBranch,
  file: FileText,
}

/**
 * Recent activity, from `activity_logs`.
 *
 * Entries are written in the same transaction as the mutation they describe,
 * so this feed is a record rather than a reconstruction. Nothing is inferred
 * here from the current state of other tables.
 *
 * Each entry links to what it is about — see `activityHref`. Entries with no
 * destination stay as plain rows rather than becoming links that go nowhere,
 * which is why the row body is built once and wrapped, not duplicated across
 * an if/else.
 */
export function ActivityList({
  items,
  portal = 'admin',
}: {
  items: (ActivityItem & { projectName?: string | null })[]
  /** Decides which portal's routes the entries point at. */
  portal?: 'admin' | 'portal'
}) {
  if (items.length === 0) {
    return <p className="muted empty-inline">ยังไม่มีกิจกรรม</p>
  }

  return (
    <div className="activity-list">
      {items.map((item) => {
        const Icon = icons[item.icon]
        const href = activityHref(item, portal)

        const body: ReactNode = (
          <>
            <span className={`activity-icon ${item.tone}`}>
              <Icon size={15} />
            </span>
            <p>
              <strong>{item.title}</strong>
              <small>{activityDetail(item, item.projectName)}</small>
            </p>
            <time dateTime={item.createdAt}>{formatRelative(item.createdAt)}</time>
          </>
        )

        return href ? (
          <Link key={item.id} href={href} className="activity-link">
            {body}
          </Link>
        ) : (
          <div key={item.id}>{body}</div>
        )
      })}
    </div>
  )
}
