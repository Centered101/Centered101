import { z } from './zod'

import { MAINTENANCE_BILLING_CYCLES, MAINTENANCE_STATUSES } from '@/lib/work/types/enums'

const uuid = z.string().uuid('รหัสไม่ถูกต้อง')

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => (value ? value : null))

const dateString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : null))
  .refine(
    (value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value),
    'รูปแบบวันที่ไม่ถูกต้อง',
  )

/** Baht in, satang out — integer-only, like every other money field. */
const bahtRequired = z
  .string()
  .trim()
  .transform((value) => Math.round(Number(value || 0) * 100))
  .refine((value) => Number.isFinite(value) && value >= 0, 'ราคาไม่ถูกต้อง')

export const maintenanceStatusSchema = z.enum(MAINTENANCE_STATUSES, {
  message: 'สถานะไม่ถูกต้อง',
})
export const maintenanceBillingCycleSchema = z.enum(MAINTENANCE_BILLING_CYCLES, {
  message: 'รอบการเรียกเก็บไม่ถูกต้อง',
})

/**
 * A maintenance PLAN — what is billed, and on what cycle.
 *
 * `status` is not here: it moves through `setMaintenanceStatus`, so pausing or
 * cancelling a plan is a named action with its own audit entry rather than a
 * side effect of editing a price. `cancelled_at` is written by the server when
 * that action cancels, never from a form.
 */
const planFields = {
  name: z.string().trim().min(1, 'กรุณากรอกชื่อแผน').max(200, 'ชื่อยาวเกินไป'),
  billingCycle: maintenanceBillingCycleSchema,
  priceAmount: bahtRequired,
  /** Free-text service lines, posted as JSON from the form's row editor. */
  services: z
    .string()
    .transform((value) => {
      try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    })
    .pipe(z.array(z.string().trim().min(1).max(200)).max(50, 'รายการบริการมากเกินไป')),
  startedOn: dateString,
  nextBillingDate: dateString,
}

export const createMaintenancePlanSchema = z.object({ projectId: uuid, ...planFields })
export type CreateMaintenancePlanInput = z.infer<typeof createMaintenancePlanSchema>

export const updateMaintenancePlanSchema = z.object({
  projectId: uuid,
  planId: uuid,
  ...planFields,
})
export type UpdateMaintenancePlanInput = z.infer<typeof updateMaintenancePlanSchema>

export const setMaintenanceStatusSchema = z.object({
  projectId: uuid,
  planId: uuid,
  status: maintenanceStatusSchema,
})
export type SetMaintenanceStatusInput = z.infer<typeof setMaintenanceStatusSchema>

/**
 * A maintenance RECORD — what was actually done.
 *
 * `performedBy` is not here: it is the authenticated user. A form field would
 * let one person record work in another's name, and this is the row a client
 * reads when asking what their monthly fee bought.
 */
export const createMaintenanceRecordSchema = z.object({
  projectId: uuid,
  planId: uuid.optional().or(z.literal('')).transform((v) => (v ? v : null)),
  title: z.string().trim().min(1, 'กรุณากรอกหัวข้อ').max(200, 'หัวข้อยาวเกินไป'),
  description: optionalText(4000, 'รายละเอียดยาวเกินไป'),
  performedOn: dateString,
  minutesSpent: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? Math.round(Number(value)) : null))
    .refine(
      (value) => value === null || (Number.isFinite(value) && value >= 0 && value <= 100000),
      'จำนวนนาทีไม่ถูกต้อง',
    ),
})
export type CreateMaintenanceRecordInput = z.infer<typeof createMaintenanceRecordSchema>

export const maintenanceRecordActionSchema = z.object({ projectId: uuid, recordId: uuid })
export type MaintenanceRecordActionInput = z.infer<typeof maintenanceRecordActionSchema>
