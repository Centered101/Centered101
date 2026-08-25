import { Check, LockKeyhole } from 'lucide-react'

import { mockTimeline, type MockTimelineItem } from '@/lib/work/mock/data'

/**
 * Project timeline.
 *
 * The `locked` state is presentational only. Real gating comes from
 * `canAccessProjectResource()` in Phase 12 — a locked marker here must never
 * be the thing that keeps a client out of a resource.
 */
export function Timeline({ items = mockTimeline }: { items?: MockTimelineItem[] }) {
  return (
    <div className="timeline">
      {items.map((item, i) => (
        <div className={`timeline-item ${item.state}`} key={item.title}>
          <div className="timeline-marker">
            {item.state === 'done' ? (
              <Check size={13} />
            ) : item.state === 'locked' ? (
              <LockKeyhole size={12} />
            ) : (
              i + 1
            )}
          </div>
          <div>
            <strong>{item.title}</strong>
            <span>{item.status}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
