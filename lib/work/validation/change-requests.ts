import { z } from './zod'

import { CHANGE_REQUEST_PRIORITIES } from '@/lib/work/types/enums'

const uuid = z.string().uuid('รหัสไม่ถูกต้อง')

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => (value ? value : null))

/**
 * Baht in, satang out — the same integer-safe conversion the rest of the money
 * code uses. A price typed as 1500 is stored as 150000, and no floating-point
 * baht ever exists.
 */
const bahtOptional = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? Math.round(Number(value) * 100) : null))
  .refine(
    (value) => value === null || (Number.isFinite(value) && value >= 0),
    'จำนวนเงินไม่ถูกต้อง',
  )

export const changeRequestPrioritySchema = z.enum(CHANGE_REQUEST_PRIORITIES, {
  message: 'ระดับความสำคัญไม่ถูกต้อง',
})

/**
 * The review decision, as recorded by staff.
 *
 * Note what is NOT here: `status`. Status moves only through the named actions
 * (startChangeRequestReview / quote / approve / reject / requestMoreInformation
 * / start / complete / cancel), each of which calls
 * `assertValidChangeRequestTransition` first. A form field that set status
 * directly would route around the entire state machine.
 *
 * Also not here: `title` and `description`. Those are the CLIENT'S words and
 * staff never edit them — what the team agreed to do goes in `agreedScope`,
 * beside the request rather than on top of it.
 */
const reviewFields = {
  agreedScope: optionalText(4000, 'ขอบเขตที่ตกลงยาวเกินไป'),
  decisionReason: optionalText(2000, 'เหตุผลยาวเกินไป'),
  estimatedAmount: bahtOptional,
  impactDays: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? Math.round(Number(value)) : null))
    .refine(
      (value) => value === null || (Number.isFinite(value) && value >= 0 && value <= 3650),
      'จำนวนวันไม่ถูกต้อง',
    ),
  workMilestoneId: uuid.optional().or(z.literal('')).transform((v) => (v ? v : null)),
  priority: changeRequestPrioritySchema.optional(),
}

/** Staff recording their assessment without yet deciding. */
export const reviewChangeRequestSchema = z.object({
  projectId: uuid,
  requestId: uuid,
  ...reviewFields,
})
export type ReviewChangeRequestInput = z.infer<typeof reviewChangeRequestSchema>

/**
 * Approving. `agreedScope` is REQUIRED here and nowhere else: approving a
 * change without saying what was approved leaves the team and the client with
 * two different ideas of what happens next, which is the single most expensive
 * failure mode this whole flow exists to prevent.
 */
export const approveChangeRequestSchema = z.object({
  projectId: uuid,
  requestId: uuid,
  agreedScope: z
    .string()
    .trim()
    .min(5, 'กรุณาระบุขอบเขตงานที่ตกลง')
    .max(4000, 'ขอบเขตที่ตกลงยาวเกินไป'),
  estimatedAmount: bahtOptional,
  impactDays: reviewFields.impactDays,
  workMilestoneId: reviewFields.workMilestoneId,
})
export type ApproveChangeRequestInput = z.infer<typeof approveChangeRequestSchema>

/** Rejecting, or asking for more information. The reason is required for both. */
export const declineChangeRequestSchema = z.object({
  projectId: uuid,
  requestId: uuid,
  decisionReason: z
    .string()
    .trim()
    .min(5, 'กรุณาระบุเหตุผล')
    .max(2000, 'เหตุผลยาวเกินไป'),
})
export type DeclineChangeRequestInput = z.infer<typeof declineChangeRequestSchema>

/** Every other status-moving action shares this shape. */
export const changeRequestActionSchema = z.object({ projectId: uuid, requestId: uuid })
export type ChangeRequestActionInput = z.infer<typeof changeRequestActionSchema>
