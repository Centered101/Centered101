import { Check, CreditCard, FileText, GitBranch } from 'lucide-react'
import type { ElementType } from 'react'

import { mockActivity, type MockActivity } from '@/lib/work/mock/data'

const icons: Record<MockActivity['icon'], ElementType> = {
  payment: CreditCard,
  check: Check,
  branch: GitBranch,
  file: FileText,
}

/** Recent activity feed. Backed by `activity_logs` from Phase 24. */
export function ActivityList({ items = mockActivity }: { items?: MockActivity[] }) {
  return (
    <div className="activity-list">
      {items.map((item) => {
        const Icon = icons[item.icon]
        return (
          <div key={item.title + item.detail}>
            <span className={`activity-icon ${item.tone}`}>
              <Icon size={15} />
            </span>
            <p>
              <strong>{item.title}</strong>
              <small>{item.detail}</small>
            </p>
            <time>{item.time}</time>
          </div>
        )
      })}
    </div>
  )
}
