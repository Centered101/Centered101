import { z } from './zod'

const uuid = z.string().uuid('รหัสไม่ถูกต้อง')

const dateString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), 'รูปแบบวันที่ไม่ถูกต้อง')

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => (value ? value : null))

/**
 * A work milestone as created or edited by staff.
 *
 * Note what is NOT here: `status`, `completedAt`, `clientReviewStatus`. Status
 * only ever moves through the named transition actions
 * (startWorkMilestone / submitForReview / complete / cancel), which check
 * `assertValidWorkTransition` first — a form field that could set status
 * directly would route around the entire state machine.
 *
 * `paymentMilestoneId` is an optional LINK, never a merge: the work milestone
 * records that it bills against that payment milestone, and nothing about
 * either one's status follows from the other.
 */
const workMilestoneFields = {
  title: z.string().trim().min(1, 'กรุณากรอกชื่อไมล์สโตน').max(200, 'ชื่อยาวเกินไป'),
  description: optionalText(2000, 'รายละเอียดยาวเกินไป'),
  // Free text on purpose (migration 0038): the brief's phases are defaults a
  // project may rename or ignore, so this is not constrained to a list.
  phase: optionalText(80, 'ชื่อเฟสยาวเกินไป'),
  startDate: dateString,
  dueDate: dateString,
  responsibleId: uuid.optional().or(z.literal('')).transform((v) => (v ? v : null)),
  paymentMilestoneId: uuid.optional().or(z.literal('')).transform((v) => (v ? v : null)),
  clientReviewRequired: z
    .union([z.literal('on'), z.literal('true'), z.literal(null), z.undefined()])
    .transform((value) => value === 'on' || value === 'true'),
  notes: optionalText(2000, 'บันทึกยาวเกินไป'),
}

const datesOrdered = (value: { startDate: string | null; dueDate: string | null }) =>
  !value.startDate || !value.dueDate || value.startDate <= value.dueDate

export const createWorkMilestoneSchema = z
  .object({ projectId: uuid, ...workMilestoneFields })
  .refine(datesOrdered, { message: 'วันเริ่มต้องไม่หลังวันครบกำหนด', path: ['dueDate'] })
export type CreateWorkMilestoneInput = z.infer<typeof createWorkMilestoneSchema>

export const updateWorkMilestoneSchema = z
  .object({ projectId: uuid, milestoneId: uuid, ...workMilestoneFields })
  .refine(datesOrdered, { message: 'วันเริ่มต้องไม่หลังวันครบกำหนด', path: ['dueDate'] })
export type UpdateWorkMilestoneInput = z.infer<typeof updateWorkMilestoneSchema>

/** Reorder: the full ordered list of milestone ids, as the UI now shows them. */
export const reorderWorkMilestonesSchema = z.object({
  projectId: uuid,
  milestoneIds: z
    .string()
    .transform((value) => {
      try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    })
    .pipe(z.array(uuid).min(1, 'ไม่มีไมล์สโตนให้จัดเรียง').max(200))
    .refine((ids) => new Set(ids).size === ids.length, 'รายการซ้ำกัน'),
})
export type ReorderWorkMilestonesInput = z.infer<typeof reorderWorkMilestonesSchema>

/** Every status-moving staff action shares this shape. */
export const workMilestoneActionSchema = z.object({
  projectId: uuid,
  milestoneId: uuid,
})
export type WorkMilestoneActionInput = z.infer<typeof workMilestoneActionSchema>

/**
 * Completing a milestone. `overrideReason` is required ONLY when closing a
 * review-required milestone the client has not approved — checked in
 * completeWorkMilestone, which knows the row; the schema only carries it.
 */
export const completeWorkMilestoneSchema = z.object({
  projectId: uuid,
  milestoneId: uuid,
  overrideReason: optionalText(1000, 'เหตุผลยาวเกินไป'),
})
export type CompleteWorkMilestoneInput = z.infer<typeof completeWorkMilestoneSchema>

/** The client approving. A note is optional here — approval needs no defence. */
export const approveWorkMilestoneSchema = z.object({
  projectId: uuid,
  milestoneId: uuid,
  note: optionalText(2000, 'ข้อความยาวเกินไป'),
})
export type ApproveWorkMilestoneInput = z.infer<typeof approveWorkMilestoneSchema>

/**
 * The client asking for changes. The message IS required (§8) — "request
 * changes" with nothing said is a milestone nobody can act on.
 */
export const requestWorkMilestoneChangesSchema = z.object({
  projectId: uuid,
  milestoneId: uuid,
  message: z
    .string()
    .trim()
    .min(5, 'กรุณาอธิบายสิ่งที่ต้องการให้แก้ไข')
    .max(2000, 'ข้อความยาวเกินไป'),
})
export type RequestWorkMilestoneChangesInput = z.infer<typeof requestWorkMilestoneChangesSchema>

/**
 * A client asking for a timeline change (§16). Deliberately NOT a write to
 * project_work_milestones — it opens a `change_requests` row, the existing
 * infrastructure, so a request that turns out to affect price or scope is
 * already in the workflow that prices those.
 */
export const requestTimelineChangeSchema = z.object({
  projectId: uuid,
  /** Which milestone prompted it, if any — recorded in the title for context. */
  milestoneId: uuid.optional().or(z.literal('')).transform((v) => (v ? v : null)),
  title: z.string().trim().min(1, 'กรุณากรอกหัวข้อ').max(200, 'หัวข้อยาวเกินไป'),
  description: z
    .string()
    .trim()
    .min(5, 'กรุณาอธิบายสิ่งที่ต้องการเปลี่ยนแปลง')
    .max(2000, 'ข้อความยาวเกินไป'),
})
export type RequestTimelineChangeInput = z.infer<typeof requestTimelineChangeSchema>
