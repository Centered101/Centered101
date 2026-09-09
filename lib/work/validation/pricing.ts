import { z } from './zod'

import { PRICING_ITEM_KINDS } from '@/lib/work/types/enums'
import { bahtToSatang } from './money'

/**
 * Pricing item input.
 *
 * One shape, used both for a single item added from the project detail panel
 * and for each entry of the draft list a project is created with — the
 * database does not distinguish "added at creation" from "added later", and
 * neither does this schema.
 */
export const pricingItemSchema = z.object({
  kind: z.enum(PRICING_ITEM_KINDS),
  name: z.string().trim().min(1, 'กรุณากรอกชื่อรายการ').max(200),
  quantity: z.coerce.number().int().min(1, 'จำนวนต้องอย่างน้อย 1'),
  unitAmount: bahtToSatang,
})

export type PricingItemInput = z.infer<typeof pricingItemSchema>

/**
 * The draft list a project is created with, serialised as JSON by the create
 * form's client-side editor (`PricingItemsFieldset`) into one hidden field.
 * An empty or absent list is valid — a project can be created with no pricing
 * yet and priced from its detail page afterward.
 */
export const draftPricingItemsSchema = z
  .string()
  .optional()
  .transform((value) => {
    if (!value) return []
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })
  .pipe(
    z.array(
      z.object({
        kind: z.enum(PRICING_ITEM_KINDS),
        name: z.string().trim().min(1).max(200),
        quantity: z.coerce.number().int().min(1),
        // Already in baht here (the client sends a plain number, not a
        // formatted string) — converted the same way bahtToSatang does, so a
        // draft row and a row added later are stored identically.
        unitAmount: z.coerce.number().nonnegative().transform((value) => Math.round(value * 100)),
      }),
    ),
  )
