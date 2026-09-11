'use server'

import { revalidatePath } from 'next/cache'
import { unstable_rethrow } from 'next/navigation'

import { requireProjectPricing } from '@/lib/work/auth/permissions'
import { createClient } from '@/lib/work/supabase/server'
import { isNetworkError } from '@/lib/work/supabase/errors'
import { pricingItemSchema } from '@/lib/work/validation/pricing'
import { logActivity } from './activity'

export type PricingActionState = {
  error?: string
  message?: string
  fieldErrors?: Record<string, string>
}

const NETWORK_MESSAGE = 'ติดต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง'

/**
 * Every action below runs its body inside this. `requireProjectPricing`
 * throws to redirect/notFound on a real refusal — `unstable_rethrow` lets
 * that control-flow exception straight through — and everything past it can
 * throw a raw `TypeError: fetch failed` on a dropped connection to Supabase
 * (auth revalidation, the query itself) rather than the `{ error }` result
 * these actions normally return. Left uncaught, that becomes a 500 whose body
 * the client cannot parse: React shows "An unexpected response was received
 * from the server." instead of a toast, on a page that otherwise still works.
 * See `isNetworkError`.
 */
async function guard(
  fallbackMessage: string,
  run: () => Promise<PricingActionState>,
): Promise<PricingActionState> {
  try {
    return await run()
  } catch (error) {
    unstable_rethrow(error)
    console.error('[pricing] action threw:', error)
    return { error: isNetworkError(error) ? NETWORK_MESSAGE : fallbackMessage }
  }
}

function fieldErrorsFrom(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '')
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return fieldErrors
}

/**
 * Every action here is `requireProjectPricing`, not `requireProjectManage` —
 * pricing is money. RLS backs this independently: `pricing_insert_finance`
 * (migration 0007, staff managers/accountants) OR `pricing_insert_owner`
 * (migration 0025b, a self-serve project's OWNER) — two separate permissive
 * policies, either one admits the write, and `requireProjectPricing` is the
 * app-layer guard that matches both. Explicitly NOT `requireProjectFinance`:
 * that one stays payments/payment-plans-only, staff-only, untouched.
 * `projects.total_amount` is never written here: the database trigger from
 * migration 0019 (guarded further by 0023) recomputes it the moment a row
 * changes underneath it.
 */
export async function addPricingItem(
  _prev: PricingActionState,
  formData: FormData,
): Promise<PricingActionState> {
  const projectId = String(formData.get('projectId') ?? '')

  return guard('ไม่สามารถเพิ่มรายการราคาได้ กรุณาลองใหม่อีกครั้ง', async () => {
    const access = await requireProjectPricing(projectId)

    const parsed = pricingItemSchema.safeParse({
      kind: formData.get('kind'),
      name: formData.get('name'),
      quantity: formData.get('quantity'),
      unitAmount: formData.get('unitAmount'),
    })
    if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) }

    const supabase = await createClient()
    const { error } = await supabase.from('project_pricing_items').insert({
      project_id: projectId,
      kind: parsed.data.kind,
      name: parsed.data.name,
      quantity: parsed.data.quantity,
      unit_amount: parsed.data.unitAmount,
      created_by: access.userId,
    })

    if (error) {
      console.error('[pricing] add failed:', error)
      return { error: 'ไม่สามารถเพิ่มรายการราคาได้ กรุณาลองใหม่อีกครั้ง' }
    }

    await logActivity({
      organizationId: access.organizationId,
      action: 'pricing_item.added',
      entityType: 'pricing_item',
      projectId,
      metadata: { name: parsed.data.name, kind: parsed.data.kind },
    })

    revalidatePath(`/work/admin/projects/${projectId}`)
    revalidatePath(`/work/portal/projects/${projectId}`)
    revalidatePath('/work/admin/projects')
    revalidatePath('/work/admin/dashboard')

    return { message: 'เพิ่มรายการราคาแล้ว' }
  })
}

