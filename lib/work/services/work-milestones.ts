'use server'

import { revalidatePath } from 'next/cache'

import { requireProjectAccess, requireProjectManage } from '@/lib/work/auth/permissions'
import { DEFAULT_TIMELINE_PHASES } from '@/lib/work/timeline-defaults'
import {
  assertValidWorkTransition,
  InvalidWorkMilestoneTransitionError,
} from '@/lib/work/auth/work-milestone-status'
import { createClient } from '@/lib/work/supabase/server'
import { createAdminClient } from '@/lib/work/supabase/admin'
import type { WorkMilestoneReviewStatus, WorkMilestoneStatus } from '@/lib/work/types/enums'
import {
  approveWorkMilestoneSchema,
  completeWorkMilestoneSchema,
  createWorkMilestoneSchema,
  reorderWorkMilestonesSchema,
  requestTimelineChangeSchema,
  requestWorkMilestoneChangesSchema,
  updateWorkMilestoneSchema,
  workMilestoneActionSchema,
} from '@/lib/work/validation/work-milestones'
import { logActivity } from './activity'
import type { ActivityAction } from '@/lib/work/types/activity-actions'

/**
 * Work milestone mutations — project EXECUTION.
 *
 * NOTHING IN THIS FILE TOUCHES MONEY. No payment, payment_milestone,
 * payment_plan, pricing item, quotation or VAT row is read for a decision or
 * written anywhere below. `payment_milestone_id` is set as a plain reference
 * and never consulted to decide whether work may proceed — payment status
 * governs money, work status governs execution, and the two are allowed to
 * disagree (docs/PROJECT_TIMELINE.md §11).
 *
 * Every staff action follows the house four steps: authorize, parse, write
 * through the request-scoped client so RLS re-checks it, log. Status changes
 * additionally pass `assertValidWorkTransition` BEFORE any write, and scope
 * their UPDATE with `.eq('status', from)` so a concurrent change fails safely
 * instead of overwriting a status the check never saw.
 */

export type WorkMilestoneActionState = {
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

function revalidateTimeline(projectId: string) {
  revalidatePath(`/work/admin/projects/${projectId}`)
  revalidatePath(`/work/admin/projects/${projectId}/timeline`)
  revalidatePath(`/work/portal/projects/${projectId}`)
  revalidatePath(`/work/portal/projects/${projectId}/timeline`)
}

type MilestoneRow = {
  id: string
  project_id: string
  title: string
  status: WorkMilestoneStatus
  client_review_required: boolean
  client_review_status: WorkMilestoneReviewStatus
  due_date: string | null
  started_at: string | null
}

const MILESTONE_GUARD_COLUMNS =
  'id, project_id, title, status, client_review_required, client_review_status, due_date, started_at'

/** Reads one milestone UNDER THE CALLER'S SESSION, so RLS decides whether it exists for them. */
async function readMilestone(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  milestoneId: string,
): Promise<MilestoneRow | null> {
  const { data } = await supabase
    .from('project_work_milestones')
    .select(MILESTONE_GUARD_COLUMNS)
    .eq('id', milestoneId)
    .eq('project_id', projectId)
    .maybeSingle<MilestoneRow>()
  return data
}

/**
 * Seeds a project's timeline with DEFAULT_TIMELINE_PHASES.
 *
 * Refuses when the project already has any milestone, cancelled ones
 * included. A "seed" that appended to an existing timeline would silently
 * duplicate a customised plan, and there is no safe way to guess which of the
 * two the admin meant to keep — so this only ever acts on an empty timeline,
 * and says so when it declines.
 *
 * No dates are set. A default schedule invented by the system would be a
 * commitment nobody made; admin fills the dates in per project.
 */
export async function applyDefaultTimeline(
  _prev: WorkMilestoneActionState,
  formData: FormData,
): Promise<WorkMilestoneActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectManage(projectId)

  const supabase = await createClient()

  const { count: existing, error: countError } = await supabase
    .from('project_work_milestones')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)

  if (countError) {
    console.error('[work-milestones] template precheck failed:', countError)
    return { error: 'ไม่สามารถตรวจสอบไทม์ไลน์เดิมได้ กรุณาลองใหม่อีกครั้ง' }
  }
  if (existing && existing > 0) {
    return { error: 'โปรเจกต์นี้มีไทม์ไลน์อยู่แล้ว — เพิ่มไมล์สโตนทีละรายการแทน' }
  }

  const { error } = await supabase.from('project_work_milestones').insert(
    DEFAULT_TIMELINE_PHASES.map((entry, index) => ({
      project_id: projectId,
      sequence: index + 1,
      title: entry.title,
      phase: entry.phase,
      client_review_required: entry.clientReviewRequired,
      client_review_status: entry.clientReviewRequired ? 'PENDING' : 'NOT_REQUIRED',
      created_by: access.userId,
    })),
  )

  if (error) {
    console.error('[work-milestones] template insert failed:', error)
    return { error: 'ไม่สามารถสร้างไทม์ไลน์เริ่มต้นได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'work_milestone.template_applied',
    entityType: 'project',
    entityId: projectId,
    projectId,
    metadata: { phases: DEFAULT_TIMELINE_PHASES.map((entry) => entry.phase) },
  })

  revalidateTimeline(projectId)
  return { message: 'สร้างไทม์ไลน์เริ่มต้นแล้ว — แก้ไขชื่อและวันที่ได้ตามต้องการ' }
}

