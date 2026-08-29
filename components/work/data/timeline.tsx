import { Check, LockKeyhole } from 'lucide-react'

import type { ProjectFeature } from '@/lib/work/queries/projects'

const STATE_BY_STATUS = {
  COMPLETED: { state: 'done', label: 'เสร็จแล้ว' },
  IN_PROGRESS: { state: 'active', label: 'กำลังดำเนินการ' },
  PLANNED: { state: 'pending', label: 'รอดำเนินการ' },
  // Rendered with the locked marker because it is out of the agreed scope, not
  // because access is withheld. Presentational only — real gating comes from
  // paid milestones, never from a marker in a list.
  OUT_OF_SCOPE: { state: 'locked', label: 'นอกขอบเขต' },
} as const

/**
 * Project timeline, built from `project_features` — the deliverables actually
 * agreed for this project, in their stored order.
 */
export function Timeline({ items }: { items: ProjectFeature[] }) {
  if (items.length === 0) {
    return <p className="muted empty-inline">ยังไม่ได้กำหนดขอบเขตงาน</p>
  }

  return (
    <div className="timeline">
      {items.map((item, i) => {
        const { state, label } = STATE_BY_STATUS[item.status]
        return (
          <div className={`timeline-item ${state}`} key={item.id}>
            <div className="timeline-marker">
              {state === 'done' ? (
                <Check size={13} />
              ) : state === 'locked' ? (
                <LockKeyhole size={12} />
              ) : (
                i + 1
              )}
            </div>
            <div>
              <strong>{item.name}</strong>
              <span>{label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