export async function updatePricingItem(
  _prev: PricingActionState,
  formData: FormData,
): Promise<PricingActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const itemId = String(formData.get('itemId') ?? '')

  return guard('ไม่สามารถบันทึกรายการราคาได้ กรุณาลองใหม่อีกครั้ง', async () => {
    await requireProjectPricing(projectId)

    const parsed = pricingItemSchema.safeParse({
      kind: formData.get('kind'),
      name: formData.get('name'),
      quantity: formData.get('quantity'),
      unitAmount: formData.get('unitAmount'),
    })
    if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) }

    const supabase = await createClient()
    const { error } = await supabase
      .from('project_pricing_items')
      .update({
        kind: parsed.data.kind,
        name: parsed.data.name,
        quantity: parsed.data.quantity,
        unit_amount: parsed.data.unitAmount,
      })
      .eq('id', itemId)
      .eq('project_id', projectId)

    if (error) {
      console.error('[pricing] update failed:', error)
      return { error: 'ไม่สามารถบันทึกรายการราคาได้ กรุณาลองใหม่อีกครั้ง' }
    }

    revalidatePath(`/work/admin/projects/${projectId}`)
    revalidatePath(`/work/portal/projects/${projectId}`)
    revalidatePath('/work/admin/projects')
    revalidatePath('/work/admin/dashboard')

    return { message: 'บันทึกรายการราคาแล้ว' }
  })
}

export async function removePricingItem(
  _prev: PricingActionState,
  formData: FormData,
): Promise<PricingActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const itemId = String(formData.get('itemId') ?? '')

  return guard('ไม่สามารถลบรายการราคาได้ กรุณาลองใหม่อีกครั้ง', async () => {
    await requireProjectPricing(projectId)

    const supabase = await createClient()
    const { error } = await supabase
      .from('project_pricing_items')
      .delete()
      .eq('id', itemId)
      .eq('project_id', projectId)

    if (error) {
      console.error('[pricing] remove failed:', error)
      return { error: 'ไม่สามารถลบรายการราคาได้ กรุณาลองใหม่อีกครั้ง' }
    }

    revalidatePath(`/work/admin/projects/${projectId}`)
    revalidatePath(`/work/portal/projects/${projectId}`)
    revalidatePath('/work/admin/projects')
    revalidatePath('/work/admin/dashboard')

    return { message: 'ลบรายการราคาแล้ว' }
  })
}

/**
 * Turns VAT on or off for a project, and sets its rate.
 *
 * Writes `projects.vat_enabled` / `vat_rate_bp` directly — `total_amount` is
 * never touched here, because `projects_sync_total_on_vat_change` (migration
 * 0019) recomputes it the instant either column changes, the same way the
 * pricing-item triggers do for a line item.
 */
export async function updateVatSettings(
  _prev: PricingActionState,
  formData: FormData,
): Promise<PricingActionState> {
  const projectId = String(formData.get('projectId') ?? '')

  return guard('ไม่สามารถบันทึกการตั้งค่า VAT ได้ กรุณาลองใหม่อีกครั้ง', async () => {
    await requireProjectPricing(projectId)

    const vatEnabled = formData.get('vatEnabled') === 'on'
    const vatRatePercent = Number(formData.get('vatRatePercent') ?? 7)
    if (!Number.isFinite(vatRatePercent) || vatRatePercent < 0 || vatRatePercent > 100) {
      return { error: 'อัตรา VAT ต้องอยู่ระหว่าง 0–100%' }
    }
    const vatRateBp = Math.round(vatRatePercent * 100)

    const supabase = await createClient()
    const { error } = await supabase
      .from('projects')
      .update({ vat_enabled: vatEnabled, vat_rate_bp: vatRateBp })
      .eq('id', projectId)

    if (error) {
      console.error('[pricing] vat settings update failed:', error)
      return { error: 'ไม่สามารถบันทึกการตั้งค่า VAT ได้ กรุณาลองใหม่อีกครั้ง' }
    }

    revalidatePath(`/work/admin/projects/${projectId}`)
    revalidatePath(`/work/portal/projects/${projectId}`)

    return { message: vatEnabled ? 'เปิดใช้ VAT แล้ว' : 'ปิดใช้ VAT แล้ว' }
  })
}
