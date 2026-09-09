'use server'

import { revalidatePath } from 'next/cache'

import { requireProjectManage } from '@/lib/work/auth/permissions'
import {
  assertValidChangeRequestTransition,
  InvalidChangeRequestTransitionError,
} from '@/lib/work/auth/change-request-status'
import { createClient } from '@/lib/work/supabase/server'
import type { ChangeRequestStatus } from '@/lib/work/types/enums'
import {
  approveChangeRequestSchema,
  changeRequestActionSchema,
  declineChangeRequestSchema,
  reviewChangeRequestSchema,
} from '@/lib/work/validation/change-requests'
import { logActivity } from './activity'

export type ChangeRequestActionState = {
  error?: string
  message?: string
  fieldErrors?: Record<string, string>
}

function fieldErrorsFrom(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '')
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return fieldErrors
}

function revalidateChangeRequests(projectId: string) {
  revalidatePath(`/work/admin/projects/${projectId}/change-requests`)
  revalidatePath('/work/admin/change-requests')
  revalidatePath(`/work/portal/projects/${projectId}/change-requests`)
}

/**
 * EVERY action in this file is gated on `requireProjectManage`
 * (super_admin/admin/developer), mirroring `change_requests_update_staff`
 * (`app.can_manage_project`) exactly.
 *
 * NOT `requireProjectFinance`. A change request carries a price, but pricing it
 * is part of DECIDING it, and deciding scope is not an accounting act — an
 * accountant reads the queue and cannot move anything in it. An app gate wider
 * than the policy beneath it is the F1 defect.
 *
 * THE CLIENT CANNOT REACH ANY OF THIS. `change_requests` has no client UPDATE
 * policy at all (migration 0016), so even setting aside these gates, a client
 * approving their own request matches no policy and affects zero rows. Both
 * layers say the same thing independently.
 */

type RequestRow = {
  id: string
  title: string
  status: ChangeRequestStatus
  project_id: string
}

/**
 * Loads the request and confirms it belongs to THIS project.
 *
 * `.eq('project_id', projectId)` beside the id is the project-level IDOR
 * guard: the id came from the browser, and RLS alone would confine it to the
 * caller's organization but not to the project they were authorized for.
 */
async function loadRequest(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  requestId: string,
): Promise<RequestRow | null> {
  const { data } = await supabase
    .from('change_requests')
    .select('id, title, status, project_id')
    .eq('id', requestId)
    .eq('project_id', projectId)
    .maybeSingle<RequestRow>()
  return data ?? null
}

/**
 * Applies a status move plus whatever fields the decision carries.
 *
 * One place writes `status`, and it always asserts the transition first. The
 * reviewer's identity comes from the session; `reviewed_at` from the server
 * clock. Zero rows affected is an error, never a success message.
 */
async function applyTransition(
  projectId: string,
  request: RequestRow,
  to: ChangeRequestStatus,
  patch: Record<string, unknown>,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    assertValidChangeRequestTransition(request.status, to)
  } catch (error) {
    if (error instanceof InvalidChangeRequestTransitionError) {
      return { ok: false, error: `ไม่สามารถเปลี่ยนสถานะจาก ${request.status} เป็น ${to} ได้` }
    }
    throw error
  }

  const supabase = await createClient()
  const { error, count } = await supabase
    .from('change_requests')
    .update(
      {
        status: to,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        ...patch,
      },
      { count: 'exact' },
    )
    .eq('id', request.id)
    .eq('project_id', projectId)
    // Concurrency guard: if someone else moved it since the read, this matches
    // nothing and is reported as a failure rather than a silent overwrite.
    .eq('status', request.status)

  if (error) {
    console.error('[change-requests] transition failed:', error)
    return { ok: false, error: 'ไม่สามารถอัปเดตคำขอได้ กรุณาลองใหม่อีกครั้ง' }
  }
  if (!count) {
    return { ok: false, error: 'สถานะคำขอเปลี่ยนไปแล้ว กรุณารีเฟรชหน้านี้แล้วลองใหม่' }
  }
  return { ok: true }
}

/** OPEN -> UNDER_REVIEW. Picking it up, before any decision. */
export async function startChangeRequestReview(
  _prev: ChangeRequestActionState,
  formData: FormData,
): Promise<ChangeRequestActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectManage(projectId)

  const parsed = changeRequestActionSchema.safeParse({
    projectId,
    requestId: formData.get('requestId'),
  })
  if (!parsed.success) return { error: 'คำขอไม่ถูกต้อง' }

  const supabase = await createClient()
  const request = await loadRequest(supabase, projectId, parsed.data.requestId)
  if (!request) return { error: 'ไม่พบคำขอนี้ในโปรเจกต์' }

  const result = await applyTransition(projectId, request, 'UNDER_REVIEW', {}, access.userId)
  if (!result.ok) return { error: result.error }

  await logActivity({
    organizationId: access.organizationId,
    action: 'change_request.under_review',
    entityType: 'change_request',
    entityId: request.id,
    projectId,
    metadata: { title: request.title },
  })

  revalidateChangeRequests(projectId)
  return { message: 'รับคำขอเข้าตรวจสอบแล้ว' }
}

