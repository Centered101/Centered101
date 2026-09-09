'use server'

import { revalidatePath } from 'next/cache'

import { getWorkUrl } from '@/lib/work/auth/callback-url'
import { getUser } from '@/lib/work/auth/session'
import { requireProjectAccess, requireProjectFinance } from '@/lib/work/auth/permissions'
import { getPaymentService } from '@/lib/work/payments/service'
import type { CheckoutMethod } from '@/lib/work/payments/service'
import { advanceProjectOnStartPayment, settleMilestoneIfCovered } from '@/lib/work/payments/settle'
import { createAdminClient } from '@/lib/work/supabase/admin'
import { createClient } from '@/lib/work/supabase/server'
import type { ActionState } from '@/lib/work/services/projects'
import {
  recordManualPaymentSchema,
  startCheckoutSchema,
  submitManualPaymentProofSchema,
  verifyManualPaymentSchema,
} from '@/lib/work/validation/payments'
import { logActivity } from './activity'

/**
 * Starting a checkout — the client portal's only write path into money.
 *
 * THE ORDER OF THESE STEPS IS THE SECURITY MODEL:
 *
 *   1. `requireProjectAccess` — is this caller on this project at all.
 *   2. Read the milestone UNDER THE CALLER'S SESSION, so RLS decides whether
 *      that milestone exists for them. A milestone id belonging to another
 *      client's project comes back empty here and the request stops.
 *   3. ONLY THEN insert the `payments` row with the privileged client.
 *
 * Step 3 needs the privileged client because clients have NO insert policy on
 * `payments` (migration 0010) — deliberately, since "the checkout is created
 * by the server on their behalf" is precisely the rule. It is used to perform
 * a write the caller may not make directly, never to read a row the caller may
 * not see; every value written below was authorised by steps 1 and 2.
 *
 * The row is created BEFORE the provider is called so its id can be both the
 * provider's idempotency key and the metadata the webhook matches on. A
 * checkout that is abandoned therefore leaves a PENDING row, which is correct:
 * it is a real attempt, and it is what makes an expired session reconcilable.
 *
 * Nothing here sets PAID. Only the webhook does.
 */

export type CheckoutState = ActionState & {
  /** Where the browser must go next. The client component does the redirect. */
  url?: string
}

type MilestoneRow = {
  id: string
  name: string
  sequence: number
  amount: number
  status: string
  payment_plans: { currency: string } | null
  projects: { name: string; project_code: string } | null
}

