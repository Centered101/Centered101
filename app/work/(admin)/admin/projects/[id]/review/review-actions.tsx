'use client'

import { useActionState, useState } from 'react'

import { SubmitButton, useActionToast } from '@/components/work/forms'
import {
  approveForQuotation,
  rejectProject,
  requestMoreInformation,
  startReviewingProject,
} from '@/lib/work/services/projects'
import type { ActionState } from '@/lib/work/services/projects'
import type { ProjectStatus } from '@/lib/work/types/enums'

const REVIEW_STATES: readonly ProjectStatus[] = ['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_INFORMATION']

/**
 * The three review decisions (docs/ADMIN_PROJECT_REVIEW.md §5), each its
 * own server action with its own transition check
 * (lib/work/auth/project-status.ts) — not one generic "decision" dropdown,
 * so each one's own required field (a note for "needs info", a reason for
 * "reject") is validated by the form that actually needs it.
 */
export function ReviewActions({
  projectId,
  currentStatus,
}: {
  projectId: string
  currentStatus: ProjectStatus
}) {
  const [approveState, approveAction] = useActionState<ActionState, FormData>(approveForQuotation, {})
  useActionToast(approveState)
  const [infoState, infoAction] = useActionState<ActionState, FormData>(requestMoreInformation, {})
  useActionToast(infoState)
  const [rejectState, rejectAction] = useActionState<ActionState, FormData>(rejectProject, {})
  useActionToast(rejectState)
  const [startState, startAction] = useActionState<ActionState, FormData>(startReviewingProject, {})
  useActionToast(startState)

  const [note, setNote] = useState('')
  const [reason, setReason] = useState('')
  const [showReject, setShowReject] = useState(false)

  if (!REVIEW_STATES.includes(currentStatus)) {
    return <p className="muted">คำขอนี้ผ่านการตรวจสอบไปแล้ว</p>
  }

  return (
    <div className="work-form">
      {currentStatus === 'SUBMITTED' && (
        <form action={startAction}>
          <input type="hidden" name="projectId" value={projectId} />
          <SubmitButton pendingLabel="กำลังเริ่ม...">เริ่มตรวจสอบ</SubmitButton>
        </form>
      )}

      <form action={approveAction}>
        <input type="hidden" name="projectId" value={projectId} />
        <SubmitButton pendingLabel="กำลังอนุมัติ...">อนุมัติให้เสนอราคา</SubmitButton>
        {approveState.error && <p className="field-error">{approveState.error}</p>}
      </form>

      <label className="full">
        <span>คำถาม/ข้อมูลที่ต้องการเพิ่มเติม (จำเป็นสำหรับ &ldquo;ขอข้อมูลเพิ่มเติม&rdquo;)</span>
        <textarea
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="เช่น ขอโดเมนที่ต้องการและจำนวนหน้าสินค้าที่ต้องการ"
        />
      </label>
      <form action={infoAction}>
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="note" value={note} />
        <SubmitButton variant="outline" pendingLabel="กำลังส่ง...">
          ขอข้อมูลเพิ่มเติม
        </SubmitButton>
        {infoState.error && <p className="field-error">{infoState.error}</p>}
      </form>

      {!showReject ? (
        <button type="button" className="text-btn danger" onClick={() => setShowReject(true)}>
          ปฏิเสธคำขอ
        </button>
      ) : (
        <>
          <label className="full">
            <span>เหตุผลในการปฏิเสธ (จำเป็น)</span>
            <textarea
              rows={2}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="ระบุเหตุผลที่ปฏิเสธคำขอนี้"
            />
          </label>
          <form action={rejectAction}>
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="reason" value={reason} />
            <SubmitButton variant="outline" pendingLabel="กำลังปฏิเสธ...">
              ยืนยันการปฏิเสธ
            </SubmitButton>
            {rejectState.error && <p className="field-error">{rejectState.error}</p>}
          </form>
        </>
      )}
    </div>
  )
}
