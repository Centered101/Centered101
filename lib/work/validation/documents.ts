import { z } from './zod'

import { DOCUMENT_TYPES, DOCUMENT_VISIBILITIES } from '@/lib/work/types/enums'

const uuid = z.string().uuid('รหัสไม่ถูกต้อง')

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => (value ? value : null))

/**
 * Document metadata as uploaded or edited by staff.
 *
 * Note what is NOT here: `storagePath`, `fileSize`, `mimeType`,
 * `organizationId`, `createdBy`. Every one of those is decided by the server
 * from the file it actually received and the session it actually
 * authenticated — a form field for any of them would let a caller point a
 * document row at someone else's file or attribute it to another person.
 *
 * `projectId` IS here, but it is only ever the LOOKUP key: the action passes
 * it to requireProjectFinance, which decides whether this caller may write to
 * that project at all, and the organization is then read from the project row
 * rather than from the form.
 */
export const documentTypeSchema = z.enum(DOCUMENT_TYPES, { message: 'ประเภทเอกสารไม่ถูกต้อง' })
export const documentVisibilitySchema = z.enum(DOCUMENT_VISIBILITIES, {
  message: 'สิทธิ์การเข้าถึงไม่ถูกต้อง',
})

const documentFields = {
  title: z.string().trim().min(1, 'กรุณากรอกชื่อเอกสาร').max(200, 'ชื่อยาวเกินไป'),
  type: documentTypeSchema,
  // Defaults to INTERNAL when the form omits it — the safe direction, and the
  // same default the column itself carries.
  visibility: documentVisibilitySchema.optional().transform((value) => value ?? 'INTERNAL'),
  notes: optionalText(2000, 'บันทึกยาวเกินไป'),
}

export const uploadDocumentSchema = z.object({ projectId: uuid, ...documentFields })
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>

export const updateDocumentSchema = z.object({
  projectId: uuid,
  documentId: uuid,
  ...documentFields,
})
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>

/** Visibility on its own — the one-click toggle in the documents table. */
export const setDocumentVisibilitySchema = z.object({
  projectId: uuid,
  documentId: uuid,
  visibility: documentVisibilitySchema,
})
export type SetDocumentVisibilityInput = z.infer<typeof setDocumentVisibilitySchema>

export const documentActionSchema = z.object({ projectId: uuid, documentId: uuid })
export type DocumentActionInput = z.infer<typeof documentActionSchema>

// -----------------------------------------------------------------------------
// Brand
// -----------------------------------------------------------------------------
/**
 * The OFFICIAL palette (migration 0039), as edited by staff.
 *
 * A LIST of role/value pairs, never a fixed set of columns: the brief's
 * Primary / Secondary / Background are examples, and a project that needs an
 * Accent or a second Background must not require a migration to get one.
 *
 * Hex is validated to 3- or 6-digit form and upper-cased so the same colour
 * cannot appear as both `#409efe` and `#409EFE` in one palette.
 */
const hex = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^#(?:[0-9A-F]{3}|[0-9A-F]{6})$/, 'รหัสสีต้องอยู่ในรูปแบบ #RRGGBB')

export const brandColorSchema = z.object({
  role: z.string().trim().min(1, 'กรุณาระบุบทบาทของสี').max(40, 'ชื่อบทบาทยาวเกินไป'),
  hex,
})
export type BrandColor = z.infer<typeof brandColorSchema>

export const brandFontSchema = z.object({
  role: z.string().trim().min(1, 'กรุณาระบุบทบาทของฟอนต์').max(40, 'ชื่อบทบาทยาวเกินไป'),
  name: z.string().trim().min(1, 'กรุณาระบุชื่อฟอนต์').max(80, 'ชื่อฟอนต์ยาวเกินไป'),
})
export type BrandFont = z.infer<typeof brandFontSchema>

/** Parses the JSON the brand form posts. Invalid JSON becomes an empty list. */
const jsonList = <T extends z.ZodTypeAny>(item: T, max: number, message: string) =>
  z
    .string()
    .transform((value) => {
      try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    })
    .pipe(z.array(item).max(max, message))

export const saveBrandSchema = z.object({
  projectId: uuid,
  colors: jsonList(brandColorSchema, 24, 'สีมากเกินไป'),
  fonts: jsonList(brandFontSchema, 12, 'ฟอนต์มากเกินไป'),
})
export type SaveBrandInput = z.infer<typeof saveBrandSchema>

/** The stored shape of `projects.brand`. */
export type ProjectBrand = { colors: BrandColor[]; fonts: BrandFont[] }

/**
 * Reads `projects.brand` defensively. The column is plain jsonb with only an
 * "is an object" constraint, so anything could be in there — a row written
 * before this shape existed, or by hand. Never throws; an unreadable brand
 * reads as an empty one.
 */
export function parseProjectBrand(value: unknown): ProjectBrand {
  const source = (value ?? {}) as Record<string, unknown>
  const colors = brandColorSchema.array().safeParse(source.colors)
  const fonts = brandFontSchema.array().safeParse(source.fonts)
  return {
    colors: colors.success ? colors.data : [],
    fonts: fonts.success ? fonts.data : [],
  }
}
