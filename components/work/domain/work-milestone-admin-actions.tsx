'use client'

import { useActionState, useState } from 'react'

import { SubmitButton, useActionToast } from '@/components/work/forms'
import {
  blockWorkMilestone,
  cancelWorkMilestone,
  completeWorkMilestone,
  startWorkMilestone,
  submitWorkMilestoneForReview,
  type WorkMilestoneActionState,
} from '@/lib/work/services/work-milestones'
import type { WorkMilestoneItem } from '@/lib/work/queries/work-milestones'

/**
 * The staff controls on one milestone row.
 *
 * Which buttons appear is driven by the SAME transition table the server
 * enforces (lib/work/auth/work-milestone-status.ts) — but the buttons are a
 * convenience, never the rule: every action re-checks
 * `assertValidWorkTransition` and re-authorizes with `requireProjectManage`,
 * so calling one directly from a state it does not apply to still fails.
 */
export function WorkMilestoneAdminActions({ milestone }: { milestone: WorkMilestoneItem }) {
  const { status } = milestone
  const canStart = status === 'PENDING' || status === 'CHANGES_REQUESTED' || status === 'BLOCKED'
  const canSubmit = status === 'IN_PROGRESS'
  const canComplete = status === 'APPROVED' || status === 'IN_PROGRESS'
  const canBlock = status === 'PENDING' || status === 'IN_PROGRESS' || status === 'IN_REVIEW'
  const isClosed = status === 'COMPLETED' || status === 'CANCELLED'

  if (isClosed) return null

  return (
    <>
      {canStart && (
        <SimpleAction
          action={startWorkMilestone}
          milestone={milestone}
          label={status === 'PENDING' ? 'เริ่มงาน' : 'กลับมาทำต่อ'}
          pendingLabel="กำลังเริ่ม..."
        />
      )}
      {canSubmit && (
        <SimpleAction
          action={submitWorkMilestoneForReview}
          milestone={milestone}
          label={milestone.clientReviewRequired ? 'ส่งให้ลูกค้าตรวจรับ' : 'ส่งตรวจ'}
          pendingLabel="กำลังส่ง..."
        />
      )}
      {canComplete && <CompleteAction milestone={milestone} />}
      {canBlock && (
        <SimpleAction
          action={blockWorkMilestone}
          milestone={milestone}
          label="ติดปัญหา"
          pendingLabel="กำลังบันทึก..."
          variant="outline"
        />
      )}
      <SimpleAction
        action={cancelWorkMilestone}
        milestone={milestone}
        label="ยกเลิก"
        pendingLabel="กำลังยกเลิก..."
        variant="outline"
        confirm="ยกเลิกไมล์สโตนนี้? การยกเลิกไม่สามารถย้อนกลับได้"
      />
    </>
  )
}

type Action = (
  prev: WorkMilestoneActionState,
  formData: FormData,
) => Promise<WorkMilestoneActionState>

function SimpleAction({
  action,
  milestone,
  label,
  pendingLabel,
  variant = 'primary',
  confirm,
}: {
  action: Action
  milestone: WorkMilestoneItem
  label: string
  pendingLabel: string
  variant?: 'primary' | 'outline'
  confirm?: string
}) {
  const [state, formAction] = useActionState<WorkMilestoneActionState, FormData>(action, {})
  useActionToast(state)

  return (
    <form
      action={formAction}
      className="inline-action"
      // Destructive/irreversible steps ask first (§21). A plain confirm() is
      // deliberate here — it cannot be styled away, and this is exactly the
      // kind of decision that should interrupt.
      onSubmit={confirm ? (event) => { if (!window.confirm(confirm)) event.preventDefault() } : undefined}
    >
      <input type="hidden" name="projectId" value={milestone.projectId} />
      <input type="hidden" name="milestoneId" value={milestone.id} />
      <SubmitButton variant={variant} pendingLabel={pendingLabel}>
        {label}
      </SubmitButton>
    </form>
  )
}

/**
 * Completing a milestone. When the client has to sign off and has not, this
 * opens the override form instead of submitting — the reason is required by
 * the server AND by a database constraint, so the field is not decoration.
 */
function CompleteAction({ milestone }: { milestone: WorkMilestoneItem }) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState<WorkMilestoneActionState, FormData>(
    completeWorkMilestone,
    {},
  )
  useActionToast(state, () => setOpen(false))

  const needsOverride = milestone.clientReviewRequired && milestone.clientReviewStatus !== 'APPROVED'

  if (!needsOverride) {
    return (
      <form action={formAction} className="inline-action">
        <input type="hidden" name="projectId" value={milestone.projectId} />
        <input type="hidden" name="milestoneId" value={milestone.id} />
        <SubmitButton pendingLabel="กำลังปิดงาน...">ปิดงาน</SubmitButton>
      </form>
    )
  }

  if (!open) {
    return (
      <button type="button" className="outline btn-sm" onClick={() => setOpen(true)}>
        ปิดงาน (ข้ามการตรวจรับ)
      </button>
    )
  }

  return (
    <form action={formAction} className="work-form override-form">
      <input type="hidden" name="projectId" value={milestone.projectId} />
      <input type="hidden" name="milestoneId" value={milestone.id} />
      <p className="field-error">
        ไมล์สโตนนี้กำหนดให้ลูกค้าตรวจรับ แต่ลูกค้ายังไม่ได้อนุมัติ — การปิดงานตอนนี้จะถูกบันทึกเป็นการข้ามขั้นตอน
      </p>
      <label className="full">
        <span>เหตุผล (บังคับ)</span>
        <textarea name="overrideReason" required rows={2} maxLength={1000} />
      </label>
      <div className="form-actions">
        <SubmitButton pendingLabel="กำลังปิดงาน...">ยืนยันปิดงาน</SubmitButton>
        <button type="button" className="outline btn-sm" onClick={() => setOpen(false)}>
          ยกเลิก
        </button>
      </div>
    </form>
  )
}
