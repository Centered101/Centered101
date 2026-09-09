import 'server-only'

import { createClient } from '@/lib/work/supabase/server'
import type { PricingItemKind } from '@/lib/work/types/enums'
import { unwrapOr } from './internal'

export type PricingItem = {
  id: string
  kind: PricingItemKind
  name: string
  description: string | null
  quantity: number
  unitAmount: number
  amount: number
  sortOrder: number
}

export type PricingTotals = {
  subtotal: number
  discountTotal: number
  /** Subtotal minus discount — what VAT, if any, is calculated on. */
  taxableAmount: number
  vatEnabled: boolean
  /** Basis points, e.g. 700 = 7.00%. */
  vatRateBp: number
  vatAmount: number
  /** taxableAmount + vatAmount — what `projects.total_amount` is kept equal to (migration 0019). */
  grandTotal: number
  currency: string
}

/** Every pricing line item on a project, in display order. RLS-scoped — a client sees exactly what they are being charged. */
export async function getPricingItems(projectId: string): Promise<PricingItem[]> {
  const supabase = await createClient()

  const result = await supabase
    .from('project_pricing_items')
    .select('id, kind, name, description, quantity, unit_amount, amount, sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  const rows = unwrapOr<
    {
      id: string
      kind: PricingItemKind
      name: string
      description: string | null
      quantity: number
      unit_amount: number
      amount: number
      sort_order: number
    }[]
  >(result, 'รายการราคา', [])

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    name: row.name,
    description: row.description,
    quantity: row.quantity,
    unitAmount: row.unit_amount,
    amount: row.amount,
    sortOrder: row.sort_order,
  }))
}

/**
 * Subtotal / discount / VAT / grand total for a project, from the
 * `project_pricing_totals` view (migration 0007, extended by 0019 for VAT).
 * `security_invoker` on that view means this read is RLS-scoped exactly like
 * every other query here — it cannot be used to learn totals for a project
 * the caller may not read.
 */
export async function getPricingTotals(projectId: string): Promise<PricingTotals> {
  const supabase = await createClient()

  type TotalsRow = {
    subtotal: number
    discount_total: number
    taxable_amount: number
    vat_enabled: boolean
    vat_rate_bp: number
    vat_amount: number
    grand_total: number
    currency: string
  }

  const result = await supabase
    .from('project_pricing_totals')
    .select('subtotal, discount_total, taxable_amount, vat_enabled, vat_rate_bp, vat_amount, grand_total, currency')
    .eq('project_id', projectId)
    .maybeSingle<TotalsRow>()

  const row = unwrapOr<TotalsRow | null>(result, 'ยอดรวมราคา', null)

  return {
    subtotal: row?.subtotal ?? 0,
    discountTotal: row?.discount_total ?? 0,
    taxableAmount: row?.taxable_amount ?? 0,
    vatEnabled: row?.vat_enabled ?? false,
    vatRateBp: row?.vat_rate_bp ?? 700,
    vatAmount: row?.vat_amount ?? 0,
    grandTotal: row?.grand_total ?? 0,
    currency: row?.currency ?? 'THB',
  }
}
