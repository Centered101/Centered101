import { z } from './zod'

const uuid = z.string().uuid('รหัสไม่ถูกต้อง')

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => (value ? value : null))

/**
 * A URL a client will be handed as a clickable link.
 *
 * http/https ONLY, matching the DB constraint rather than trusting it: a
 * `javascript:` or `data:` URL rendered into the portal is stored XSS, and the
 * check belongs in both places so neither layer is load-bearing alone.
 */
const optionalUrl = (message = 'ต้องเป็นลิงก์ที่ขึ้นต้นด้วย http:// หรือ https://') =>
  z
    .string()
    .trim()
    .max(500, 'ลิงก์ยาวเกินไป')
    .optional()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || /^https?:\/\//i.test(value), message)

/**
 * Publishing and repository details, as edited by staff.
 *
 * NOT here, deliberately: `publishedAt`, `publishedBy`, `unpublishedAt`. Going
 * live is its own action with its own audit entry and its own actor taken from
 * the session — a form field could otherwise backdate a launch or attribute it
 * to someone who never approved it.
 *
 * Also not here: anything resembling a token, key, or environment variable.
 * The table has no column for one and this schema offers no way to smuggle one
 * in through `notes`, which is plain display text.
 */
const publishingFields = {
  repositoryUrl: optionalUrl('ลิงก์ repository ต้องขึ้นต้นด้วย http:// หรือ https://'),
  repositoryBranch: optionalText(120, 'ชื่อ branch ยาวเกินไป'),
  repositoryCommitSha: z
    .string()
    .trim()
    .toLowerCase()
    .max(40, 'commit SHA ยาวเกินไป')
    .optional()
    .transform((value) => (value ? value : null))
    .refine(
      (value) => value === null || /^[0-9a-f]{7,40}$/.test(value),
      'commit SHA ต้องเป็นเลขฐานสิบหก 7–40 ตัว',
    ),
  repositoryNotes: optionalText(2000, 'บันทึกยาวเกินไป'),
  productionUrl: optionalUrl('ลิงก์ production ต้องขึ้นต้นด้วย http:// หรือ https://'),
  previewUrl: optionalUrl('ลิงก์ preview ต้องขึ้นต้นด้วย http:// หรือ https://'),
  domain: optionalText(253, 'ชื่อโดเมนยาวเกินไป'),
  hostingProvider: optionalText(120, 'ชื่อผู้ให้บริการยาวเกินไป'),
  notes: optionalText(2000, 'บันทึกยาวเกินไป'),
}

export const savePublishingSchema = z.object({ projectId: uuid, ...publishingFields })
export type SavePublishingInput = z.infer<typeof savePublishingSchema>

/** Publish / unpublish, and the plain project reference every action needs. */
export const publishingActionSchema = z.object({ projectId: uuid })
export type PublishingActionInput = z.infer<typeof publishingActionSchema>

/**
 * Attaching a delivered source-code package.
 *
 * `documentId` names an EXISTING document the staff member already uploaded
 * through the Phase 5 document flow — this action links, it does not upload.
 * That keeps one upload path, one bucket, and one place where file type and
 * size are checked.
 */
export const attachSourceCodeSchema = z.object({
  projectId: uuid,
  documentId: uuid,
  deliveryVersion: optionalText(60, 'เวอร์ชันยาวเกินไป'),
})
export type AttachSourceCodeInput = z.infer<typeof attachSourceCodeSchema>