// -----------------------------------------------------------------------------
// Staff — create / edit / reorder
// -----------------------------------------------------------------------------
export async function createWorkMilestone(
  _prev: WorkMilestoneActionState,
  formData: FormData,
): Promise<WorkMilestoneActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectManage(projectId)

  const parsed = createWorkMilestoneSchema.safeParse({
    projectId,
    title: formData.get('title'),
    description: formData.get('description') ?? undefined,
    phase: formData.get('phase') ?? undefined,
    startDate: formData.get('startDate') ?? undefined,
    dueDate: formData.get('dueDate') ?? undefined,
    responsibleId: formData.get('responsibleId') ?? undefined,
    paymentMilestoneId: formData.get('paymentMilestoneId') ?? undefined,
    clientReviewRequired: formData.get('clientReviewRequired'),
    notes: formData.get('notes') ?? undefined,
  })
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) }

  const input = parsed.data
  const supabase = await createClient()

  // Appended to the end. `sequence` is never taken from the form — a caller
  // choosing their own would collide with the unique (project_id, sequence)
  // constraint, or silently reorder somebody else's milestone.
  const { data: last } = await supabase
    .from('project_work_milestones')
    .select('sequence')
    .eq('project_id', projectId)
    .order('sequence', { ascending: false })
    .limit(1)
    .maybeSingle<{ sequence: number }>()

  const { data: created, error } = await supabase
    .from('project_work_milestones')
    .insert({
      project_id: projectId,
      sequence: (last?.sequence ?? 0) + 1,
      title: input.title,
      description: input.description,
      phase: input.phase,
      start_date: input.startDate,
      due_date: input.dueDate,
      responsible_id: input.responsibleId,
      payment_milestone_id: input.paymentMilestoneId,
      client_review_required: input.clientReviewRequired,
      client_review_status: input.clientReviewRequired ? 'PENDING' : 'NOT_REQUIRED',
      notes: input.notes,
      created_by: access.userId,
    })
    .select('id')
    .single<{ id: string }>()

  if (error || !created) {
    console.error('[work-milestones] create failed:', error)
    // 23503 = the payment milestone does not belong to this project (the
    // composite FK added in migration 0035).
    if (error?.code === '23503') {
      return { fieldErrors: { paymentMilestoneId: 'ไม่พบงวดการชำระเงินนี้ในโปรเจกต์' } }
    }
    return { error: 'ไม่สามารถเพิ่มไมล์สโตนได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'work_milestone.created',
    entityType: 'work_milestone',
    entityId: created.id,
    projectId,
    metadata: { title: input.title, dueDate: input.dueDate, reviewRequired: input.clientReviewRequired },
  })

  revalidateTimeline(projectId)
  return { message: 'เพิ่มไมล์สโตนแล้ว' }
}

