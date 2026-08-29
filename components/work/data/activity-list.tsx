import { Check, CreditCard, FileText, GitBranch } from 'lucide-react'
import type { ElementType } from 'react'

import { formatRelative } from '@/lib/work/format'
import { activityDetail, type ActivityItem } from '@/lib/work/queries/activity'

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
 */
export function ActivityList({
  items,
}: {
  items: (ActivityItem & { projectName?: string | null })[]
}) {
  if (items.length === 0) {
    return <p className="muted empty-inline">ยังไม่มีกิจกรรม</p>
  }

  return (
    <div className="activity-list">
      {items.map((item) => {
        const Icon = icons[item.icon]
        return (
          <div key={item.id}>
            <span className={`activity-icon ${item.tone}`}>
              <Icon size={15} />
            </span>
            <p>
              <strong>{item.title}</strong>
              <small>{activityDetail(item, item.projectName)}</small>
            </p>
            <time dateTime={item.createdAt}>{formatRelative(item.createdAt)}</time>
          </div>
        )
      })}
    </div>
  )
}
