'use server'

import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

import { getUser } from '@/lib/work/auth/session'
import { requireProjectAccess, requireProjectFinance } from '@/lib/work/auth/permissions'
import { assertValidTransition, InvalidStatusTransitionError } from '@/lib/work/auth/project-status'
import { createClient } from '@/lib/work/supabase/server'
import { createAdminClient } from '@/lib/work/supabase/admin'
import { getPricingTotals } from '@/lib/work/queries/pricing'
import type { ProjectStatus } from '@/lib/work/types/enums'
import { logActivity } from './activity'

export type AgreementActionState = {
  error?: string
  message?: string
}

const EXPIRES_IN_DAYS = 30

/**
 * Sends (or re-sends, as a new version) the project's quotation/agreement.
 *
 * `agreements` is upserted rather than required to already exist — the first
 * send on a project creates its one contract slot (`agreements_project_key`,
 * migration 0008). Every send is a NEW `agreement_versions` row: versions are
 * immutable (enforced by a trigger, not just by convention) because a
 * contract whose text can change after a client reads it is not evidence of
 * anything. `body_hash` lets tampering be detected without re-reading the
 * text.
 *
 * `total_amount` is snapshotted from the project's current (pricing-derived)
 * total at the moment of sending — not read live later — so a quotation a
 * client already saw never silently changes underneath them.
 */
export async function sendAgreement(
  _prev: AgreementActionState,
  formData: FormData,
): Promise<AgreementActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectFinance(projectId)

  const body = String(formData.get('body') ?? '').trim()
  if (!body) return { error: 'กรุณากรอกเนื้อหาใบเสนอราคา' }

  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('total_amount, currency, status')
    .eq('id', projectId)
    .single<{ total_amount: number; currency: string; status: ProjectStatus }>()
  if (!project) return { error: 'ไม่พบโปรเจกต์' }

  // The quotation carries the FULL structured breakdown at the moment of
  // sending — not just the grand total (migration 0029) — so the client's
  // preview and the admin's later reference to "what did version N say"
  // never depend on re-deriving it from whatever pricing looks like now.
  const totals = await getPricingTotals(projectId)

  const { data: agreement, error: agreementError } = await supabase
    .from('agreements')
    .upsert({ project_id: projectId, status: 'SENT', created_by: access.userId }, { onConflict: 'project_id' })
    .select('id')
    .single<{ id: string }>()

  if (agreementError || !agreement) {
    console.error('[agreements] upsert failed:', agreementError)
    return { error: 'ไม่สามารถส่งใบเสนอราคาได้ กรุณาลองใหม่อีกครั้ง' }
  }

  const { data: latest } = await supabase
    .from('agreement_versions')
    .select('version')
    .eq('agreement_id', agreement.id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle<{ version: number }>()

  const nextVersion = (latest?.version ?? 0) + 1
  const bodyHash = createHash('sha256').update(body).digest('hex')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000)

  const { data: version, error: versionError } = await supabase
    .from('agreement_versions')
    .insert({
      agreement_id: agreement.id,
      project_id: projectId,
      version: nextVersion,
      body,
      body_hash: bodyHash,
      total_amount: project.total_amount,
      currency: project.currency,
      subtotal: totals.subtotal,
      discount_total: totals.discountTotal,
      taxable_amount: totals.taxableAmount,
      vat_enabled: totals.vatEnabled,
      vat_rate_bp: totals.vatRateBp,
      vat_amount: totals.vatAmount,
      sent_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      created_by: access.userId,
    })
    .select('quotation_number')
    .single<{ quotation_number: string | null }>()

  if (versionError || !version) {
    console.error('[agreements] version insert failed:', versionError)
    return { error: 'ไม่สามารถบันทึกใบเสนอราคาได้ กรุณาลองใหม่อีกครั้ง' }
  }

  // A re-send after a decline/expiry puts the agreement back into SENT —
  // it may already be SENT from the upsert above, but an existing DECLINED /
  // EXPIRED / SUPERSEDED row needs this explicit reset.
  await supabase.from('agreements').update({ status: 'SENT' }).eq('id', agreement.id)

  // Drives the project through both edges the transition graph gives
  // "sending a quotation" (docs/ADMIN_PROJECT_REVIEW.md §2): QUOTATION_DRAFT
  // -> QUOTATION_SENT -> AWAITING_CLIENT_APPROVAL, as two real, individually
  // valid writes — not skipped as one shortcut jump. Only applies when the
  // project is actually in QUOTATION_DRAFT (the normal, inbox-driven flow);
  // sendAgreement remains callable outside that flow without this touching
  // project status at all, so it stays backward compatible.
  //
  // WHY THESE TWO WRITES USE THE PRIVILEGED CLIENT. `requireProjectFinance`
  // (above) admits an ACCOUNTANT, but `projects_update_staff` (migration
  // 0005) is super_admin/admin/developer only — an accountant's own session
  // matches no UPDATE policy on `projects`, so these writes used to affect
  // zero rows, raise nothing, and leave the project in QUOTATION_DRAFT while
  // the action reported the quotation as sent. Authorization is decided ABOVE
  // on the caller's real session; the privileged client is used only here and
  // only for this one status column, the same pattern acceptAgreement below
  // already uses. Every other write in this action still runs under the
  // caller's session and its policies.
  if (project.status === 'QUOTATION_DRAFT') {
    const admin = createAdminClient()
    try {
      assertValidTransition('QUOTATION_DRAFT', 'QUOTATION_SENT')
      const sent = await admin
        .from('projects')
        .update({ status: 'QUOTATION_SENT' }, { count: 'exact' })
        .eq('id', projectId)
        .eq('status', 'QUOTATION_DRAFT')

      assertValidTransition('QUOTATION_SENT', 'AWAITING_CLIENT_APPROVAL')
      const awaiting = await admin
        .from('projects')
        .update({ status: 'AWAITING_CLIENT_APPROVAL' }, { count: 'exact' })
        .eq('id', projectId)
        .eq('status', 'QUOTATION_SENT')

      // The version row is already written and the agreement is already SENT,
      // so the quotation genuinely went out — but the project did not move.
      // Report that honestly rather than either claiming a clean success or
      // pretending the send failed. Same shape as acceptPaymentPlan's
      // "recorded but status update failed" case.
      if (sent.error || awaiting.error || !sent.count || !awaiting.count) {
        console.error('[agreements] quotation sent but project status did not advance', {
          projectId,
          sentError: sent.error,
          sentCount: sent.count,
          awaitingError: awaiting.error,
          awaitingCount: awaiting.count,
        })
        return {
          error: 'ส่งใบเสนอราคาแล้วแต่อัปเดตสถานะโปรเจกต์ไม่สำเร็จ กรุณารีเฟรชหน้านี้',
        }
      }
    } catch (transitionError) {
      if (!(transitionError instanceof InvalidStatusTransitionError)) throw transitionError
    }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'agreement.sent',
    entityType: 'agreement',
    entityId: agreement.id,
    projectId,
    metadata: {
      version: nextVersion,
      quotationNumber: version.quotation_number,
      totalAmount: project.total_amount,
    },
  })

  revalidatePath(`/work/admin/projects/${projectId}`)
  revalidatePath(`/work/portal/projects/${projectId}`)

  return {
    message: version.quotation_number
      ? `ส่งใบเสนอราคา ${version.quotation_number} (เวอร์ชัน ${nextVersion}) แล้ว`
      : `ส่งใบเสนอราคา (เวอร์ชัน ${nextVersion}) แล้ว`,
  }
}