/**
 * Edits the descriptive fields of a milestone. Cannot change `status` —
 * that goes through the transition actions below.
 *
 * A deadline change is logged as its own event
 * (`work_milestone.deadline_changed`) rather than folded into the generic
 * update, because "when did this slip, and to when" is the question a late
 * project actually gets asked.
 *
 * NOTE (docs/PROJECT_TIMELINE.md §15): this NEVER touches the quotation,
 * the payment plan, or pricing. A timeline change that genuinely affects
 * price or scope goes through the existing change-request workflow — this
 * action has no code path to any of those tables.
 */
export async function updateWorkMilestone(
  _prev: WorkMilestoneActionState,
  formData: FormData,
): Promise<WorkMilestoneActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectManage(projectId)

  const parsed = updateWorkMilestoneSchema.safeParse({
    projectId,
    milestoneId: formData.get('milestoneId'),
    title: formData.get('title'),
    description: formData.get('description') ?? undefined,
    phase: formData.get('phase') ?? undefined,
    startDate: formData.get('startDate') ?? undefined,
    dueDate: formData.get('dueDate') ?? undefined,
    responsibleId: formData.get('responsibleId') ?? undefined,
    paymentMilestoneId: formData.get('paymentMilestoneId') ?? undefined,
    clientReviewRequired: formData.get('clientReviewRequired'),
    notes: formData.get('notes') ?? undefined,
  })
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) }

  const input = parsed.data
  const supabase = await createClient()

  const existing = await readMilestone(supabase, projectId, input.milestoneId)
  if (!existing) return { error: 'ไม่พบไมล์สโตนนี้' }
  if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
    return { error: 'ไมล์สโตนที่ปิดแล้วไม่สามารถแก้ไขได้' }
  }

  // Turning review off on a milestone already awaiting review would strand a
  // client mid-decision; turning it on mid-flight re-opens the gate.
  const nextReviewStatus: WorkMilestoneReviewStatus = !input.clientReviewRequired
    ? 'NOT_REQUIRED'
    : existing.client_review_status === 'NOT_REQUIRED'
      ? 'PENDING'
      : existing.client_review_status

  const { error } = await supabase
    .from('project_work_milestones')
    .update({
      title: input.title,
      description: input.description,
      phase: input.phase,
      start_date: input.startDate,
      due_date: input.dueDate,
      responsible_id: input.responsibleId,
      payment_milestone_id: input.paymentMilestoneId,
      client_review_required: input.clientReviewRequired,
      client_review_status: nextReviewStatus,
      notes: input.notes,
    })
    .eq('id', input.milestoneId)
    .eq('project_id', projectId)

  if (error) {
    console.error('[work-milestones] update failed:', error)
    if (error.code === '23503') {
      return { fieldErrors: { paymentMilestoneId: 'ไม่พบงวดการชำระเงินนี้ในโปรเจกต์' } }
    }
    return { error: 'ไม่สามารถบันทึกการเปลี่ยนแปลงได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'work_milestone.updated',
    entityType: 'work_milestone',
    entityId: input.milestoneId,
    projectId,
    metadata: { title: input.title },
  })

  if (existing.due_date !== input.dueDate) {
    await logActivity({
      organizationId: access.organizationId,
      action: 'work_milestone.deadline_changed',
      entityType: 'work_milestone',
      entityId: input.milestoneId,
      projectId,
      metadata: { from: existing.due_date, to: input.dueDate, title: input.title },
    })
  }

  revalidateTimeline(projectId)
  return { message: 'บันทึกไมล์สโตนแล้ว' }
}

/**
 * Reorders the timeline. Takes the FULL ordered list of ids and rewrites
 * `sequence` to match its index.
 *
 * The unique (project_id, sequence) constraint is DEFERRABLE INITIALLY
 * DEFERRED (migration 0035) precisely so this can renumber without a
 * temporary out-of-range pass — but PostgREST sends each update as its own
 * statement in its own transaction, so the rewrite is done in two passes:
 * everything first moved into a high, collision-free band, then down into
 * place. Ugly, and load-bearing: a single pass would collide the moment two
 * milestones swap.
 */
