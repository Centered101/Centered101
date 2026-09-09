import { z } from './zod'

import { PAYMENT_PLAN_TYPES, UNLOCKABLE_RESOURCES } from '@/lib/work/types/enums'

const uuid = z.string().uuid('รหัสไม่ถูกต้อง')

/**
 * A milestone as drafted in the plan-creation UI.
 *
 * `percentageBp` (basis points, 3000 = 30.00%) is what the form actually
 * collects — a person thinks in percentages of the total, not in baht per
 * milestone. The action converts to `amount` server-side, giving the LAST
 * milestone whatever is left after the others are rounded, so the sum always
 * equals the plan total exactly (never off by a satang from rounding down N
 * times) — see createPaymentPlan.
 */
const milestoneDraftSchema = z.object({
  name: z.string().trim().min(1, 'กรุณากรอกชื่องวด').max(200),
  description: z
    .string()
    .trim()
    .max(500, 'รายละเอียดยาวเกินไป')
    .optional()
    .transform((value) => (value ? value : null)),
  percentageBp: z.coerce.number().int().min(1, 'ต้องมากกว่า 0%').max(10000, 'ต้องไม่เกิน 100%'),
  dueDate: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), 'รูปแบบวันที่ไม่ถูกต้อง'),
  unlockRules: z.array(z.enum(UNLOCKABLE_RESOURCES)).default([]),
  /**
   * Marks the ฿250 start-payment milestone (migration 0034). Optional in the
   * payload — when nothing is flagged, createPaymentPlan treats the FIRST
   * milestone as the start payment. The derived satang amount of whichever
   * milestone this resolves to is checked against the ฿250 floor server-side.
   */
  isStart: z.coerce.boolean().optional().default(false),
})

/**
 * The whole draft plan, serialised as JSON by the client-side editor into one
 * hidden field.
 *
 * FULL_PAYMENT is just the one-milestone case: the editor sends a single
 * milestone at 10000 bp, and it doubles as the start payment. INSTALLMENT /
 * DEPOSIT_FINAL / MILESTONE / CUSTOM send N milestones summing to 100%.
 *
 * Structural guarantees that make docs/PAYMENT_PLAN.md §2's checks hold
 * without extra rules here: amounts are derived from `percentageBp` (min 1),
 * so none is negative or zero; `sequence` is assigned from array index in
 * createPaymentPlan, so ordering is dense and never duplicated; the refine
 * below forces the split to total exactly 100%, and createPaymentPlan gives
 * the last milestone the rounding remainder so satang sums to the plan total.
 */
export const createPaymentPlanSchema = z.object({
  type: z.enum(PAYMENT_PLAN_TYPES),
  milestones: z
    .string()
    .transform((value) => {
      try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    })
    .pipe(z.array(milestoneDraftSchema).min(1, 'ต้องมีอย่างน้อย 1 งวด').max(24, 'งวดมากเกินไป'))
    .refine(
      (milestones) => milestones.reduce((sum, m) => sum + m.percentageBp, 0) === 10000,
      'สัดส่วนของทุกงวดรวมกันต้องเท่ากับ 100%',
    )
    .refine(
      (milestones) => milestones.filter((m) => m.isStart).length <= 1,
      'กำหนดงวดเริ่มต้นได้เพียงงวดเดียว',
    ),
})

export type CreatePaymentPlanInput = z.infer<typeof createPaymentPlanSchema>

/** ฿250, in satang — the minimum a start-payment milestone may be (migration 0034). */
export const START_PAYMENT_MIN_SATANG = 25000

/**
 * A client (or self-serve owner) accepting the plan currently proposed on
 * their project. `name` is the person typing their name to confirm, mirrored
 * from the quotation acceptance flow.
 */
export const acceptPaymentPlanSchema = z.object({
  projectId: uuid,
  planId: uuid,
  name: z.string().trim().min(1, 'กรุณากรอกชื่อผู้ยืนยัน').max(200),
})
export type AcceptPaymentPlanInput = z.infer<typeof acceptPaymentPlanSchema>

/**
 * "Request Changes" — the client asks for a different plan instead of
 * accepting this one. Never edits the official plan; admin drafts a new
 * version in response (docs/PAYMENT_PLAN.md §9).
 */
export const requestPaymentPlanChangesSchema = z.object({
  projectId: uuid,
  /** Nullable: a client may ask before any plan has been proposed. */
  planId: uuid.optional(),
  message: z
    .string()
    .trim()
    .min(5, 'กรุณาอธิบายสิ่งที่ต้องการเปลี่ยนแปลง')
    .max(2000, 'ข้อความยาวเกินไป'),
})
export type RequestPaymentPlanChangesInput = z.infer<typeof requestPaymentPlanChangesSchema>

/** Finance staff closing a change request — either by drafting a new plan (ADDRESSED) or declining it (DISMISSED, reason required). */
export const resolvePaymentPlanChangeSchema = z
  .object({
    requestId: uuid,
    resolution: z.enum(['ADDRESSED', 'DISMISSED']),
    note: z
      .string()
      .trim()
      .max(2000, 'ข้อความยาวเกินไป')
      .optional()
      .transform((value) => (value ? value : null)),
  })
  .refine((v) => v.resolution !== 'DISMISSED' || !!v.note, {
    message: 'กรุณาระบุเหตุผลในการปฏิเสธคำขอ',
    path: ['note'],
  })
export type ResolvePaymentPlanChangeInput = z.infer<typeof resolvePaymentPlanChangeSchema>
