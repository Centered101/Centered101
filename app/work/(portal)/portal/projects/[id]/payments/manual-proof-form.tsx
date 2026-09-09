'use client'

import { useActionState, useState } from 'react'

import { SubmitButton, useActionToast } from '@/components/work/forms'
import { submitManualPaymentProof } from '@/lib/work/services/payments'
import type { ActionState } from '@/lib/work/services/projects'

/**
 * "I already transferred the money for this milestone"
 * (docs/PAYMENT_PLAN.md §4/§6) — the client half of the manual-payment path.
 *
 * Submits a reference only. It does NOT name an amount (the server uses the
 * milestone's outstanding balance) and it does NOT mark anything paid: the
 * row is created PENDING and a finance-staff member has to verify the money
 * actually arrived before it becomes PAID. The copy says so plainly, because
 * a client who thinks this completed their payment is exactly the fake
 * success state the payments schema exists to prevent.
 */
export function ManualProofForm({
  projectId,
  milestoneId,
  milestoneName,
}: {
  projectId: string
  milestoneId: string
  milestoneName: string
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState<ActionState, FormData>(submitManualPaymentProof, {})
  useActionToast(state, () => setOpen(false))

  if (!open) {
    return (
      <button type="button" className="outline btn-sm" onClick={() => setOpen(true)}>
        แจ้งโอนเงิน
      </button>
    )
  }

  return (
    <form action={formAction} className="work-form manual-proof-form">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="milestoneId" value={milestoneId} />

      <p className="muted">
        แจ้งการโอนเงินสำหรับงวด &ldquo;{milestoneName}&rdquo; — ทีมงานจะตรวจสอบยอดเงินเข้าบัญชีก่อนยืนยัน
        สถานะจะยังเป็น &ldquo;รอชำระ&rdquo; จนกว่าจะตรวจสอบเสร็จ
      </p>

      <label className="full">
        <span>เลขที่อ้างอิงการโอน</span>
        <input name="reference" required maxLength={200} placeholder="เลขที่สลิป / เวลาที่โอน" />
      </label>

      <label className="full">
        <span>บันทึกเพิ่มเติม (ไม่บังคับ)</span>
        <textarea name="note" maxLength={1000} rows={2} placeholder="เช่น โอนจากบัญชีบริษัท" />
      </label>

      <div className="form-actions">
        <SubmitButton pendingLabel="กำลังส่ง...">ส่งหลักฐานการโอน</SubmitButton>
        <button type="button" className="outline btn-sm" onClick={() => setOpen(false)}>
          ยกเลิก
        </button>
      </div>
    </form>
  )
}
