import { z } from './zod'

import { PROJECT_ASSET_KINDS } from '@/lib/work/types/enums'

/**
 * The client intake wizard (docs/PROJECT_WORKSPACE_ARCHITECTURE.md,
 * docs/ADMIN_PROJECT_REVIEW.md §1). All of this is informational — nothing
 * here ever reaches `total_amount`, `payment_plans`, or `unlock_rules`.
 * `projects.requirements` stores the object this schema produces verbatim;
 * this file IS the shape's source of truth (migration 0030's own comment
 * points back here).
 */

const trimmedOptional = z
  .string()
  .trim()
  .max(4000)
  .optional()
  .transform((value) => (value ? value : null))

/** A textarea of one-per-line entries, e.g. required pages or reference links. */
const lineList = z
  .string()
  .trim()
  .max(4000)
  .optional()
  .transform((value) =>
    (value ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 50),
  )

export const requirementsSchema = z.object({
  goals: trimmedOptional,
  targetAudience: trimmedOptional,
  requiredFeatures: lineList,
  requiredPages: lineList,
  // Distinct from `requiredFeatures`/`technology` per
  // docs/CLIENT_PROJECT_INTAKE.md §2's explicit field list.
  integrations: lineList,
  authentication: trimmedOptional,
  adminRequirements: trimmedOptional,
  userRequirements: trimmedOptional,
  technicalRequirements: lineList,
  technology: lineList,
  referenceLinks: lineList,
  designPreferences: trimmedOptional,
  brandColors: lineList,
  fonts: lineList,
  contentAvailability: trimmedOptional,
  domainRequirements: trimmedOptional,
  notes: trimmedOptional,
})
export type RequirementsInput = z.infer<typeof requirementsSchema>

// `.nullish()`, not `.optional()`. Two callers feed this: FormData, where an
// absent field arrives as undefined, and `paymentPlanMilestoneSchema`, whose
// input is JSON.parse'd from the wizard — and a milestone with no due date
// round-trips as an explicit `null`, which `.optional()` rejects. That is what
// put a raw "Expected string, received null" under the payment step for every
// plan type except CUSTOM, making it unsubmittable. The transform below
// already normalises both to null, so accepting null costs nothing.
const dateString = z
  .string()
  .trim()
  .nullish()
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), 'รูปแบบวันที่ไม่ถูกต้อง')

export const timelineSchema = z.object({
  requestedStartDate: dateString,
  requestedDeadline: dateString,
  importantLaunchDate: dateString,
  requestedDuration: trimmedOptional,
  requestedPriority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
})

const bahtOptional = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? Math.round(Number(value) * 100) : null))
  .refine((value) => value === null || (Number.isFinite(value) && value >= 0), 'จำนวนเงินไม่ถูกต้อง')

export const budgetSchema = z
  .object({
    requestedBudgetMin: bahtOptional,
    requestedBudgetMax: bahtOptional,
    requestedBudgetPreferred: bahtOptional,
    requestedCurrency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, 'รหัสสกุลเงินไม่ถูกต้อง')
      .optional()
      .transform((value) => value ?? 'THB'),
  })
  .refine(
    (value) =>
      value.requestedBudgetMin === null ||
      value.requestedBudgetMax === null ||
      value.requestedBudgetMin <= value.requestedBudgetMax,
    { message: 'งบประมาณต่ำสุดต้องไม่มากกว่างบประมาณสูงสุด', path: ['requestedBudgetMax'] },
  )

/** The client's PROPOSED split — never written into the real payment_plans tables. */
const paymentPlanMilestoneSchema = z.object({
  name: z.string().trim().min(1).max(200),
  percentageBp: z.coerce.number().int().min(1).max(10000),
  dueDate: dateString,
})
const paymentProposalTypeSchema = z.enum(['FULL_PAYMENT', 'DEPOSIT_FINAL', 'INSTALLMENT', 'CUSTOM'])
export const paymentProposalSchema = z
  .object({
    type: paymentProposalTypeSchema,
    // CUSTOM/DISCUSS carries no firm numbers yet — "let's discuss" is
    // itself the proposal (docs/CLIENT_PROJECT_INTAKE.md §6). Every other
    // type must still sum to exactly 100%.
    milestones: z.string().transform((value) => {
      try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }),
    notes: trimmedOptional,
  })
  .transform((value, ctx) => {
    if (value.type === 'CUSTOM') return { ...value, milestones: [] }

    const parsed = z.array(paymentPlanMilestoneSchema).min(1, 'ต้องมีอย่างน้อย 1 งวด').safeParse(value.milestones)
    if (!parsed.success) {
      ctx.addIssue({ code: 'custom', message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' })
      return z.NEVER
    }
    const sum = parsed.data.reduce((total, m) => total + m.percentageBp, 0)
    if (sum !== 10000) {
      ctx.addIssue({ code: 'custom', message: 'สัดส่วนของทุกงวดรวมกันต้องเท่ากับ 100%' })
      return z.NEVER
    }
    return { ...value, milestones: parsed.data }
  })

export const DELIVERY_ITEM_KEYS = [
  'production_website',
  'source_code',
  'documentation',
  'domain_setup',
  'admin_access',
  'user_access',
  'training',
  'credentials',
  'maintenance',
] as const

const customDeliverableList = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((value) =>
    (value ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 20),
  )

export const deliverySchema = z.object({
  items: z.array(z.enum(DELIVERY_ITEM_KEYS)).max(DELIVERY_ITEM_KEYS.length),
  // Free-entry deliverables the fixed list doesn't cover — stored as plain
  // strings alongside the known keys, distinguished at read time by not
  // matching DELIVERY_ITEM_KEYS (see lib/work/format.ts's DELIVERY_ITEM_LABELS
  // fallback-to-the-string-itself behaviour).
  custom: customDeliverableList,
})

export const projectAssetKindSchema = z.enum(PROJECT_ASSET_KINDS)

export const addProjectAssetLinkSchema = z.object({
  projectId: z.string().uuid(),
  kind: projectAssetKindSchema,
  name: z.string().trim().min(1, 'กรุณาระบุชื่อ').max(200),
  externalUrl: z.string().trim().url('ลิงก์ไม่ถูกต้อง'),
  notes: trimmedOptional,
})
