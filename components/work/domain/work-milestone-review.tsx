'use client'

import { useActionState, useState } from 'react'

import { SubmitButton, useActionToast } from '@/components/work/forms'
import {
  approveWorkMilestone,
  requestWorkMilestoneChanges,
  type WorkMilestoneActionState,
} from '@/lib/work/services/work-milestones'
import type { WorkMilestoneItem } from '@/lib/work/queries/work-milestones'

/**
 * The client's Approve / Request Changes controls on a milestone that is
 * actually waiting for them (docs/PROJECT_TIMELINE.md §8).
 *
 * Rendered only when review is required AND the milestone is IN_REVIEW —
 * and the server checks both again, so a client calling the action on any
 * other milestone gets a refusal rather than a status change. There is no
 * control here for anything else about the milestone: dates, sequence,
 * assignee and status are not editable by a client at all, and the action
 * writes a fixed set of review columns regardless of what is submitted.
 */
export function WorkMilestoneReview({ milestone }: { milestone: WorkMilestoneItem }) {
  const [mode, setMode] = useState<'idle' | 'approve' | 'changes'>('idle')

  const [approveState, approveAction] = useActionState<WorkMilestoneActionState, FormData>(
    approveWorkMilestone,
    {},
  )
  const [changeState, changeAction] = useActionState<WorkMilestoneActionState, FormData>(
    requestWorkMilestoneChanges,
    {},
  )
  useActionToast(approveState, () => setMode('idle'))
  useActionToast(changeState, () => setMode('idle'))

  const ready = milestone.clientReviewRequired && milestone.status === 'IN_REVIEW'
  if (!ready) return null

  if (mode === 'idle') {
    return (
      <div className="milestone-review-actions">
        <span className="muted">งานนี้พร้อมให้คุณตรวจรับแล้ว</span>
        <button type="button" className="primary btn-sm" onClick={() => setMode('approve')}>
          อนุมัติ
        </button>
        <button type="button" className="outline btn-sm" onClick={() => setMode('changes')}>
          ขอแก้ไข
        </button>
      </div>
    )
  }

  if (mode === 'approve') {
    return (
      <form action={approveAction} className="work-form milestone-review-form">
        <input type="hidden" name="projectId" value={milestone.projectId} />
        <input type="hidden" name="milestoneId" value={milestone.id} />
        <label className="full">
          <span>ความเห็นเพิ่มเติม (ไม่บังคับ)</span>
          <textarea name="note" rows={2} maxLength={2000} placeholder="เช่น ดีมากครับ" />
        </label>
        <div className="form-actions">
          <SubmitButton pendingLabel="กำลังอนุมัติ...">ยืนยันการอนุมัติ</SubmitButton>
          <button type="button" className="outline btn-sm" onClick={() => setMode('idle')}>
            ยกเลิก
          </button>
        </div>
      </form>
    )
  }

  return (
    <form action={changeAction} className="work-form milestone-review-form">
      <input type="hidden" name="projectId" value={milestone.projectId} />
      <input type="hidden" name="milestoneId" value={milestone.id} />
      <label className="full">
        {/* Required — §8. "Request changes" with nothing said is a milestone
            nobody can act on. */}
        <span>สิ่งที่ต้องการให้แก้ไข</span>
        <textarea
          name="message"
          required
          rows={3}
          maxLength={2000}
          placeholder="อธิบายสิ่งที่ต้องการให้ปรับแก้"
        />
      </label>
      <div className="form-actions">
        <SubmitButton pendingLabel="กำลังส่ง...">ส่งคำขอแก้ไข</SubmitButton>
        <button type="button" className="outline btn-sm" onClick={() => setMode('idle')}>
          ยกเลิก
        </button>
      </div>
    </form>
  )
}