export async function reorderWorkMilestones(
  _prev: WorkMilestoneActionState,
  formData: FormData,
): Promise<WorkMilestoneActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectManage(projectId)

  const parsed = reorderWorkMilestonesSchema.safeParse({
    projectId,
    milestoneIds: formData.get('milestoneIds') ?? '[]',
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' }

  const { milestoneIds } = parsed.data
  const supabase = await createClient()

  // The submitted list must be exactly this project's milestones — no more,
  // no fewer. Anything else means the browser is working from a stale view,
  // or from another project's ids.
  const { data: existing } = await supabase
    .from('project_work_milestones')
    .select('id')
    .eq('project_id', projectId)

  const existingIds = new Set(((existing ?? []) as { id: string }[]).map((row) => row.id))
  if (existingIds.size !== milestoneIds.length || !milestoneIds.every((id) => existingIds.has(id))) {
    return { error: 'รายการไมล์สโตนไม่ตรงกัน กรุณารีเฟรชหน้านี้แล้วลองใหม่' }
  }

  const OFFSET = 100000
  for (const [index, id] of milestoneIds.entries()) {
    const { error } = await supabase
      .from('project_work_milestones')
      .update({ sequence: OFFSET + index + 1 })
      .eq('id', id)
      .eq('project_id', projectId)
    if (error) {
      console.error('[work-milestones] reorder pass 1 failed:', error)
      return { error: 'ไม่สามารถจัดเรียงใหม่ได้ กรุณารีเฟรชหน้านี้' }
    }
  }
  for (const [index, id] of milestoneIds.entries()) {
    const { error } = await supabase
      .from('project_work_milestones')
      .update({ sequence: index + 1 })
      .eq('id', id)
      .eq('project_id', projectId)
    if (error) {
      console.error('[work-milestones] reorder pass 2 failed:', error)
      return { error: 'จัดเรียงไม่สำเร็จบางส่วน กรุณารีเฟรชหน้านี้แล้วลองใหม่' }
    }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'work_milestone.reordered',
    entityType: 'work_milestone',
    projectId,
    metadata: { count: milestoneIds.length },
  })

  revalidateTimeline(projectId)
  return { message: 'จัดเรียงไทม์ไลน์ใหม่แล้ว' }
}

// -----------------------------------------------------------------------------
// Staff — status transitions
// -----------------------------------------------------------------------------
async function transition(
  formData: FormData,
  to: WorkMilestoneStatus,
  options: {
    action: ActivityAction
    successMessage: string
    /** Extra columns written alongside the status. */
    patch?: (row: MilestoneRow, userId: string) => Record<string, unknown>
    /** Refuse before the transition check, with this message. */
    precondition?: (row: MilestoneRow) => string | null
  },
): Promise<WorkMilestoneActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectManage(projectId)

  const parsed = workMilestoneActionSchema.safeParse({
    projectId,
    milestoneId: formData.get('milestoneId'),
  })
  if (!parsed.success) return { error: 'คำขอไม่ถูกต้อง' }

  const supabase = await createClient()
  const milestone = await readMilestone(supabase, projectId, parsed.data.milestoneId)
  if (!milestone) return { error: 'ไม่พบไมล์สโตนนี้' }

  const blocked = options.precondition?.(milestone)
  if (blocked) return { error: blocked }

  try {
    assertValidWorkTransition(milestone.status, to)
  } catch (error) {
    if (error instanceof InvalidWorkMilestoneTransitionError) {
      return { error: 'ไม่สามารถเปลี่ยนสถานะจากสถานะปัจจุบันได้' }
    }
    throw error
  }

  const { error } = await supabase
    .from('project_work_milestones')
    .update({ status: to, ...(options.patch?.(milestone, access.userId) ?? {}) })
    .eq('id', milestone.id)
    .eq('project_id', projectId)
    // Belt and braces against a concurrent change between the read above and
    // this write — the same guard every project-status action uses.
    .eq('status', milestone.status)

  if (error) {
    console.error(`[work-milestones] ${options.action} failed:`, error)
    return { error: 'ไม่สามารถอัปเดตสถานะได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: options.action,
    entityType: 'work_milestone',
    entityId: milestone.id,
    projectId,
    metadata: { title: milestone.title, from: milestone.status, to },
  })

  revalidateTimeline(projectId)
  return { message: options.successMessage }
}

