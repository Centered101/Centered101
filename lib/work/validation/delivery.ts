import { z } from './zod'

import { DELIVERABLE_STATUSES } from '@/lib/work/types/enums'

const uuid = z.string().uuid('รหัสไม่ถูกต้อง')

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => (value ? value : null))

export const deliverableStatusSchema = z.enum(DELIVERABLE_STATUSES, {
  message: 'สถานะการส่งมอบไม่ถูกต้อง',
})

/**
 * One agreed deliverable, as created or edited by staff.
 *
 * Note what is NOT here: `status`, `deliveredAt`, `deliveredBy`,
 * `clientRequested`.
 *
 *   - status moves only through `setDeliverableStatus`, so "mark delivered"
 *     is a named action with its own audit entry rather than a side effect of
 *     editing a title.
 *   - deliveredAt/By come from the server clock and the session. A form field
 *     for either would let a handover be backdated or attributed to a person
 *     who never performed it.
 *   - clientRequested is decided ONCE, when the row is created, from the
 *     project's actual `requested_delivery`. Letting a form set it would make
 *     "the client asked for this" something staff can assert after the fact,
 *     which is the whole thing the requested/agreed split exists to prevent.
 */
const deliverableFields = {
  itemKey: optionalText(60, 'รหัสรายการยาวเกินไป'),
  title: z.string().trim().min(1, 'กรุณากรอกชื่อรายการ').max(200, 'ชื่อยาวเกินไป'),
  description: optionalText(2000, 'รายละเอียดยาวเกินไป'),
  notes: optionalText(2000, 'บันทึกยาวเกินไป'),
  documentId: uuid.optional().or(z.literal('')).transform((v) => (v ? v : null)),
}

export const createDeliverableSchema = z.object({ projectId: uuid, ...deliverableFields })
export type CreateDeliverableInput = z.infer<typeof createDeliverableSchema>

export const updateDeliverableSchema = z.object({
  projectId: uuid,
  deliverableId: uuid,
  ...deliverableFields,
})
export type UpdateDeliverableInput = z.infer<typeof updateDeliverableSchema>

export const setDeliverableStatusSchema = z.object({
  projectId: uuid,
  deliverableId: uuid,
  status: deliverableStatusSchema,
})
export type SetDeliverableStatusInput = z.infer<typeof setDeliverableStatusSchema>

export const deliverableActionSchema = z.object({ projectId: uuid, deliverableId: uuid })
export type DeliverableActionInput = z.infer<typeof deliverableActionSchema>

/** Seeding the agreed list from the client's intake request. */
export const seedDeliverablesSchema = z.object({ projectId: uuid })
export type SeedDeliverablesInput = z.infer<typeof seedDeliverablesSchema>

/** Completing the handover: READY_FOR_DELIVERY -> DELIVERED. */
export const completeHandoverSchema = z.object({
  projectId: uuid,
  summary: optionalText(2000, 'สรุปยาวเกินไป'),
})
export type CompleteHandoverInput = z.infer<typeof completeHandoverSchema>

/**
 * The client acknowledging receipt.
 *
 * `name` and `email` are NOT taken from the form. They are read from the
 * authenticated profile in the action — a form field would let someone
 * acknowledge a handover in a colleague's name, and this row is meant to be
 * evidence. Only the optional note is the client's own text.
 */
export const acknowledgeHandoverSchema = z.object({
  projectId: uuid,
  note: optionalText(2000, 'ข้อความยาวเกินไป'),
})
export type AcknowledgeHandoverInput = z.infer<typeof acknowledgeHandoverSchema>
