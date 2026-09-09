'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

import { getUser } from '@/lib/work/auth/session'
import { requireProjectAccess, requireProjectFinance } from '@/lib/work/auth/permissions'
import { createClient } from '@/lib/work/supabase/server'
import { createAdminClient } from '@/lib/work/supabase/admin'
import {
  START_PAYMENT_MIN_SATANG,
  acceptPaymentPlanSchema,
  createPaymentPlanSchema,
  requestPaymentPlanChangesSchema,
  resolvePaymentPlanChangeSchema,
} from '@/lib/work/validation/payment-plans'
import type { PaymentPlanStatus, ProjectStatus } from '@/lib/work/types/enums'
import { assertValidTransition, InvalidStatusTransitionError } from '@/lib/work/auth/project-status'
import { logActivity } from './activity'

export type PaymentPlanActionState = {
  error?: string
  message?: string
}

/**
 * Creates a NEW version of a project's payment plan and every milestone in
 * it, in one batch.
 *
 * VERSIONED, not one-shot (migration 0034): at most one LIVE (DRAFT /
 * PROPOSED / ACCEPTED) plan exists per project (`payment_plans_live_project_key`),
 * but an ACCEPTED plan is immutable — a client who already agreed to a
 * schedule must never have it silently rewritten. So this refuses to touch
 * an ACCEPTED plan directly: it marks it SUPERSEDED and inserts a fresh
 * DRAFT-turned-PROPOSED row with `version` incremented and `supersedes_id`
 * pointing at it, only when the accepted plan has NO paid payments yet (a
 * client who already paid something against milestone N cannot have that
 * milestone silently swapped out). A DRAFT or PROPOSED plan (never accepted)
 * is superseded unconditionally — nothing to protect yet.
 *
 * `total_amount` is read from the project, not accepted from the form — it
 * is the same figure the pricing-items trigger (migration 0019) already
 * maintains. It is also checked against the accepted quotation's total
 * (docs/PAYMENT_PLAN.md §15) — a plan may not silently diverge from what the
 * client was actually quoted.
 *
 * Milestone amounts are computed from `percentageBp` HERE, not on the client:
 * each of the first N-1 milestones gets `round(total * bp / 10000)`, and the
 * LAST one gets whatever remains, so the sum is exact — the deferred
 * constraint trigger (`payment_milestones_validate_totals`) checks that at
 * commit regardless.
 *
 * The start-payment milestone (whichever the form flags `isStart`, or the
 * first milestone if none is flagged) must resolve to at least ฿250 —
 * checked here, not just by the database CHECK, so the error names the
 * actual milestone.
 */