export async function startWorkMilestone(
  _prev: WorkMilestoneActionState,
  formData: FormData,
): Promise<WorkMilestoneActionState> {
  return transition(formData, 'IN_PROGRESS', {
    action: 'work_milestone.started',
    successMessage: 'เริ่มไมล์สโตนแล้ว',
    // Re-opening after CHANGES_REQUESTED clears the client's verdict so the
    // gate closes again — otherwise the next submit would still read as
    // "changes requested" and the client would never be asked again.
    //
    // `started_at` is written ONLY when still null (migration 0038). A
    // re-open is not a new start: overwriting it would erase the real
    // planned-vs-actual comparison every time a milestone bounced back.
    patch: (row) => ({
      ...(row.started_at ? {} : { started_at: new Date().toISOString() }),
      ...(row.client_review_required
        ? { client_review_status: 'PENDING', submitted_for_review_at: null }
        : {}),
    }),
  })
}

export async function submitWorkMilestoneForReview(
  _prev: WorkMilestoneActionState,
  formData: FormData,
): Promise<WorkMilestoneActionState> {
  return transition(formData, 'IN_REVIEW', {
    action: 'work_milestone.submitted_for_review',
    successMessage: 'ส่งไมล์สโตนให้ตรวจรับแล้ว',
    patch: (row) => ({
      submitted_for_review_at: new Date().toISOString(),
      ...(row.client_review_required ? { client_review_status: 'PENDING' } : {}),
    }),
  })
}

export async function blockWorkMilestone(
  _prev: WorkMilestoneActionState,
  formData: FormData,
): Promise<WorkMilestoneActionState> {
  return transition(formData, 'BLOCKED', {
    action: 'work_milestone.blocked',
    successMessage: 'ทำเครื่องหมายว่าติดปัญหาแล้ว',
  })
}

export async function cancelWorkMilestone(
  _prev: WorkMilestoneActionState,
  formData: FormData,
): Promise<WorkMilestoneActionState> {
  return transition(formData, 'CANCELLED', {
    action: 'work_milestone.cancelled',
    successMessage: 'ยกเลิกไมล์สโตนแล้ว',
  })
}

/**
 * Admin closes a milestone.
 *
 * THE REVIEW GATE (docs/PROJECT_TIMELINE.md §10): a milestone whose
 * `client_review_required` is true may NOT be completed until the client has
 * actually approved it — unless the admin supplies an explicit override
 * reason, which is recorded on the row AND logged as its own event. An
 * override with no stated cause is indistinguishable from a mistake, so the
 * reason is required, not optional, and the database constraint
 * `work_milestones_override_pair` refuses the row without one regardless.
 */