function clientIp(headerList: Headers): string | null {
  const forwardedFor = headerList.get('x-forwarded-for')
  return forwardedFor?.split(',')[0]?.trim() || headerList.get('x-real-ip') || null
}

/**
 * The client confirms the agreement currently on their project.
 *
 * `requireProjectAccess`, not `requireProjectManage` — this is the one write
 * in the whole contract flow that belongs to the CLIENT side, mirrored by
 * `agreement_acceptances_insert`'s RLS predicate
 * (`app.is_project_client(project_id) or app.can_manage_project_finance(...)`
 * — staff may also record an acceptance taken out of band, but this action is
 * reached from the portal, so it is always the client's own confirmation).
 *
 * IP and user agent are captured for evidential value alongside name/email —
 * the same reasoning `agreement_acceptances` itself documents.
 */
export async function acceptAgreement(
  _prev: AgreementActionState,
  formData: FormData,
): Promise<AgreementActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const versionId = String(formData.get('versionId') ?? '')
  await requireProjectAccess(projectId)

  const user = await getUser()
  if (!user) return { error: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' }

  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'กรุณากรอกชื่อผู้ยืนยัน' }

  const supabase = await createClient()
  const headerList = await headers()

  const { data: version } = await supabase
    .from('agreement_versions')
    .select('id, agreement_id')
    .eq('id', versionId)
    .eq('project_id', projectId)
    .maybeSingle<{ id: string; agreement_id: string }>()
  if (!version) return { error: 'ไม่พบใบเสนอราคานี้' }

  const { error: acceptError } = await supabase.from('agreement_acceptances').insert({
    version_id: version.id,
    project_id: projectId,
    accepted_by: user.id,
    accepted_name: name,
    accepted_email: user.email ?? '',
    ip_address: clientIp(headerList),
    user_agent: headerList.get('user-agent'),
  })

  if (acceptError) {
    // 23505 = already accepted this version under this email — treat as
    // success rather than an error the client cannot do anything about.
    if (acceptError.code !== '23505') {
      console.error('[agreements] acceptance insert failed:', acceptError)
      return { error: 'ไม่สามารถยืนยันได้ กรุณาลองใหม่อีกครั้ง' }
    }
  }

  // The caller-scoped client has no UPDATE policy on `agreements` — by
  // design, only finance staff may write that table directly
  // (`agreements_update_finance`). The privileged client is used ONLY here,
  // ONLY after the acceptance row above was inserted under the client's OWN
  // session (proof they are really on this project — RLS already checked
  // it), to apply the status change their acceptance causes.
  const admin = createAdminClient()
  const { error: updateError } = await admin
    .from('agreements')
    .update({ status: 'ACCEPTED', current_version_id: version.id })
    .eq('id', version.agreement_id)

  if (updateError) {
    console.error('[agreements] status update failed:', updateError)
    return { error: 'บันทึกการยืนยันแล้วแต่อัปเดตสถานะไม่สำเร็จ กรุณาติดต่อทีมงาน' }
  }

  // Accepting the quotation is what unblocks deposit collection
  // (docs/ADMIN_PROJECT_REVIEW.md §2's AWAITING_CLIENT_APPROVAL ->
  // AWAITING_DEPOSIT edge — WAITING_FOR_DEPOSIT in this codebase's existing
  // vocabulary). Only applies when the project is actually waiting on this
  // acceptance; an out-of-flow acceptance (an agreement sent outside the
  // inbox workflow) leaves project status untouched, same reasoning as
  // sendAgreement's own guard.
  const { data: currentProject } = await admin
    .from('projects')
    .select('status')
    .eq('id', projectId)
    .maybeSingle<{ status: ProjectStatus }>()
  if (currentProject?.status === 'AWAITING_CLIENT_APPROVAL') {
    try {
      assertValidTransition('AWAITING_CLIENT_APPROVAL', 'WAITING_FOR_DEPOSIT')
      await admin
        .from('projects')
        .update({ status: 'WAITING_FOR_DEPOSIT' })
        .eq('id', projectId)
        .eq('status', 'AWAITING_CLIENT_APPROVAL')
    } catch (transitionError) {
      if (!(transitionError instanceof InvalidStatusTransitionError)) throw transitionError
    }
  }

  revalidatePath(`/work/portal/projects/${projectId}`)
  revalidatePath(`/work/admin/projects/${projectId}`)

  return { message: 'ยืนยันใบเสนอราคาแล้ว' }
}

