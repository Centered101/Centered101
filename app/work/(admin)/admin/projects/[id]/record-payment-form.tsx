'use client'

import { useActionState, useState } from 'react'

import { SubmitButton, useActionToast } from '@/components/work/forms'
import { recordManualPayment } from '@/lib/work/services/payments'
import type { ActionState } from '@/lib/work/services/projects'
import { PAYMENT_METHOD_LABELS } from '@/lib/work/format'

const OUT_OF_BAND_METHODS = ['BANK_TRANSFER', 'CASH', 'OTHER'] as const

/**
 * Record a bank-transfer / cash payment against one milestone.
 *
 * Finding B2, docs/BUSINESS_FLOW_AUDIT.md §6/§11: before this there was no
 * way to enter money that arrived outside Stripe, so its milestone could
 * never settle. This is the smallest form that closes that gap — a toggle
 * next to the milestone row, not a new page, because recording a transfer is
 * something finance staff do while looking at exactly this milestone.
 *
 * Only rendered for `canManageFinance` — see the milestones table in
 * page.tsx — and the server action re-checks that independently
 * (`requireProjectFinance`), the same belt-and-suspenders shape every
 * mutation in this app follows.
 */
export function RecordPaymentForm({
  projectId,
  milestoneId,
  milestoneName,
  defaultAmountBaht,
}: {
  projectId: string
  milestoneId: string
  milestoneName: string
  defaultAmountBaht: string
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState<ActionState, FormData>(recordManualPayment, {})
  useActionToast(state, () => setOpen(false))

  if (!open) {
    return (
      <button type="button" className="outline btn-sm" onClick={() => setOpen(true)}>
        บันทึกการชำระเงิน
      </button>
    )
  }

  return (
    <form action={formAction} className="work-form record-payment-form">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="milestoneId" value={milestoneId} />

      <p className="muted">บันทึกเงินที่ได้รับนอกระบบ Stripe สำหรับงวด &ldquo;{milestoneName}&rdquo;</p>

      <label>
        <span>จำนวนเงิน (บาท)</span>
        <input name="amount" required inputMode="decimal" defaultValue={defaultAmountBaht} />
      </label>

      <label>
        <span>ช่องทาง</span>
        <select name="method" defaultValue="BANK_TRANSFER">
          {OUT_OF_BAND_METHODS.map((method) => (
            <option key={method} value={method}>
              {PAYMENT_METHOD_LABELS[method]}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>อ้างอิง (ไม่บังคับ)</span>
        <input name="reference" maxLength={200} placeholder="เลขที่สลิปโอนเงิน / ใบเสร็จ" />
      </label>

      <label>
        <span>บันทึกเพิ่มเติม (ไม่บังคับ)</span>
        <textarea name="notes" maxLength={1000} rows={2} placeholder="เช่น โอนขาดค่าธรรมเนียมธนาคาร 20 บาท" />
      </label>

      <label className="checkbox">
        <input type="checkbox" name="allowOverpayment" />
        <span>อนุญาตให้เกินยอดคงเหลือของงวดนี้</span>
      </label>

      {state.error && <p className="field-error">{state.error}</p>}

      <div className="form-actions">
        <SubmitButton pendingLabel="กำลังบันทึก...">บันทึกการชำระเงิน</SubmitButton>
        <button type="button" className="outline btn-sm" onClick={() => setOpen(false)}>
          ยกเลิก
        </button>
      </div>
    </form>
  )
}