export async function createPaymentPlan(
  _prev: PaymentPlanActionState,
  formData: FormData,
): Promise<PaymentPlanActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectFinance(projectId)

  const parsed = createPaymentPlanSchema.safeParse({
    type: formData.get('type'),
    milestones: formData.get('milestonesJson') ?? '[]',
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' }
  }

  const supabase = await createClient()

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('total_amount, currency, status')
    .eq('id', projectId)
    .single<{ total_amount: number; currency: string; status: ProjectStatus }>()

  if (projectError || !project) {
    return { error: 'ไม่พบโปรเจกต์' }
  }
  if (project.total_amount <= 0) {
    return { error: 'โปรเจกต์นี้ยังไม่มีรายการราคา กรุณาเพิ่มรายการราคาก่อนสร้างแผนการชำระเงิน' }
  }

  // docs/PAYMENT_PLAN.md §15: the plan must implement the accepted quotation,
  // not float free of it. The most recent ACCEPTED agreement's current
  // version is what "the accepted quotation" means — its total must match
  // what is about to be planned. No accepted agreement yet is not fatal (a
  // staff-created project may be priced and planned without going through
  // the quotation flow at all) — only a MISMATCH is refused.
  const { data: agreement } = await supabase
    .from('agreements')
    .select('current_version_id, agreement_versions!agreements_current_version_fk(id, total_amount)')
    .eq('project_id', projectId)
    .eq('status', 'ACCEPTED')
    .maybeSingle<{
      current_version_id: string | null
      agreement_versions: { id: string; total_amount: number } | null
    }>()

  if (agreement?.agreement_versions && agreement.agreement_versions.total_amount !== project.total_amount) {
    return {
      error:
        'ยอดรวมของโปรเจกต์ไม่ตรงกับใบเสนอราคาที่ลูกค้ายอมรับไว้ กรุณาออกใบเสนอราคาฉบับใหม่ก่อนสร้างแผนการชำระเงิน',
    }
  }

  // Find any currently-live plan (DRAFT/PROPOSED/ACCEPTED) to supersede.
  const { data: currentPlan } = await supabase
    .from('payment_plans')
    .select('id, version, status')
    .eq('project_id', projectId)
    .not('status', 'in', '(SUPERSEDED,DECLINED)')
    .maybeSingle<{ id: string; version: number; status: PaymentPlanStatus }>()

  if (currentPlan?.status === 'ACCEPTED') {
    const { count } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('status', 'PAID')
    if (count && count > 0) {
      return {
        error:
          'ลูกค้ายืนยันแผนการชำระเงินนี้แล้วและมีการชำระเงินเกิดขึ้นแล้ว ไม่สามารถแทนที่ได้ ' +
          'กรุณาติดต่อลูกค้าเพื่อดำเนินการเปลี่ยนแปลงตามกระบวนการที่เหมาะสม',
      }
    }
  }

  const total = project.total_amount
  const milestones = parsed.data.milestones
  const startIndex = milestones.findIndex((m) => m.isStart)
  const effectiveStartIndex = startIndex === -1 ? 0 : startIndex

  let allocated = 0
  const amounts = milestones.map((milestone, index) => {
    const isLast = index === milestones.length - 1
    const amount = isLast ? total - allocated : Math.round((total * milestone.percentageBp) / 10000)
    allocated += amount
    return amount
  })

  if (amounts[effectiveStartIndex] < START_PAYMENT_MIN_SATANG) {
    return {
      error: `งวดเริ่มต้น (งวดที่ ${effectiveStartIndex + 1}) ต้องมีมูลค่าอย่างน้อย ฿250 เพื่อเริ่มโปรเจกต์`,
    }
  }
  if (amounts.some((a) => a <= 0)) {
    return { error: 'ทุกงวดต้องมีมูลค่ามากกว่า 0' }
  }

  if (currentPlan) {
    const { error: supersedeError } = await supabase
      .from('payment_plans')
      .update({ status: 'SUPERSEDED' })
      .eq('id', currentPlan.id)
    if (supersedeError) {
      console.error('[payment-plans] supersede failed:', supersedeError)
      return { error: 'ไม่สามารถแทนที่แผนเดิมได้ กรุณาลองใหม่อีกครั้ง' }
    }
  }

  const { data: plan, error: planError } = await supabase
    .from('payment_plans')
    .insert({
      project_id: projectId,
      type: parsed.data.type,
      total_amount: total,
      currency: project.currency,
      status: 'PROPOSED',
      version: (currentPlan?.version ?? 0) + 1,
      supersedes_id: currentPlan?.id ?? null,
      source_agreement_version_id: agreement?.current_version_id ?? null,
      created_by: access.userId,
    })
    .select('id, version')
    .single<{ id: string; version: number }>()

  if (planError || !plan) {
    if (planError?.code === '23505') {
      return { error: 'โปรเจกต์นี้มีแผนการชำระเงินที่ยังไม่ปิดอยู่แล้ว' }
    }
    console.error('[payment-plans] create plan failed:', planError)
    return { error: 'ไม่สามารถสร้างแผนการชำระเงินได้ กรุณาลองใหม่อีกครั้ง' }
  }

  const rows = milestones.map((milestone, index) => ({
    plan_id: plan.id,
    project_id: projectId,
    sequence: index + 1,
    name: milestone.name,
    description: milestone.description,
    percentage_bp: milestone.percentageBp,
    amount: amounts[index],
    due_date: milestone.dueDate,
    unlock_rules: milestone.unlockRules,
    is_start_payment: index === effectiveStartIndex,
  }))

  const { error: milestonesError } = await supabase.from('payment_milestones').insert(rows)

  if (milestonesError) {
    console.error('[payment-plans] create milestones failed:', milestonesError)
    // The plan row is left in place as a DRAFT-shaped orphan (no milestones) —
    // safe to retry adding milestones, and nothing downstream treats a plan
    // with zero milestones as payable.
    return { error: 'สร้างแผนสำเร็จแต่บันทึกงวดชำระไม่สำเร็จ: ' + milestonesError.message }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'payment_plan.created',
    entityType: 'payment_plan',
    entityId: plan.id,
    projectId,
    metadata: {
      type: parsed.data.type,
      milestoneCount: rows.length,
      total,
      version: plan.version,
      supersedes: currentPlan?.id ?? null,
    },
  })

  revalidatePath(`/work/admin/projects/${projectId}`)
  revalidatePath(`/work/portal/projects/${projectId}`)
  revalidatePath(`/work/portal/projects/${projectId}/payments`)
  revalidatePath('/work/admin/milestones')
  revalidatePath('/work/admin/payments')
  revalidatePath('/work/admin/dashboard')

  return { message: `ส่งแผนการชำระเงิน (เวอร์ชัน ${plan.version}) ให้ลูกค้าแล้ว` }
}