/**
 * Records the assessment — scope, price, timeline impact — WITHOUT deciding.
 *
 * From UNDER_REVIEW this moves to QUOTED, which is the "here is what it costs,
 * over to you" state. It never approves: pricing something is not agreeing to
 * it, and collapsing the two would mean any priced request was automatically
 * accepted.
 */
export async function quoteChangeRequest(
  _prev: ChangeRequestActionState,
  formData: FormData,
): Promise<ChangeRequestActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectManage(projectId)

  const parsed = reviewChangeRequestSchema.safeParse({
    projectId,
    requestId: formData.get('requestId'),
    agreedScope: formData.get('agreedScope') ?? undefined,
    decisionReason: formData.get('decisionReason') ?? undefined,
    estimatedAmount: formData.get('estimatedAmount') ?? undefined,
    impactDays: formData.get('impactDays') ?? undefined,
    workMilestoneId: formData.get('workMilestoneId') ?? undefined,
    priority: formData.get('priority') ?? undefined,
  })
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) }
  const input = parsed.data

  const supabase = await createClient()
  const request = await loadRequest(supabase, projectId, input.requestId)
  if (!request) return { error: 'ไม่พบคำขอนี้ในโปรเจกต์' }

  const result = await applyTransition(
    projectId,
    request,
    'QUOTED',
    {
      agreed_scope: input.agreedScope,
      decision_reason: input.decisionReason,
      estimated_amount: input.estimatedAmount,
      impact_days: input.impactDays,
      work_milestone_id: input.workMilestoneId,
      ...(input.priority ? { priority: input.priority } : {}),
    },
    access.userId,
  )
  if (!result.ok) return { error: result.error }

  await logActivity({
    organizationId: access.organizationId,
    action: 'change_request.quoted',
    entityType: 'change_request',
    entityId: request.id,
    projectId,
    metadata: {
      title: request.title,
      estimatedAmount: input.estimatedAmount,
      impactDays: input.impactDays,
    },
  })

  revalidateChangeRequests(projectId)
  return { message: 'บันทึกการประเมินและส่งราคาแล้ว' }
}

/**
 * Approving.
 *
 * `agreed_scope` is required by the schema, and it is written BESIDE the
 * client's `description`, never over it — the requested/agreed split this
 * codebase draws everywhere else.
 *
 * Approving does NOT reprice the project, move a milestone, or touch the
 * payment plan. It records a decision; the pricing and timeline systems have
 * their own actions and their own authorization, and an approval that silently
 * altered an accepted payment plan would bypass all of it.
 */
export async function approveChangeRequest(
  _prev: ChangeRequestActionState,
  formData: FormData,
): Promise<ChangeRequestActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectManage(projectId)

  const parsed = approveChangeRequestSchema.safeParse({
    projectId,
    requestId: formData.get('requestId'),
    agreedScope: formData.get('agreedScope'),
    estimatedAmount: formData.get('estimatedAmount') ?? undefined,
    impactDays: formData.get('impactDays') ?? undefined,
    workMilestoneId: formData.get('workMilestoneId') ?? undefined,
  })
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) }
  const input = parsed.data

  const supabase = await createClient()
  const request = await loadRequest(supabase, projectId, input.requestId)
  if (!request) return { error: 'ไม่พบคำขอนี้ในโปรเจกต์' }

  const result = await applyTransition(
    projectId,
    request,
    'APPROVED',
    {
      agreed_scope: input.agreedScope,
      estimated_amount: input.estimatedAmount,
      impact_days: input.impactDays,
      work_milestone_id: input.workMilestoneId,
      resolved_at: new Date().toISOString(),
    },
    access.userId,
  )
  if (!result.ok) return { error: result.error }

  await logActivity({
    organizationId: access.organizationId,
    action: 'change_request.approved',
    entityType: 'change_request',
    entityId: request.id,
    projectId,
    metadata: {
      title: request.title,
      estimatedAmount: input.estimatedAmount,
      impactDays: input.impactDays,
    },
  })

  revalidateChangeRequests(projectId)
  return { message: 'อนุมัติคำขอแล้ว' }
}

/** Rejecting. The reason is required and the client reads it. */
export async function rejectChangeRequest(
  _prev: ChangeRequestActionState,
  formData: FormData,
): Promise<ChangeRequestActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectManage(projectId)

  const parsed = declineChangeRequestSchema.safeParse({
    projectId,
    requestId: formData.get('requestId'),
    decisionReason: formData.get('decisionReason'),
  })
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) }
  const input = parsed.data

  const supabase = await createClient()
  const request = await loadRequest(supabase, projectId, input.requestId)
  if (!request) return { error: 'ไม่พบคำขอนี้ในโปรเจกต์' }

  const result = await applyTransition(
    projectId,
    request,
    'REJECTED',
    { decision_reason: input.decisionReason, resolved_at: new Date().toISOString() },
    access.userId,
  )
  if (!result.ok) return { error: result.error }

  await logActivity({
    organizationId: access.organizationId,
    action: 'change_request.rejected',
    entityType: 'change_request',
    entityId: request.id,
    projectId,
    metadata: { title: request.title },
  })

  revalidateChangeRequests(projectId)
  return { message: 'ปฏิเสธคำขอแล้ว' }
}

