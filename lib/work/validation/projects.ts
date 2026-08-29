import { z } from 'zod'

import {
  DELIVERY_METHODS,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  SOURCE_CODE_OWNERSHIPS,
} from '@/lib/work/types/enums'

/**
 * Project input schemas.
 *
 * Parsed on the server inside every action. The enum unions come from
 * `types/enums.ts`, which `npm run work:db:validate` diffs against pg_enum, so
 * a value that would be rejected by the database is rejected here first with a
 * readable message instead of a 400 from PostgREST.
 */

/**
 * Money arrives from a form as baht ("30,000" or "30000.50") and is stored as
 * satang. Doing the conversion in the schema means no action, and no
 * component, ever handles a half-converted amount.
 */
export const bahtToSatang = z
  .string()
  .trim()
  .min(1, 'กรุณากรอกราคา')
  .transform((value) => value.replace(/[,\s฿]/g, ''))
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), 'ราคาต้องเป็นตัวเลข')
  .transform((value) => Math.round(Number(value) * 100))

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : null))
  .refine(
    (value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value),
    'รูปแบบวันที่ไม่ถูกต้อง',
  )

export const createProjectSchema = z
  .object({
    clientId: z.string().uuid('กรุณาเลือกลูกค้า'),
    name: z.string().trim().min(1, 'กรุณากรอกชื่อโปรเจกต์').max(200),
    description: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .transform((value) => value || null),
    type: z.enum(PROJECT_TYPES),
    startDate: optionalDate,
    expectedDelivery: optionalDate,
    totalAmount: bahtToSatang,
    deliveryMethod: z.enum(DELIVERY_METHODS),
    sourceCodeOwnership: z.enum(SOURCE_CODE_OWNERSHIPS),
    maintenanceEnabled: z.boolean(),
  })
  // Mirrors the projects_dates_ordered CHECK constraint, so the user sees a
  // field error rather than a database rejection.
  .refine(
    (value) =>
      !value.startDate ||
      !value.expectedDelivery ||
      value.expectedDelivery >= value.startDate,
    { message: 'วันที่ส่งมอบต้องไม่ก่อนวันเริ่มงาน', path: ['expectedDelivery'] },
  )

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1, 'กรุณากรอกชื่อโปรเจกต์').max(200),
    description: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .transform((value) => value || null),
    status: z.enum(PROJECT_STATUSES),
    progress: z.coerce.number().int().min(0, 'ต้องอยู่ระหว่าง 0–100').max(100, 'ต้องอยู่ระหว่าง 0–100'),
    expectedDelivery: optionalDate,
    totalAmount: bahtToSatang,
    deliveryMethod: z.enum(DELIVERY_METHODS),
    sourceCodeOwnership: z.enum(SOURCE_CODE_OWNERSHIPS),
  })

export const createChangeRequestSchema = z.object({
  title: z.string().trim().min(1, 'กรุณากรอกหัวข้อ').max(200),
  description: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .transform((value) => value || null),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
})

export const createDeploymentSchema = z.object({
  environment: z.enum(['PREVIEW', 'STAGING', 'PRODUCTION']),
  // Real URL only. The database repeats this check; both exist because this
  // value is rendered as a link a client will click.
  url: z.string().trim().url('กรุณากรอก URL ที่ถูกต้อง').startsWith('http', 'ต้องเป็น http หรือ https'),
  version: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((value) => value || null),
  commitSha: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || null)
    .refine((value) => value === null || /^[0-9a-f]{7,40}$/.test(value), 'commit SHA ไม่ถูกต้อง'),
  notes: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((value) => value || null),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