export async function startMilestoneCheckout(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const parsed = startCheckoutSchema.safeParse({
    projectId: formData.get('projectId'),
    milestoneId: formData.get('milestoneId'),
    method: formData.get('method'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'คำขอไม่ถูกต้อง' }
  }

  const { projectId, milestoneId, method } = parsed.data
  const access = await requireProjectAccess(projectId)

  const supabase = await createClient()
  const { data: milestone } = await supabase
    .from('payment_milestones')
    .select(
      'id, name, sequence, amount, status, ' +
        'payment_plans!payment_milestones_plan_id_fkey(currency), ' +
        'projects(name, project_code)',
    )
    .eq('id', milestoneId)
    .eq('project_id', projectId)
    .maybeSingle<MilestoneRow>()

  // Same answer for "does not exist" and "not yours" — distinguishing them
  // would confirm which milestone ids are real.
  if (!milestone) {
    return { error: 'ไม่พบงวดการชำระเงินนี้' }
  }

  if (milestone.status === 'PAID') {
    return { error: 'งวดนี้ชำระเงินเรียบร้อยแล้ว' }
  }
  if (milestone.status === 'CANCELLED') {
    return { error: 'งวดนี้ถูกยกเลิกแล้ว จึงชำระเงินไม่ได้' }
  }
  if (!milestone.amount || milestone.amount <= 0) {
    return { error: 'งวดนี้ยังไม่ได้ระบุจำนวนเงิน กรุณาติดต่อทีมงาน' }
  }

  const currency = milestone.payment_plans?.currency ?? 'THB'
  const service = await getPaymentService()
  const admin = createAdminClient()

  // An already-settled payment on this milestone means the milestone status is
  // merely stale — do not open a second checkout for money already received.
  const { data: settled } = await admin
    .from('payments')
    .select('id')
    .eq('milestone_id', milestoneId)
    .eq('status', 'PAID')
    .limit(1)

  if (settled && settled.length > 0) {
    return { error: 'งวดนี้ได้รับชำระเงินแล้ว กำลังรอปรับสถานะ' }
  }

  const { data: payment, error: insertError } = await admin
    .from('payments')
    .insert({
      project_id: projectId,
      milestone_id: milestoneId,
      amount: milestone.amount,
      currency,
      status: 'PENDING',
      method,
      provider: service.provider,
      created_by: access.userId,
    })
    .select('id')
    // Typed explicitly: `database.ts` is still the permissive placeholder, so
    // rows come back as Record<string, unknown> until it is regenerated.
    .single<{ id: string }>()

  if (insertError || !payment) {
    console.error('[payments] failed to create payment row', insertError)
    return { error: 'ไม่สามารถเริ่มการชำระเงินได้ กรุณาลองใหม่อีกครั้ง' }
  }

  const user = await getUser()
  const basePath = `/portal/projects/${projectId}/payments`

  const result = await service.createCheckout({
    paymentId: payment.id,
    projectId,
    milestoneId,
    amount: milestone.amount,
    currency,
    method: method as CheckoutMethod,
    description: `${milestone.projects?.name ?? 'โปรเจกต์'} — งวด ${milestone.sequence}: ${milestone.name}`,
    customerEmail: user?.email,
    successUrl: await getWorkUrl(`${basePath}?checkout=complete`),
    cancelUrl: await getWorkUrl(`${basePath}?checkout=cancelled`),
  })

  if (!result.ok) {
    // Close the row rather than leaving a PENDING payment that never had a
    // checkout behind it. CANCELLED, not deleted: payment rows are an audit
    // trail, and "we tried and the provider refused" is worth keeping.
    await admin.from('payments').update({ status: 'CANCELLED' }).eq('id', payment.id)
    return { error: result.message }
  }

  // PROCESSING means "handed to the provider, outcome unknown" — the honest
  // state for a session that is open in another tab. Only the webhook moves it
  // on from here.
  await admin
    .from('payments')
    .update({ status: 'PROCESSING', provider_checkout_id: result.checkoutId })
    .eq('id', payment.id)

  await logActivity({
    organizationId: access.organizationId,
    action: 'payment.checkout_started',
    entityType: 'payment',
    entityId: payment.id,
    projectId,
    metadata: {
      milestoneId,
      amount: milestone.amount,
      currency,
      method,
      provider: service.provider,
    },
  })

  return { url: result.url }
}

/**
 * Records a payment that happened OUTSIDE Stripe — a bank transfer or cash
 * handed over in person — after a finance-staff member has verified it
 * themselves against a bank statement or a receipt.
 *
 * THIS IS THE ONE PLACE OUTSIDE THE WEBHOOK THAT WRITES `status = 'PAID'`,
 * and it exists on purpose, not by oversight: the webhook can only ever know
 * about money that moved through Stripe, and BUSINESS_FLOW_AUDIT.md §6/§11
 * (finding B2) is exactly this gap — a real bank transfer had no way to be
 * entered, so its milestone could never settle. It does not weaken "only
 * trusted server state marks a payment paid" — the human verification Stripe
 * would normally provide is supplied by the finance-staff member themselves,
 * which is why this is gated by `requireProjectFinance` (not
 * `requireProjectAccess`) and RLS backs it independently
 * (`payments_insert_finance`, `payment_milestones_update_finance`,
 * migrations 0009–0010): a client reaches none of this, checked in
 * PAYMENT SECURITY §11 of the same audit.
 *
 * The amount is taken from the form, unlike a Stripe checkout — there is no
 * provider row to re-derive it from, and the whole point is a person
 * recording what they saw arrive. It need not equal the milestone's full
 * amount: a partial bank transfer records as a partial PAID payment and
 * leaves the milestone open, the same as a partial Stripe payment would.
 * Settlement runs through `settleMilestoneIfCovered` — the exact function
 * the webhook uses — so "when is a milestone actually paid" has one answer
 * regardless of which path the money came through.
 */
export async function recordManualPayment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = recordManualPaymentSchema.safeParse({
    projectId: formData.get('projectId'),
    milestoneId: formData.get('milestoneId'),
    amount: formData.get('amount'),
    method: formData.get('method'),
    reference: formData.get('reference') ?? undefined,
    notes: formData.get('notes') ?? undefined,
    allowOverpayment: formData.get('allowOverpayment'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' }
  }

  const { projectId, milestoneId, amount, method, reference, notes, allowOverpayment } = parsed.data
  const access = await requireProjectFinance(projectId)

  const supabase = await createClient()

  // Read UNDER THE CALLER'S SESSION, same shape as startMilestoneCheckout:
  // RLS decides whether this milestone exists for this project under this
  // caller, so a milestone id from another project fails here, not later.
  const { data: milestone } = await supabase
    .from('payment_milestones')
    .select('id, name, sequence, amount, status, payment_plans!payment_milestones_plan_id_fkey(currency)')
    .eq('id', milestoneId)
    .eq('project_id', projectId)
    .maybeSingle<{
      id: string
      name: string
      sequence: number
      amount: number
      status: string
      payment_plans: { currency: string } | null
    }>()

  if (!milestone) {
    return { error: 'ไม่พบงวดการชำระเงินนี้' }
  }
  if (milestone.status === 'PAID') {
    return { error: 'งวดนี้ชำระเงินเรียบร้อยแล้ว' }
  }
  if (milestone.status === 'CANCELLED') {
    return { error: 'งวดนี้ถูกยกเลิกแล้ว จึงบันทึกการชำระเงินไม่ได้' }
  }
  if (amount <= 0) {
    return { error: 'จำนวนเงินต้องมากกว่า 0' }
  }

  // The outstanding balance is computed here, from the PAID payments already
  // recorded against this milestone — never accepted from the form, the same
  // reasoning `amount` itself is an exception to (a human reports what they
  // saw arrive, but not what is already owed; that this server already
  // knows). Blocks a fat-fingered ฿140,000 into a ฿14,000 milestone by
  // default; `allowOverpayment` is the explicit staff override for a
  // genuine over-payment (a client rounding up, an old outstanding balance
  // folded in) — checked, not assumed.
  const { data: existingPaid } = await supabase
    .from('payments')
    .select('amount')
    .eq('milestone_id', milestoneId)
    .eq('status', 'PAID')
  const alreadyPaid = ((existingPaid ?? []) as { amount: number }[]).reduce(
    (sum, row) => sum + (row.amount ?? 0),
    0,
  )
  const outstanding = Math.max(0, milestone.amount - alreadyPaid)

  if (amount > outstanding && !allowOverpayment) {
    return {
      error:
        `จำนวนเงิน (${(amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}) ` +
        `เกินยอดคงเหลือของงวดนี้ (${(outstanding / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}) ` +
        'หากตั้งใจบันทึกเกินยอด กรุณาเลือก "อนุญาตให้เกินยอดคงเหลือ"',
    }
  }

  const currency = milestone.payment_plans?.currency ?? 'THB'
  const now = new Date().toISOString()

  const { data: payment, error: insertError } = await supabase
    .from('payments')
    .insert({
      project_id: projectId,
      milestone_id: milestoneId,
      amount,
      currency,
      status: 'PAID',
      method,
      provider: 'manual',
      // No provider payment/checkout id exists for an out-of-band payment;
      // the staff-entered reference (a transfer slip number, a receipt
      // number) is recorded here instead, for the same reason the Stripe
      // path records `pi_...` — a human trail back to what actually moved.
      provider_payment_id: reference,
      paid_at: now,
      created_by: access.userId,
      // Distinct from created_by (migration 0024): this is specifically WHO
      // attests the money arrived, which for a Stripe payment is nobody — a
      // signature verified that — but for a manual entry is always the staff
      // member submitting this form. Same person as created_by today because
      // there is exactly one step; kept as its own column because a future
      // "record now, verify later" flow should not have to repurpose it.
      verified_by: access.userId,
      notes,
    })
    .select('id')
    .single<{ id: string }>()

  if (insertError || !payment) {
    console.error('[payments] record manual payment failed', insertError)
    return { error: 'ไม่สามารถบันทึกการชำระเงินได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await settleMilestoneIfCovered(supabase, milestoneId)
  // Admin client, not the caller-scoped one: an accountant's own session
  // cannot UPDATE `projects` (app.can_manage_project is admin/developer
  // only), so the ฿250 status advance needs the privileged client the same
  // way the webhook does.
  await advanceProjectOnStartPayment(createAdminClient(), milestoneId, access.userId)

  await logActivity({
    organizationId: access.organizationId,
    action: 'payment.recorded_manual',
    entityType: 'payment',
    entityId: payment.id,
    projectId,
    metadata: { milestoneId, amount, currency, method, reference, notes, verifiedBy: access.userId, allowOverpayment },
  })

  revalidatePath(`/work/admin/projects/${projectId}`)
  revalidatePath(`/work/portal/projects/${projectId}`)
  revalidatePath(`/work/portal/projects/${projectId}/payments`)
  revalidatePath('/work/admin/milestones')
  revalidatePath('/work/admin/payments')
  revalidatePath('/work/admin/dashboard')

  return { message: `บันทึกการชำระเงินสำหรับงวด "${milestone.name}" แล้ว` }
}

/**
 * A CLIENT declaring "I have transferred the money for this milestone"
 * (docs/PAYMENT_PLAN.md §4/§6) — the missing half of the manual-payment path.
 * `recordManualPayment` above is staff ENTERING a payment they have already
 * verified; this is a client SUBMITTING one for staff to verify. The two
 * meet at the same table with different status: this inserts PENDING,
 * `verifyManualPayment` below is the only thing that turns it PAID.
 *
 * `amount` is never taken from the client — it is the milestone's full
 * outstanding balance, the same "what a person reports vs. what they owe"
 * split `recordManualPayment` already draws. RLS backs this with the
 * ordinary client SELECT-only-elsewhere shape: `payments_insert_finance`
 * would refuse a client's insert outright, so this uses the privileged
 * client ONLY after reading the milestone under the caller's own session —
 * identical order of operations to `startMilestoneCheckout`.
 */
export async function submitManualPaymentProof(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = submitManualPaymentProofSchema.safeParse({
    projectId: formData.get('projectId'),
    milestoneId: formData.get('milestoneId'),
    reference: formData.get('reference'),
    note: formData.get('note') ?? undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' }

  const { projectId, milestoneId, reference, note } = parsed.data
  const access = await requireProjectAccess(projectId)
  if (access.isStaff) return { error: 'บัญชีทีมงานไม่สามารถส่งหลักฐานการโอนในนามลูกค้าได้' }

  const supabase = await createClient()
  const { data: milestone } = await supabase
    .from('payment_milestones')
    .select('id, name, amount, status, payment_plans!payment_milestones_plan_id_fkey(currency)')
    .eq('id', milestoneId)
    .eq('project_id', projectId)
    .maybeSingle<{
      id: string
      name: string
      amount: number
      status: string
      payment_plans: { currency: string } | null
    }>()

  if (!milestone) return { error: 'ไม่พบงวดการชำระเงินนี้' }
  if (milestone.status === 'PAID') return { error: 'งวดนี้ชำระเงินเรียบร้อยแล้ว' }
  if (milestone.status === 'CANCELLED') return { error: 'งวดนี้ถูกยกเลิกแล้ว จึงส่งหลักฐานไม่ได้' }

  const { data: existingPaid } = await supabase
    .from('payments')
    .select('amount')
    .eq('milestone_id', milestoneId)
    .eq('status', 'PAID')
  const alreadyPaid = ((existingPaid ?? []) as { amount: number }[]).reduce(
    (sum, row) => sum + (row.amount ?? 0),
    0,
  )
  const outstanding = Math.max(0, milestone.amount - alreadyPaid)
  if (outstanding <= 0) return { error: 'งวดนี้ไม่มียอดคงเหลือแล้ว' }

  const admin = createAdminClient()
  const { data: payment, error: insertError } = await admin
    .from('payments')
    .insert({
      project_id: projectId,
      milestone_id: milestoneId,
      amount: outstanding,
      currency: milestone.payment_plans?.currency ?? 'THB',
      status: 'PENDING',
      method: 'BANK_TRANSFER',
      provider: 'manual',
      provider_payment_id: reference,
      notes: note,
      created_by: access.userId,
    })
    .select('id')
    .single<{ id: string }>()

  if (insertError || !payment) {
    console.error('[payments] submit manual proof failed', insertError)
    return { error: 'ไม่สามารถส่งหลักฐานการโอนได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'manual_payment.submitted',
    entityType: 'payment',
    entityId: payment.id,
    projectId,
    metadata: { milestoneId, amount: outstanding, reference },
  })

  revalidatePath(`/work/portal/projects/${projectId}/payments`)
  revalidatePath(`/work/admin/projects/${projectId}`)
  revalidatePath('/work/admin/payments')

  return { message: 'ส่งหลักฐานการโอนแล้ว ทีมงานจะตรวจสอบและยืนยันการชำระเงิน' }
}

/**
 * Finance staff verifies a client-submitted transfer against the bank and
 * turns it PAID — docs/PAYMENT_PLAN.md §6. This IS the human verification a
 * Stripe webhook signature would otherwise provide, which is exactly why
 * this is `requireProjectFinance`-gated and never reachable by a client
 * (mirrors the reasoning on `recordManualPayment`). Records `paid_at`,
 * `verified_by`; settlement and the ฿250 start-payment advance run through
 * the same shared path the webhook and `recordManualPayment` already use.
 */
export async function verifyManualPayment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = verifyManualPaymentSchema.safeParse({
    paymentId: formData.get('paymentId'),
    note: formData.get('note') ?? undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' }

  const { paymentId, note } = parsed.data

  const supabase = await createClient()
  const { data: payment } = await supabase
    .from('payments')
    .select('id, project_id, milestone_id, status, provider, notes')
    .eq('id', paymentId)
    .maybeSingle<{
      id: string
      project_id: string
      milestone_id: string | null
      status: string
      provider: string | null
      notes: string | null
    }>()

  if (!payment) return { error: 'ไม่พบรายการชำระเงินนี้' }
  const access = await requireProjectFinance(payment.project_id)

  if (payment.provider !== 'manual') return { error: 'รายการนี้ไม่ใช่การชำระเงินนอกระบบ' }
  if (payment.status === 'PAID') return { message: 'รายการนี้ยืนยันแล้ว' }
  if (payment.status !== 'PENDING') {
    return { error: 'รายการนี้ไม่พร้อมให้ยืนยันแล้ว กรุณารีเฟรชหน้านี้' }
  }

  const now = new Date().toISOString()
  const combinedNotes = [payment.notes, note].filter(Boolean).join(' | ') || null

  const { error: updateError } = await supabase
    .from('payments')
    .update({ status: 'PAID', paid_at: now, verified_by: access.userId, notes: combinedNotes })
    .eq('id', paymentId)
    .eq('status', 'PENDING')

  if (updateError) {
    console.error('[payments] verify manual payment failed', updateError)
    return { error: 'ไม่สามารถยืนยันการชำระเงินได้ กรุณาลองใหม่อีกครั้ง' }
  }

  if (payment.milestone_id) {
    await settleMilestoneIfCovered(supabase, payment.milestone_id)
    await advanceProjectOnStartPayment(createAdminClient(), payment.milestone_id, access.userId)
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'manual_payment.verified',
    entityType: 'payment',
    entityId: paymentId,
    projectId: payment.project_id,
    metadata: { verifiedBy: access.userId, note },
  })

  revalidatePath(`/work/admin/projects/${payment.project_id}`)
  revalidatePath(`/work/portal/projects/${payment.project_id}`)
  revalidatePath(`/work/portal/projects/${payment.project_id}/payments`)
  revalidatePath('/work/admin/payments')
  revalidatePath('/work/admin/dashboard')

  return { message: 'ยืนยันการชำระเงินแล้ว' }
}