export async function completeWorkMilestone(
  _prev: WorkMilestoneActionState,
  formData: FormData,
): Promise<WorkMilestoneActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectManage(projectId)

  const parsed = completeWorkMilestoneSchema.safeParse({
    projectId,
    milestoneId: formData.get('milestoneId'),
    overrideReason: formData.get('overrideReason') ?? undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' }

  const supabase = await createClient()
  const milestone = await readMilestone(supabase, projectId, parsed.data.milestoneId)
  if (!milestone) return { error: 'ไม่พบไมล์สโตนนี้' }

  const needsOverride =
    milestone.client_review_required && milestone.client_review_status !== 'APPROVED'

  if (needsOverride && !parsed.data.overrideReason) {
    return {
      error:
        'ไมล์สโตนนี้ต้องให้ลูกค้าตรวจรับก่อนปิดงาน — หากต้องการปิดงานโดยไม่รอลูกค้า กรุณาระบุเหตุผล',
    }
  }

  try {
    assertValidWorkTransition(milestone.status, 'COMPLETED')
  } catch (error) {
    if (error instanceof InvalidWorkMilestoneTransitionError) {
      return { error: 'ไม่สามารถปิดไมล์สโตนจากสถานะปัจจุบันได้' }
    }
    throw error
  }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('project_work_milestones')
    .update({
      status: 'COMPLETED',
      completed_at: now,
      completed_by: access.userId,
      ...(needsOverride
        ? { override_reason: parsed.data.overrideReason, overridden_by: access.userId, overridden_at: now }
        : {}),
    })
    .eq('id', milestone.id)
    .eq('project_id', projectId)
    .eq('status', milestone.status)

  if (error) {
    console.error('[work-milestones] complete failed:', error)
    return { error: 'ไม่สามารถปิดไมล์สโตนได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'work_milestone.completed',
    entityType: 'work_milestone',
    entityId: milestone.id,
    projectId,
    metadata: { title: milestone.title, from: milestone.status, overridden: needsOverride },
  })

  if (needsOverride) {
    await logActivity({
      organizationId: access.organizationId,
      action: 'work_milestone.admin_override',
      entityType: 'work_milestone',
      entityId: milestone.id,
      projectId,
      metadata: {
        title: milestone.title,
        reason: parsed.data.overrideReason,
        reviewStatus: milestone.client_review_status,
      },
    })
  }

  revalidateTimeline(projectId)
  return { message: needsOverride ? 'ปิดไมล์สโตนโดยข้ามการตรวจรับแล้ว' : 'ปิดไมล์สโตนแล้ว' }
}

// -----------------------------------------------------------------------------
// Client — review
// -----------------------------------------------------------------------------
/**
 * The client's verdict on a milestone waiting for them.
 *
 * WHY THE PRIVILEGED CLIENT, AND WHY IT IS STILL SAFE: a client must be able
 * to approve or reject, and must NOT be able to move a deadline, a sequence,
 * an assignee or a status in the same write. RLS is row-level, not
 * column-level, so a client UPDATE policy permissive enough for the first
 * would permit the second — which is why migration 0035 deliberately grants
 * clients NO update policy at all.
 *
 * So the order of operations IS the security model, identical to
 * acceptAgreement / acceptPaymentPlan:
 *
 *   1. `requireProjectAccess` — is this caller on this project at all.
 *   2. Read the milestone UNDER THE CALLER'S OWN SESSION, so the SELECT
 *      policy decides whether it exists for them. Another project's
 *      milestone id comes back empty here and the request stops.
 *   3. ONLY THEN write, with the privileged client, a FIXED set of named
 *      review columns — never anything the form supplied beyond the note.
 */
async function clientReview(
  formData: FormData,
  verdict: 'APPROVED' | 'CHANGES_REQUESTED',
  note: string | null,
  options: { action: ActivityAction; successMessage: string },
): Promise<WorkMilestoneActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const milestoneId = String(formData.get('milestoneId') ?? '')

  const access = await requireProjectAccess(projectId)
  if (access.isStaff) {
    return { error: 'บัญชีทีมงานไม่สามารถตรวจรับแทนลูกค้าได้' }
  }

  const supabase = await createClient()
  const milestone = await readMilestone(supabase, projectId, milestoneId)
  if (!milestone) return { error: 'ไม่พบไมล์สโตนนี้' }

  if (!milestone.client_review_required) {
    return { error: 'ไมล์สโตนนี้ไม่ต้องให้ลูกค้าตรวจรับ' }
  }
  if (milestone.status !== 'IN_REVIEW') {
    return { error: 'ไมล์สโตนนี้ยังไม่ได้ส่งให้ตรวจรับ' }
  }

  const nextStatus: WorkMilestoneStatus = verdict === 'APPROVED' ? 'APPROVED' : 'CHANGES_REQUESTED'
  try {
    assertValidWorkTransition(milestone.status, nextStatus)
  } catch (error) {
    if (error instanceof InvalidWorkMilestoneTransitionError) {
      return { error: 'ไม่สามารถตรวจรับจากสถานะปัจจุบันได้' }
    }
    throw error
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('project_work_milestones')
    .update({
      status: nextStatus,
      client_review_status: verdict,
      client_review_note: note,
      client_reviewed_by: access.userId,
      client_reviewed_at: new Date().toISOString(),
    })
    .eq('id', milestone.id)
    .eq('project_id', projectId)
    .eq('status', 'IN_REVIEW')

  if (error) {
    console.error(`[work-milestones] ${options.action} failed:`, error)
    return { error: 'ไม่สามารถบันทึกผลการตรวจรับได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: options.action,
    entityType: 'work_milestone',
    entityId: milestone.id,
    projectId,
    metadata: { title: milestone.title, note },
  })

  revalidateTimeline(projectId)
  return { message: options.successMessage }
}

export async function approveWorkMilestone(
  _prev: WorkMilestoneActionState,
  formData: FormData,
): Promise<WorkMilestoneActionState> {
  const parsed = approveWorkMilestoneSchema.safeParse({
    projectId: formData.get('projectId'),
    milestoneId: formData.get('milestoneId'),
    note: formData.get('note') ?? undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' }

  return clientReview(formData, 'APPROVED', parsed.data.note, {
    action: 'work_milestone.approved',
    successMessage: 'อนุมัติไมล์สโตนแล้ว',
  })
}

export async function requestWorkMilestoneChanges(
  _prev: WorkMilestoneActionState,
  formData: FormData,
): Promise<WorkMilestoneActionState> {
  const parsed = requestWorkMilestoneChangesSchema.safeParse({
    projectId: formData.get('projectId'),
    milestoneId: formData.get('milestoneId'),
    message: formData.get('message'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' }

  return clientReview(formData, 'CHANGES_REQUESTED', parsed.data.message, {
    action: 'work_milestone.changes_requested',
    successMessage: 'ส่งคำขอแก้ไขแล้ว',
  })
}

/**
 * A client asking for a timeline change (docs/PROJECT_TIMELINE.md §16).
 *
 * Does NOT modify the official timeline — it opens a row in the EXISTING
 * `change_requests` table (migration 0014), reusing the workflow that already
 * knows how to price and approve a change. That reuse is the point: a
 * timeline request that turns out to affect scope or price is then already
 * sitting in the process that handles those, instead of in a parallel one
 * that does not.
 *
 * Status and price are absent from the form and from this insert — a client
 * who could set either would be approving and pricing their own request. RLS
 * backs it: `change_requests_insert` is scoped to
 * `app.is_project_client(project_id) and requested_by = auth.uid()`.
 */
export async function requestTimelineChange(
  _prev: WorkMilestoneActionState,
  formData: FormData,
): Promise<WorkMilestoneActionState> {
  const parsed = requestTimelineChangeSchema.safeParse({
    projectId: formData.get('projectId'),
    milestoneId: formData.get('milestoneId') ?? undefined,
    title: formData.get('title'),
    description: formData.get('description'),
  })
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) }

  const { projectId, milestoneId, title, description } = parsed.data
  const access = await requireProjectAccess(projectId)
  if (access.isStaff) return { error: 'บัญชีทีมงานไม่สามารถส่งคำขอในนามลูกค้าได้' }

  const supabase = await createClient()
  const { error } = await supabase.from('change_requests').insert({
    project_id: projectId,
    title: `[ไทม์ไลน์] ${title}`,
    description: milestoneId ? `${description}\n\n(เกี่ยวกับไมล์สโตน: ${milestoneId})` : description,
    status: 'OPEN',
    priority: 'NORMAL',
    requested_by: access.userId,
  })

  if (error) {
    console.error('[work-milestones] timeline change request failed:', error)
    return { error: 'ไม่สามารถส่งคำขอได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'work_milestone.timeline_change_requested',
    entityType: 'change_request',
    projectId,
    metadata: { title, milestoneId },
  })

  revalidateTimeline(projectId)
  revalidatePath(`/work/portal/projects/${projectId}/change-requests`)
  revalidatePath('/work/admin/change-requests')

  return { message: 'ส่งคำขอเปลี่ยนแปลงไทม์ไลน์แล้ว ทีมงานจะพิจารณาและติดต่อกลับ' }
}