/**
 * "Request Changes" (docs/ADMIN_PROJECT_REVIEW.md §13 / this task's Phase
 * 2): the client asks for a different quotation instead of accepting this
 * one. AWAITING_CLIENT_APPROVAL -> QUOTATION_DRAFT — never edits the
 * existing agreement/version in place; admin drafts and sends a NEW version
 * through the same `sendAgreement` path, which is what keeps every past
 * version immutable.
 */
export async function requestQuotationChanges(
  _prev: AgreementActionState,
  formData: FormData,
): Promise<AgreementActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const note = String(formData.get('note') ?? '').trim()
  const access = await requireProjectAccess(projectId)

  const supabase = await createClient()
  const { data: project } = await supabase
    .from('projects')
    .select('status')
    .eq('id', projectId)
    .maybeSingle<{ status: ProjectStatus }>()
  if (!project) return { error: 'ไม่พบโปรเจกต์' }

  try {
    assertValidTransition(project.status, 'QUOTATION_DRAFT')
  } catch {
    return { error: 'ไม่สามารถขอแก้ไขใบเสนอราคาจากสถานะปัจจุบันได้' }
  }

  const { error } = await supabase
    .from('projects')
    .update({ status: 'QUOTATION_DRAFT' })
    .eq('id', projectId)
    .eq('status', project.status)

  if (error) {
    console.error('[agreements] request changes failed:', error)
    return { error: 'ไม่สามารถส่งคำขอแก้ไขได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'agreement.changes_requested',
    entityType: 'agreement',
    projectId,
    metadata: note ? { note } : {},
  })

  revalidatePath(`/work/portal/projects/${projectId}`)
  revalidatePath(`/work/admin/projects/${projectId}`)

  return { message: 'ส่งคำขอแก้ไขใบเสนอราคาแล้ว ทีมงานจะจัดทำใบเสนอราคาใหม่' }
}
