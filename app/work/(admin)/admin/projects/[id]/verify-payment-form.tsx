'use client'

import { useActionState, useState } from 'react'

import { SubmitButton, useActionToast } from '@/components/work/forms'
import { verifyManualPayment } from '@/lib/work/services/payments'
import type { ActionState } from '@/lib/work/services/projects'

/**
 * Finance staff confirming a CLIENT-submitted bank transfer actually arrived
 * (docs/PAYMENT_PLAN.md §6).
 *
 * This is the human verification a Stripe signature would otherwise supply,
 * which is why it is staff-only and why the server re-checks
 * `requireProjectFinance` — a client reaches none of it. Pressing it is what
 * turns the payment PAID, settles the milestone, and (for the start payment)
 * clears the ฿250 gate.
 */
export function VerifyPaymentForm({ paymentId, reference }: { paymentId: string; reference: string | null }) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState<ActionState, FormData>(verifyManualPayment, {})
  useActionToast(state, () => setOpen(false))

  if (!open) {
    return (
      <button type="button" className="outline btn-sm" onClick={() => setOpen(true)}>
        ยืนยันการโอน
      </button>
    )
  }

  return (
    <form action={formAction} className="work-form verify-payment-form">
      <input type="hidden" name="paymentId" value={paymentId} />
      <p className="muted">
        ตรวจสอบยอดเงินเข้าบัญชีก่อนยืนยัน{reference ? ` — ลูกค้าแจ้งอ้างอิง "${reference}"` : ''}
      </p>
      <label className="full">
        <span>บันทึกการตรวจสอบ (ไม่บังคับ)</span>
        <input name="note" maxLength={1000} placeholder="เช่น ตรงกับรายการเดินบัญชี 05/09/2026" />
      </label>
      <div className="form-actions">
        <SubmitButton pendingLabel="กำลังยืนยัน...">ยืนยันว่าได้รับเงินแล้ว</SubmitButton>
        <button type="button" className="outline btn-sm" onClick={() => setOpen(false)}>
          ยกเลิก
        </button>
      </div>
    </form>
  )
}
