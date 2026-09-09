import { z } from './zod'

/**
 * Money arrives from a form as baht ("30,000" or "30000.50") and is stored as
 * satang. Doing the conversion in the schema means no action, and no
 * component, ever handles a half-converted amount.
 *
 * Shared between `projects.ts` and `pricing.ts` rather than defined in
 * either — both need it, and having one import the other for a single
 * primitive would make them circular.
 */
export const bahtToSatang = z
  .string()
  .trim()
  .min(1, 'กรุณากรอกราคา')
  .transform((value) => value.replace(/[,\s฿]/g, ''))
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), 'ราคาต้องเป็นตัวเลข')
  .transform((value) => Math.round(Number(value) * 100))
