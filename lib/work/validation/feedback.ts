import { z } from './zod'

import { FEEDBACK_KINDS } from '@/lib/work/types/enums'

/**
 * Feedback input schema.
 *
 * The numbers here are the same ones the database enforces in migration 0017
 * (`feedback_message_length`, `feedback_page_path_is_relative`) — stated twice
 * on purpose, so a too-long message comes back as a readable Thai sentence
 * next to the textarea instead of a Postgres constraint name.
 */

/** Matches `maxLength` on the textarea and the CHECK constraint on the column. */
export const FEEDBACK_MESSAGE_MAX = 2000

/**
 * The page the widget was open on.
 *
 * RELATIVE ONLY, and the refusal is deliberate rather than a sanitisation
 * step: the value arrives from the browser as a hidden field, so an absolute
 * URL in there is either a bug or an attempt to plant a link that a future
 * triage screen would render. A rejected path is not worth failing the whole
 * submission over, though — the report matters more than the breadcrumb — so
 * it drops to null instead of erroring.
 */
const pagePath = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && /^\/[^\s]*$/.test(value) ? value.slice(0, 500) : null))

export const submitFeedbackSchema = z.object({
  kind: z.enum(FEEDBACK_KINDS),
  message: z
    .string()
    .trim()
    .min(1, 'กรุณาเขียนรายละเอียดก่อนส่ง')
    .max(FEEDBACK_MESSAGE_MAX, `ข้อความยาวเกิน ${FEEDBACK_MESSAGE_MAX} ตัวอักษร`),
  pagePath,
})

/**
 * What the screenshot upload accepts.
 *
 * Mirrors `allowed_mime_types` and `file_size_limit` on the `work-feedback`
 * bucket. Checked before the upload rather than after, because Supabase
 * Storage rejects an oversized file with a message written for a developer.
 */
export const FEEDBACK_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const
export const FEEDBACK_IMAGE_MAX_BYTES = 5 * 1024 * 1024

export function describeImageRejection(file: File): string | null {
  if (!(FEEDBACK_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return 'แนบได้เฉพาะรูปภาพ (PNG, JPG, WebP, GIF)'
  }
  if (file.size > FEEDBACK_IMAGE_MAX_BYTES) {
    return 'ไฟล์ใหญ่เกิน 5 MB'
  }
  return null
}