/**
 * "We need more information" — UNDER_REVIEW -> OPEN.
 *
 * Deliberately returns the request to OPEN rather than inventing a ninth
 * status: it is back in the client's court, which is exactly what OPEN means,
 * and the question travels in `decision_reason` where they read it.
 */
export async function requestChangeRequestInformation(
  _prev: ChangeRequestActionState,
  formData: FormData,
): Promise<ChangeRequestActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectManage(projectId)

  const parsed = declineChangeRequestSchema.safeParse({
    projectId,
    requestId: formData.get('requestId'),
    decisionReason: formData.get('decisionReason'),
  })
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) }
  const input = parsed.data

  const supabase = await createClient()
  const request = await loadRequest(supabase, projectId, input.requestId)
  if (!request) return { error: 'ไม่พบคำขอนี้ในโปรเจกต์' }

  const result = await applyTransition(
    projectId,
    request,
    'OPEN',
    { decision_reason: input.decisionReason },
    access.userId,
  )
  if (!result.ok) return { error: result.error }

  await logActivity({
    organizationId: access.organizationId,
    action: 'change_request.information_requested',
    entityType: 'change_request',
    entityId: request.id,
    projectId,
    metadata: { title: request.title },
  })

  revalidateChangeRequests(projectId)
  return { message: 'ส่งคำขอข้อมูลเพิ่มเติมแล้ว' }
}

/** APPROVED -> IN_PROGRESS. Work has actually begun. */
export async function startChangeRequestWork(
  _prev: ChangeRequestActionState,
  formData: FormData,
): Promise<ChangeRequestActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectManage(projectId)

  const parsed = changeRequestActionSchema.safeParse({
    projectId,
    requestId: formData.get('requestId'),
  })
  if (!parsed.success) return { error: 'คำขอไม่ถูกต้อง' }

  const supabase = await createClient()
  const request = await loadRequest(supabase, projectId, parsed.data.requestId)
  if (!request) return { error: 'ไม่พบคำขอนี้ในโปรเจกต์' }

  const result = await applyTransition(projectId, request, 'IN_PROGRESS', {}, access.userId)
  if (!result.ok) return { error: result.error }

  await logActivity({
    organizationId: access.organizationId,
    action: 'change_request.started',
    entityType: 'change_request',
    entityId: request.id,
    projectId,
    metadata: { title: request.title },
  })

  revalidateChangeRequests(projectId)
  return { message: 'เริ่มดำเนินการตามคำขอแล้ว' }
}

/** IN_PROGRESS -> COMPLETED. Terminal. */
export async function completeChangeRequest(
  _prev: ChangeRequestActionState,
  formData: FormData,
): Promise<ChangeRequestActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectManage(projectId)

  const parsed = changeRequestActionSchema.safeParse({
    projectId,
    requestId: formData.get('requestId'),
  })
  if (!parsed.success) return { error: 'คำขอไม่ถูกต้อง' }

  const supabase = await createClient()
  const request = await loadRequest(supabase, projectId, parsed.data.requestId)
  if (!request) return { error: 'ไม่พบคำขอนี้ในโปรเจกต์' }

  const now = new Date().toISOString()
  const result = await applyTransition(
    projectId,
    request,
    'COMPLETED',
    { completed_at: now, resolved_at: now },
    access.userId,
  )
  if (!result.ok) return { error: result.error }

  await logActivity({
    organizationId: access.organizationId,
    action: 'change_request.completed',
    entityType: 'change_request',
    entityId: request.id,
    projectId,
    metadata: { title: request.title },
  })

  revalidateChangeRequests(projectId)
  return { message: 'ปิดคำขอเรียบร้อยแล้ว' }
}

/** Cancelling. Reachable from every non-terminal state. */
export async function cancelChangeRequest(
  _prev: ChangeRequestActionState,
  formData: FormData,
): Promise<ChangeRequestActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectManage(projectId)

  const parsed = changeRequestActionSchema.safeParse({
    projectId,
    requestId: formData.get('requestId'),
  })
  if (!parsed.success) return { error: 'คำขอไม่ถูกต้อง' }

  const supabase = await createClient()
  const request = await loadRequest(supabase, projectId, parsed.data.requestId)
  if (!request) return { error: 'ไม่พบคำขอนี้ในโปรเจกต์' }

  const result = await applyTransition(
    projectId,
    request,
    'CANCELLED',
    { resolved_at: new Date().toISOString() },
    access.userId,
  )
  if (!result.ok) return { error: result.error }

  await logActivity({
    organizationId: access.organizationId,
    action: 'change_request.cancelled',
    entityType: 'change_request',
    entityId: request.id,
    projectId,
    metadata: { title: request.title },
  })

  revalidateChangeRequests(projectId)
  return { message: 'ยกเลิกคำขอแล้ว' }
}