function clientIp(headerList: Headers): string | null {
  const forwardedFor = headerList.get('x-forwarded-for')
  return forwardedFor?.split(',')[0]?.trim() || headerList.get('x-real-ip') || null
}

/**
 * The client (or self-serve owner) accepts the plan currently PROPOSED on
 * their project — docs/PAYMENT_PLAN.md §8.
 *
 * Same shape as acceptAgreement: the acceptance row is inserted under the
 * CALLER'S OWN session first (RLS — payment_plan_acceptances_insert —
 * proves they are really on this project), and only then does the
 * privileged client flip `payment_plans.status`, because clients have no
 * UPDATE policy on payment_plans at all (finance-staff-only, migration
 * 0009). Accepting does NOT change project status by itself — it is what
 * makes the start-payment milestone payable; the ฿250 payment itself is
 * what advances WAITING_FOR_DEPOSIT -> READY_TO_START
 * (advanceProjectOnStartPayment).
 */
export async function acceptPaymentPlan(
  _prev: PaymentPlanActionState,
  formData: FormData,
): Promise<PaymentPlanActionState> {
  const parsed = acceptPaymentPlanSchema.safeParse({
    projectId: formData.get('projectId'),
    planId: formData.get('planId'),
    name: formData.get('name'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' }

  const { projectId, planId, name } = parsed.data
  const access = await requireProjectAccess(projectId)
  if (access.isStaff) return { error: 'บัญชีทีมงานไม่สามารถยืนยันแผนการชำระเงินในนามลูกค้าได้' }

  const user = await getUser()
  if (!user) return { error: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' }

  const supabase = await createClient()
  const headerList = await headers()

  const { data: plan } = await supabase
    .from('payment_plans')
    .select('id, version, status')
    .eq('id', planId)
    .eq('project_id', projectId)
    .maybeSingle<{ id: string; version: number; status: PaymentPlanStatus }>()

  if (!plan) return { error: 'ไม่พบแผนการชำระเงินนี้' }
  if (plan.status === 'ACCEPTED') return { message: 'ยืนยันแผนการชำระเงินแล้ว' }
  if (plan.status !== 'PROPOSED') {
    return { error: 'แผนการชำระเงินนี้ไม่พร้อมให้ยืนยันแล้ว กรุณารีเฟรชหน้านี้' }
  }

  const { error: acceptError } = await supabase.from('payment_plan_acceptances').insert({
    plan_id: plan.id,
    project_id: projectId,
    plan_version: plan.version,
    accepted_by: user.id,
    accepted_name: name,
    accepted_email: user.email ?? '',
    ip_address: clientIp(headerList),
    user_agent: headerList.get('user-agent'),
  })

  if (acceptError && acceptError.code !== '23505') {
    console.error('[payment-plans] acceptance insert failed:', acceptError)
    return { error: 'ไม่สามารถยืนยันได้ กรุณาลองใหม่อีกครั้ง' }
  }

  const admin = createAdminClient()
  const { error: updateError, count } = await admin
    .from('payment_plans')
    .update({ status: 'ACCEPTED', accepted_by: user.id, accepted_at: new Date().toISOString() }, { count: 'exact' })
    .eq('id', plan.id)
    .eq('status', 'PROPOSED')

  if (updateError) {
    console.error('[payment-plans] status update failed:', updateError)
    return { error: 'บันทึกการยืนยันแล้วแต่อัปเดตสถานะไม่สำเร็จ กรุณาติดต่อทีมงาน' }
  }
  // count === 0 means someone else's request already flipped it — not an
  // error, the plan is ACCEPTED either way.
  void count

  await logActivity({
    organizationId: access.organizationId,
    action: 'payment_plan.accepted',
    entityType: 'payment_plan',
    entityId: plan.id,
    projectId,
    metadata: { version: plan.version, acceptedBy: user.id },
  })

  revalidatePath(`/work/portal/projects/${projectId}`)
  revalidatePath(`/work/portal/projects/${projectId}/payments`)
  revalidatePath(`/work/admin/projects/${projectId}`)

  return { message: 'ยืนยันแผนการชำระเงินแล้ว ดำเนินการชำระเงินเริ่มต้นเพื่อเริ่มโปรเจกต์ได้เลย' }
}

/**
 * "Request Changes" (docs/PAYMENT_PLAN.md §9): the client asks for a
 * different split instead of accepting the one proposed. NEVER edits
 * `payment_plans`/`payment_milestones` — it only records the request; admin
 * reviews it and creates a new plan VERSION through `createPaymentPlan`,
 * which is what keeps every past version intact.
 */
export async function requestPaymentPlanChanges(
  _prev: PaymentPlanActionState,
  formData: FormData,
): Promise<PaymentPlanActionState> {
  const parsed = requestPaymentPlanChangesSchema.safeParse({
    projectId: formData.get('projectId'),
    planId: formData.get('planId') || undefined,
    message: formData.get('message'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' }

  const { projectId, planId, message } = parsed.data
  const access = await requireProjectAccess(projectId)
  if (access.isStaff) return { error: 'บัญชีทีมงานไม่สามารถส่งคำขอนี้ในนามลูกค้าได้' }

  const user = await getUser()
  if (!user) return { error: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' }

  const supabase = await createClient()
  const { data: request, error } = await supabase
    .from('payment_plan_change_requests')
    .insert({
      project_id: projectId,
      plan_id: planId ?? null,
      requested_by: user.id,
      message,
    })
    .select('id')
    .single<{ id: string }>()

  if (error || !request) {
    console.error('[payment-plans] change request insert failed:', error)
    return { error: 'ไม่สามารถส่งคำขอได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'payment_plan.changes_requested',
    entityType: 'payment_plan_change_request',
    entityId: request.id,
    projectId,
    metadata: { planId, message },
  })

  revalidatePath(`/work/portal/projects/${projectId}`)
  revalidatePath(`/work/admin/projects/${projectId}`)

  return { message: 'ส่งคำขอเปลี่ยนแปลงแผนการชำระเงินแล้ว ทีมงานจะจัดทำแผนใหม่' }
}

/**
 * Finance staff closes a change request — ADDRESSED once a new plan version
 * has been drafted in response, or DISMISSED with a reason. Never itself
 * touches `payment_plans`; drafting the response is `createPaymentPlan`.
 */
export async function resolvePaymentPlanChangeRequest(
  _prev: PaymentPlanActionState,
  formData: FormData,
): Promise<PaymentPlanActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectFinance(projectId)

  const parsed = resolvePaymentPlanChangeSchema.safeParse({
    requestId: formData.get('requestId'),
    resolution: formData.get('resolution'),
    note: formData.get('note') ?? undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('payment_plan_change_requests')
    .update({
      status: parsed.data.resolution,
      resolved_by: access.userId,
      resolved_at: new Date().toISOString(),
      resolution_note: parsed.data.note,
    })
    .eq('id', parsed.data.requestId)
    .eq('project_id', projectId)

  if (error) {
    console.error('[payment-plans] resolve change request failed:', error)
    return { error: 'ไม่สามารถปิดคำขอได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'payment_plan.change_request_resolved',
    entityType: 'payment_plan_change_request',
    entityId: parsed.data.requestId,
    projectId,
    metadata: { resolution: parsed.data.resolution, note: parsed.data.note },
  })

  revalidatePath(`/work/admin/projects/${projectId}`)
  revalidatePath(`/work/portal/projects/${projectId}`)

  return { message: 'ปิดคำขอแล้ว' }
}

/**
 * Explicit admin "Start Project" — READY_TO_START -> IN_PROGRESS
 * (docs/PAYMENT_PLAN.md §7). Deliberately a separate, human action from the
 * automatic WAITING_FOR_DEPOSIT -> READY_TO_START the ฿250 payment itself
 * causes (advanceProjectOnStartPayment): the payment clears the GATE, a
 * person still decides when work actually begins.
 *
 * WHY THE STATUS WRITE USES THE PRIVILEGED CLIENT. `requireProjectFinance`
 * admits an ACCOUNTANT, but `projects_update_staff` (migration 0005) is
 * super_admin/admin/developer only — an accountant's own session matches no
 * UPDATE policy on `projects`, so this write used to affect zero rows and
 * return no error, and the action reported success while nothing moved.
 * The authorization decision is made ABOVE, by `requireProjectFinance`, on
 * the caller's real session; the privileged client is used only afterwards
 * and only for this one status column — the same "already-authorized,
 * server-only write" pattern acceptAgreement and advanceProjectOnStartPayment
 * already use. It grants an accountant nothing else: every other write in
 * this file still runs under the caller's session and its policies.
 */
export async function startProject(
  _prev: PaymentPlanActionState,
  formData: FormData,
): Promise<PaymentPlanActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectFinance(projectId)

  const supabase = await createClient()
  const { data: current } = await supabase
    .from('projects')
    .select('status')
    .eq('id', projectId)
    .maybeSingle<{ status: ProjectStatus }>()
  if (!current) return { error: 'ไม่พบโปรเจกต์' }

  try {
    assertValidTransition(current.status, 'IN_PROGRESS')
  } catch (error) {
    if (error instanceof InvalidStatusTransitionError) {
      return { error: 'โปรเจกต์นี้ยังไม่พร้อมเริ่มงาน (ต้องชำระเงินเริ่มต้นก่อน)' }
    }
    throw error
  }

  const { error, count } = await createAdminClient()
    .from('projects')
    .update({ status: 'IN_PROGRESS' }, { count: 'exact' })
    .eq('id', projectId)
    .eq('status', current.status)

  if (error) {
    console.error('[payment-plans] start project failed:', error)
    return { error: 'ไม่สามารถเริ่มโปรเจกต์ได้ กรุณาลองใหม่อีกครั้ง' }
  }

  // Zero rows is not success. `.eq('status', current.status)` means the only
  // way to get here is that someone else moved the project between the read
  // above and this write — say so instead of reporting a start that never
  // happened.
  if (!count) {
    console.error('[payment-plans] start project affected no rows', { projectId })
    return { error: 'สถานะโปรเจกต์เปลี่ยนไปแล้ว กรุณารีเฟรชหน้านี้แล้วลองใหม่' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'project.started',
    entityType: 'project',
    entityId: projectId,
    projectId,
  })

  revalidatePath(`/work/admin/projects/${projectId}`)
  revalidatePath(`/work/portal/projects/${projectId}`)

  return { message: 'เริ่มโปรเจกต์แล้ว' }
}
