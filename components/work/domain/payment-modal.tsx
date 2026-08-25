'use client'

import { useState } from 'react'
import {
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  LockKeyhole,
  ShieldCheck,
  X,
} from 'lucide-react'

export type PaymentMethod = 'card' | 'promptpay'

/**
 * Checkout modal. Markup and classes are unchanged from the prototype; the
 * method chooser is now actually selectable rather than hard-coded to card.
 *
 * IMPORTANT — this does not take payments. The prototype's pay button called
 * a local `showToast()` and declared success with no network call, which is
 * precisely the fake success state the brief forbids (rule #9, audit D8).
 * That is removed. `onSubmit` is owned by the caller and, from Phase 10,
 * goes through `PaymentService`; a payment only ever becomes PAID via a
 * verified Stripe webhook (docs/ARCHITECTURE.md §8).
 */
export function PaymentModal({
  title,
  projectName,
  amount,
  reference,
  onClose,
  onSubmit,
  submitting = false,
  error,
}: {
  title: string
  projectName: string
  amount: string
  reference: string
  onClose: () => void
  onSubmit?: (method: PaymentMethod) => void
  submitting?: boolean
  error?: string
}) {
  const [method, setMethod] = useState<PaymentMethod>('card')

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="payment-modal">
        <button className="close" onClick={onClose} aria-label="ปิด">
          <X size={18} />
        </button>
        <div className="modal-kicker">
          <ShieldCheck size={17} /> ชำระเงินอย่างปลอดภัย
        </div>
        <h2>{title}</h2>
        <p className="muted">ชำระเงินเพื่อปลดล็อกการส่งมอบงานและสิทธิ์เข้าถึงซอร์สโค้ด</p>
        <div className="checkout-summary">
          <span>{projectName}</span>
          <strong>{amount}</strong>
          <small>{reference}</small>
        </div>
        <label className="field-label">วิธีการชำระเงิน</label>
        <button
          type="button"
          className={`method ${method === 'card' ? 'selected' : ''}`}
          onClick={() => setMethod('card')}
        >
          <CreditCard size={18} />
          <span>
            <strong>บัตรเครดิต/เดบิต</strong>
            <small>ประมวลผลอย่างปลอดภัยโดย Stripe</small>
          </span>
          {method === 'card' && <CheckCircle2 size={18} />}
        </button>
        <button
          type="button"
          className={`method ${method === 'promptpay' ? 'selected' : ''}`}
          onClick={() => setMethod('promptpay')}
        >
          <span className="promptpay">P</span>
          <span>
            <strong>Bank / PromptPay</strong>
            <small>ชำระผ่านแอปธนาคารของคุณ</small>
          </span>
          {method === 'promptpay' && <CheckCircle2 size={18} />}
        </button>
        {error && <p className="payment-error">{error}</p>}
        <button
          className="primary full"
          disabled={submitting || !onSubmit}
          onClick={() => onSubmit?.(method)}
        >
          {submitting ? 'กำลังดำเนินการ…' : 'ชำระเงินอย่างปลอดภัย'} <ArrowUpRight size={16} />
        </button>
        <p className="secure-note">
          <LockKeyhole size={13} /> ข้อมูลการชำระเงินของคุณถูกเข้ารหัส
        </p>
      </div>
    </div>
  )
}
