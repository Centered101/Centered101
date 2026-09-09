import { AlertTriangle, Check, CircleDot, Clock3, Ban, Pause } from 'lucide-react'

import { Status } from '@/components/work/data/status'
import {
  DEADLINE_STATE_LABELS,
  WORK_MILESTONE_REVIEW_STATUS_LABELS,
  WORK_MILESTONE_STATUS_LABELS,
  deadlineStateTone,
  formatDate,
  formatMoney,
  workMilestoneDeadlineState,
  workMilestoneStatusTone,
} from '@/lib/work/format'
import type { WorkMilestoneStatus } from '@/lib/work/types/enums'
import type { WorkMilestoneItem } from '@/lib/work/queries/work-milestones'

/**
 * The project EXECUTION timeline, rendered the same way for staff and for
 * clients — one component so the two audiences cannot drift into disagreeing
 * about where the work has got to.
 *
 * Purely presentational. It shows a deadline as overdue; it never changes a
 * status because of one (docs/PROJECT_TIMELINE.md §14 — a passed date is a
 * warning, not a state transition).
 *
 * `actions` lets each caller slot in its own controls per milestone (admin
 * gets start/submit/complete, the client gets approve/request-changes)
 * without this component knowing anything about either.
 */
const MARKER_BY_STATUS: Record<WorkMilestoneStatus, { icon: typeof Check; state: string }> = {
  COMPLETED: { icon: Check, state: 'done' },
  APPROVED: { icon: Check, state: 'done' },
  IN_PROGRESS: { icon: CircleDot, state: 'active' },
  IN_REVIEW: { icon: Clock3, state: 'active' },
  CHANGES_REQUESTED: { icon: AlertTriangle, state: 'warn' },
  BLOCKED: { icon: Pause, state: 'warn' },
  CANCELLED: { icon: Ban, state: 'cancelled' },
  PENDING: { icon: CircleDot, state: 'pending' },
}

export function WorkTimeline({
  milestones,
  currency = 'THB',
  actions,
  emptyMessage = 'ยังไม่ได้กำหนดไทม์ไลน์งาน',
}: {
  milestones: WorkMilestoneItem[]
  currency?: string
  actions?: (milestone: WorkMilestoneItem) => React.ReactNode
  emptyMessage?: string
}) {
  if (milestones.length === 0) {
    return <p className="muted empty-inline">{emptyMessage}</p>
  }

  return (
    <ol className="work-timeline">
      {milestones.map((milestone) => {
        const marker = MARKER_BY_STATUS[milestone.status]
        const Icon = marker.icon
        const deadline = workMilestoneDeadlineState(milestone.dueDate, milestone.status)

        return (
          <li className={`work-timeline-item ${marker.state}`} key={milestone.id}>
            <div className="work-timeline-marker" aria-hidden="true">
              <Icon size={13} />
            </div>

            <div className="work-timeline-body">
              <div className="work-timeline-head">
                <strong>
                  {milestone.sequence}. {milestone.title}
                </strong>
                {/* Optional grouping band (migration 0038). Absent on projects
                    that never adopted phases, so it renders only when set. */}
                {milestone.phase && <span className="work-timeline-phase">{milestone.phase}</span>}
                <Status tone={workMilestoneStatusTone(milestone.status)}>
                  {WORK_MILESTONE_STATUS_LABELS[milestone.status]}
                </Status>
                {/* Only surfaced when it actually matters — a deadline that is
                    fine says nothing worth a badge. */}
                {(deadline === 'overdue' || deadline === 'due_today') && (
                  <Status tone={deadlineStateTone(deadline)}>{DEADLINE_STATE_LABELS[deadline]}</Status>
                )}
                {milestone.clientReviewRequired && (
                  <Status tone={milestone.clientReviewStatus === 'APPROVED' ? 'green' : 'orange'}>
                    {WORK_MILESTONE_REVIEW_STATUS_LABELS[milestone.clientReviewStatus]}
                  </Status>
                )}
              </div>

              {milestone.description && <p className="work-timeline-desc">{milestone.description}</p>}

              <div className="work-timeline-meta">
                {milestone.startDate && <span>เริ่มตามแผน {formatDate(milestone.startDate)}</span>}
                {/* Planned vs actual, side by side — the comparison a slipping
                    project is actually judged on. */}
                {milestone.startedAt && <span>เริ่มจริง {formatDate(milestone.startedAt)}</span>}
                {milestone.dueDate && <span>ครบกำหนด {formatDate(milestone.dueDate)}</span>}
                {milestone.responsibleName && <span>ผู้รับผิดชอบ: {milestone.responsibleName}</span>}
                {milestone.completedAt && (
                  <span>
                    เสร็จเมื่อ {formatDate(milestone.completedAt)}
                    {milestone.completedByName && ` โดย ${milestone.completedByName}`}
                  </span>
                )}
                {/* The payment link, shown as a REFERENCE. Work status and
                    payment status are separate — this says which invoice line
                    the work belongs to, not whether it has been paid. */}
                {milestone.paymentMilestoneName && (
                  <span className="work-timeline-payment-ref">
                    เกี่ยวข้องกับงวดชำระ: {milestone.paymentMilestoneName}
                    {milestone.paymentMilestoneAmount !== null &&
                      ` (${formatMoney(milestone.paymentMilestoneAmount, currency)})`}
                  </span>
                )}
              </div>

              {milestone.clientReviewNote && (
                <p className="work-timeline-note">
                  <strong>
                    {milestone.clientReviewStatus === 'CHANGES_REQUESTED'
                      ? 'ลูกค้าขอแก้ไข'
                      : 'ความเห็นจากลูกค้า'}
                    :
                  </strong>{' '}
                  {milestone.clientReviewNote}
                  {milestone.clientReviewedByName && (
                    <span className="muted"> — {milestone.clientReviewedByName}</span>
                  )}
                </p>
              )}

              {milestone.overrideReason && (
                <p className="work-timeline-note override">
                  <strong>ปิดงานโดยข้ามการตรวจรับ:</strong> {milestone.overrideReason}
                </p>
              )}

              {actions && <div className="work-timeline-actions">{actions(milestone)}</div>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
