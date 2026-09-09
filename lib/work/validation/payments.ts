import { z } from './zod'

import { bahtToSatang } from './money'

/**
 * Checkout input.
 *
 * Note what the browser is NOT trusted with: the amount and the currency. Both
 * are re-read from the milestone row on the server, because a form field that
 * named its own price is a form field that gets paid ฿1 for a ฿50,000
 * milestone. The client picks WHICH milestone and HOW to pay, and nothing else.
 */

const uuid = z.string().uuid('รหัสไม่ถูกต้อง')

export const startCheckoutSchema = z.object({
  projectId: uuid,
  milestoneId: uuid,
  method: z.enum(['CARD', 'PROMPTPAY'], {
    errorMap: () => ({ message: 'กรุณาเลือกวิธีการชำระเงิน' }),
  }),
})

export type StartCheckoutInput = z.infer<typeof startCheckoutSchema>

/**
 * A staff-recorded out-of-band payment (bank transfer, cash, other).
 *
 * `amount` IS trusted from this form, unlike the checkout above — the whole
 * point of this action is a human who has already seen money arrive (a bank
 * statement line, cash in hand) entering what they saw. There is no provider
 * to re-derive it from. That is exactly why this path is restricted to
 * finance staff and never reachable by a client (see recordManualPayment,
 * services/payments.ts): the trust this form extends is staff-only trust.
 */
export const recordManualPaymentSchema = z.object({
  projectId: uuid,
  milestoneId: uuid,
  amount: bahtToSatang,
  method: z.enum(['BANK_TRANSFER', 'CASH', 'OTHER'], {
    errorMap: () => ({ message: 'กรุณาเลือกช่องทางการชำระเงิน' }),
  }),
  reference: z
    .string()
    .trim()
    .max(200, 'อ้างอิงยาวเกินไป')
    .optional()
    .transform((value) => (value ? value : null)),
  notes: z
    .string()
    .trim()
    .max(1000, 'บันทึกยาวเกินไป')
    .optional()
    .transform((value) => (value ? value : null)),
  // Unchecked by default. The milestone's outstanding balance is the normal
  // ceiling (recordManualPayment computes it server-side, never from a form
  // field) — this only lifts that ceiling, it never supplies the number.
  allowOverpayment: z
    .union([z.literal('on'), z.literal(null), z.undefined()])
    .transform((value) => value === 'on'),
})

export type RecordManualPaymentInput = z.infer<typeof recordManualPaymentSchema>

/**
 * A CLIENT (or self-serve owner) declaring "I have transferred the money for
 * this milestone" — docs/PAYMENT_PLAN.md §4/§6.
 *
 * This creates a PENDING payment row only. It NEVER writes PAID: a staff
 * member verifies the transfer against the bank and calls verifyManualPayment,
 * which is the actual PAID writer. `amount` is NOT taken here — it is the
 * milestone's outstanding balance, computed server-side — because a client
 * naming their own amount is exactly what the payments schema exists to
 * prevent. All the client supplies is a reference (their transfer slip
 * number) and an optional note.
 */
export const submitManualPaymentProofSchema = z.object({
  projectId: uuid,
  milestoneId: uuid,
  reference: z.string().trim().min(1, 'กรุณากรอกเลขที่อ้างอิงการโอน').max(200, 'อ้างอิงยาวเกินไป'),
  note: z
    .string()
    .trim()
    .max(1000, 'บันทึกยาวเกินไป')
    .optional()
    .transform((value) => (value ? value : null)),
})
export type SubmitManualPaymentProofInput = z.infer<typeof submitManualPaymentProofSchema>

/** Finance staff confirming a client-submitted transfer actually arrived. */
export const verifyManualPaymentSchema = z.object({
  paymentId: uuid,
  note: z
    .string()
    .trim()
    .max(1000, 'บันทึกยาวเกินไป')
    .optional()
    .transform((value) => (value ? value : null)),
})
export type VerifyManualPaymentInput = z.infer<typeof verifyManualPaymentSchema>
