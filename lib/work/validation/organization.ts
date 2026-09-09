import { z } from './zod'

/**
 * Workspace (organization) settings.
 *
 * Only the name is editable from the UI. `slug` and `currency` are set once at
 * creation and changing either has consequences the settings form does not
 * cover — a slug is referenced by share links, a currency by every existing
 * quotation — so neither has a field here.
 */
export const renameOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'ชื่อพื้นที่ทำงานสั้นเกินไป')
    .max(80, 'ชื่อพื้นที่ทำงานยาวเกินไป'),
})

export type RenameOrganizationInput = z.infer<typeof renameOrganizationSchema>
