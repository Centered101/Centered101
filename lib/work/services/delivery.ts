'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

import { getUser } from '@/lib/work/auth/session'
import { requireProjectAccess, requireProjectManage } from '@/lib/work/auth/permissions'
import { assertValidTransition, InvalidStatusTransitionError } from '@/lib/work/auth/project-status'
import { createClient } from '@/lib/work/supabase/server'
import { computeHandoverReadiness, getDeliverables } from '@/lib/work/queries/delivery'
import {
  acknowledgeHandoverSchema,
  completeHandoverSchema,
  createDeliverableSchema,
  deliverableActionSchema,
  setDeliverableStatusSchema,
  updateDeliverableSchema,
} from '@/lib/work/validation/delivery'
import { logActivity } from './activity'

export type DeliveryActionState = {
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

function revalidateDelivery(projectId: string) {
  revalidatePath(`/work/admin/projects/${projectId}/delivery`)
  revalidatePath(`/work/portal/projects/${projectId}/delivery`)
  revalidatePath(`/work/portal/projects/${projectId}`)
}

function clientIp(headerList: Headers): string | null {
  const forwardedFor = headerList.get('x-forwarded-for')
  return forwardedFor?.split(',')[0]?.trim() || headerList.get('x-real-ip') || null
}

/**
 * EVERY staff action here is gated on `requireProjectManage`, mirroring
 * `project_deliverables`' own policies (`app.can_manage_project` —
 * super_admin/admin/developer).
 *
 * NOT `requireProjectFinance`. An accountant settles the final payment; they
 * do not decide that a deliverable was handed over. An app gate wider than the
 * policy beneath it is the F1 defect, and every write below also checks
 * `count` so a refusal can never surface as a success message.
 */

/**
 * Builds the AGREED list from the client's intake request, once.
 *
 * Reads `projects.requested_delivery` — the client's actual ask — and creates
 * one row per item with `client_requested = true`. That flag is set HERE, from
 * the real request, and never from a form: it is the link between the two
 * lists, and it has to be a fact rather than an assertion.
 *
 * Additive and idempotent. Existing rows are left exactly as they are, so
 * running this twice cannot resurrect an item staff deliberately deleted, nor
 * reset the status of one already delivered.
 */
export async function seedDeliverablesFromRequest(
  _prev: DeliveryActionState,
  formData: FormData,
): Promise<DeliveryActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectManage(projectId)

  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('requested_delivery')
    .eq('id', projectId)
    .maybeSingle<{ requested_delivery: string[] | null }>()

  const requested = project?.requested_delivery ?? []
  if (requested.length === 0) {
    return { error: 'ลูกค้ายังไม่ได้ระบุรายการที่ต้องการให้ส่งมอบ' }
  }

  const { data: existing } = await supabase
    .from('project_deliverables')
    .select('item_key, title')
    .eq('project_id', projectId)

  // Match on item_key for canonical items and on title for bespoke ones — a
  // custom entry the client typed has no key to compare.
  const seenKeys = new Set((existing ?? []).map((row) => row.item_key).filter(Boolean))
  const seenTitles = new Set((existing ?? []).map((row) => row.title))

  const KNOWN = new Set([
    'production_website',
    'source_code',
    'documentation',
    'domain_setup',
    'admin_access',
    'user_access',
    'training',
    'credentials',
    'maintenance',
  ])

  const rows = requested
    .filter((entry) => (KNOWN.has(entry) ? !seenKeys.has(entry) : !seenTitles.has(entry)))
    .map((entry, index) => ({
      project_id: projectId,
      item_key: KNOWN.has(entry) ? entry : null,
      title: entry,
      client_requested: true,
      status: 'PENDING' as const,
      sort_order: index,
      created_by: access.userId,
    }))

  if (rows.length === 0) {
    return { message: 'รายการที่ลูกค้าขอถูกเพิ่มไว้ครบแล้ว' }
  }

  const { error, count } = await supabase
    .from('project_deliverables')
    .insert(rows, { count: 'exact' })

  if (error) {
    console.error('[delivery] seed failed:', error)
    return { error: 'ไม่สามารถสร้างรายการส่งมอบได้ กรุณาลองใหม่อีกครั้ง' }
  }
  if (!count) return { error: 'ไม่สามารถสร้างรายการส่งมอบได้ — ไม่มีสิทธิ์แก้ไขโปรเจกต์นี้' }

  await logActivity({
    organizationId: access.organizationId,
    action: 'deliverable.created',
    entityType: 'project',
    entityId: projectId,
    projectId,
    metadata: { seeded: count, from: 'requested_delivery' },
  })

  revalidateDelivery(projectId)
  return { message: `เพิ่มรายการส่งมอบจากคำขอของลูกค้าแล้ว ${count} รายการ` }
}

/** A deliverable staff agreed to that the client never asked for is valid — `client_requested` stays false. */
export async function createDeliverable(
  _prev: DeliveryActionState,
  formData: FormData,
): Promise<DeliveryActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectManage(projectId)

  const parsed = createDeliverableSchema.safeParse({
    projectId,
    itemKey: formData.get('itemKey') ?? undefined,
    title: formData.get('title'),
    description: formData.get('description') ?? undefined,
    notes: formData.get('notes') ?? undefined,
    documentId: formData.get('documentId') ?? undefined,
  })
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) }
  const input = parsed.data

  const supabase = await createClient()

  const { count: existingCount } = await supabase
    .from('project_deliverables')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)

  const { error, count } = await supabase.from('project_deliverables').insert(
    {
      project_id: projectId,
      item_key: input.itemKey,
      title: input.title,
      description: input.description,
      notes: input.notes,
      document_id: input.documentId,
      client_requested: false,
      sort_order: existingCount ?? 0,
      created_by: access.userId,
    },
    { count: 'exact' },
  )

  if (error) {
    console.error('[delivery] create failed:', error)
    // 23505 = the canonical key already exists on this project.
    if (error.code === '23505') return { error: 'มีรายการนี้อยู่แล้วในโปรเจกต์' }
    return { error: 'ไม่สามารถเพิ่มรายการได้ กรุณาลองใหม่อีกครั้ง' }
  }
  if (!count) return { error: 'ไม่สามารถเพิ่มรายการได้ — ไม่มีสิทธิ์แก้ไขโปรเจกต์นี้' }

  await logActivity({
    organizationId: access.organizationId,
    action: 'deliverable.created',
    entityType: 'project',
    entityId: projectId,
    projectId,
    metadata: { title: input.title, itemKey: input.itemKey },
  })

  revalidateDelivery(projectId)
  return { message: 'เพิ่มรายการส่งมอบแล้ว' }
}

export async function updateDeliverable(
  _prev: DeliveryActionState,
  formData: FormData,
): Promise<DeliveryActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectManage(projectId)

  const parsed = updateDeliverableSchema.safeParse({
    projectId,
    deliverableId: formData.get('deliverableId'),
    itemKey: formData.get('itemKey') ?? undefined,
    title: formData.get('title'),
    description: formData.get('description') ?? undefined,
    notes: formData.get('notes') ?? undefined,
    documentId: formData.get('documentId') ?? undefined,
  })
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) }
  const input = parsed.data

  const supabase = await createClient()

  // `.eq('project_id', projectId)` beside the id: the id came from the browser,
  // and without this a valid deliverable id from ANOTHER project would be
  // edited under this project's authorization. RLS confines it to the
  // organization, not to the project the caller was authorized for.
  const { error, count } = await supabase
    .from('project_deliverables')
    .update(
      {
        item_key: input.itemKey,
        title: input.title,
        description: input.description,
        notes: input.notes,
        document_id: input.documentId,
      },
      { count: 'exact' },
    )
    .eq('id', input.deliverableId)
    .eq('project_id', projectId)

  if (error) {
    console.error('[delivery] update failed:', error)
    return { error: 'ไม่สามารถบันทึกการแก้ไขได้ กรุณาลองใหม่อีกครั้ง' }
  }
  if (!count) return { error: 'ไม่พบรายการนี้ในโปรเจกต์' }

  await logActivity({
    organizationId: access.organizationId,
    action: 'deliverable.updated',
    entityType: 'project',
    entityId: projectId,
    projectId,
    metadata: { title: input.title },
  })

  revalidateDelivery(projectId)
  return { message: 'บันทึกการแก้ไขแล้ว' }
}

/**
 * Moves ONE deliverable's state, as its own action with its own audit entry.
 *
 * Separate from `updateDeliverable` because "when was this handed over, and by
 * whom" is the question a delivery dispute asks, and folding it into a generic
 * edit would bury the answer. `delivered_at`/`delivered_by` are written here
 * from the server clock and the session, never from the form.
 */
export async function setDeliverableStatus(
  _prev: DeliveryActionState,
  formData: FormData,
): Promise<DeliveryActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectManage(projectId)

  const parsed = setDeliverableStatusSchema.safeParse({
    projectId,
    deliverableId: formData.get('deliverableId'),
    status: formData.get('status'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'คำขอไม่ถูกต้อง' }
  const input = parsed.data

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('project_deliverables')
    .select('id, title, status')
    .eq('id', input.deliverableId)
    .eq('project_id', projectId)
    .maybeSingle<{ id: string; title: string; status: string }>()

  if (!existing) return { error: 'ไม่พบรายการนี้ในโปรเจกต์' }
  if (existing.status === input.status) return { message: 'สถานะเป็นค่านี้อยู่แล้ว' }

  const becomingDelivered = input.status === 'DELIVERED'
  const { error, count } = await supabase
    .from('project_deliverables')
    .update(
      {
        status: input.status,
        // Leaving DELIVERED clears the pair, so the constraint stays satisfied
        // and a withdrawn delivery does not keep a stale timestamp.
        delivered_at: becomingDelivered ? new Date().toISOString() : null,
        delivered_by: becomingDelivered ? access.userId : null,
      },
      { count: 'exact' },
    )
    .eq('id', input.deliverableId)
    .eq('project_id', projectId)

  if (error) {
    console.error('[delivery] status change failed:', error)
    return { error: 'ไม่สามารถเปลี่ยนสถานะได้ กรุณาลองใหม่อีกครั้ง' }
  }
  if (!count) return { error: 'ไม่พบรายการนี้ในโปรเจกต์' }

  await logActivity({
    organizationId: access.organizationId,
    action: becomingDelivered ? 'deliverable.delivered' : 'deliverable.updated',
    entityType: 'project',
    entityId: projectId,
    projectId,
    metadata: { title: existing.title, from: existing.status, to: input.status },
  })

  revalidateDelivery(projectId)
  return { message: 'อัปเดตสถานะรายการแล้ว' }
}

/** Removing an item agreed in error. The policy refuses this once it is DELIVERED. */
export async function deleteDeliverable(
  _prev: DeliveryActionState,
  formData: FormData,
): Promise<DeliveryActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectManage(projectId)

  const parsed = deliverableActionSchema.safeParse({
    projectId,
    deliverableId: formData.get('deliverableId'),
  })
  if (!parsed.success) return { error: 'คำขอไม่ถูกต้อง' }

  const supabase = await createClient()
  const { error, count } = await supabase
    .from('project_deliverables')
    .delete({ count: 'exact' })
    .eq('id', parsed.data.deliverableId)
    .eq('project_id', projectId)

  if (error) {
    console.error('[delivery] delete failed:', error)
    return { error: 'ไม่สามารถลบรายการได้ กรุณาลองใหม่อีกครั้ง' }
  }
  // Zero rows is the DELETE policy refusing a DELIVERED item, which is a real
  // rule and deserves a real message rather than a fake success.
  if (!count) return { error: 'ลบไม่ได้ — รายการที่ส่งมอบแล้วจะถูกเก็บไว้เป็นหลักฐาน' }

  await logActivity({
    organizationId: access.organizationId,
    action: 'deliverable.updated',
    entityType: 'project',
    entityId: projectId,
    projectId,
    metadata: { deleted: parsed.data.deliverableId },
  })

  revalidateDelivery(projectId)
  return { message: 'ลบรายการแล้ว' }
}

/**
 * The handover itself: READY_FOR_DELIVERY -> DELIVERED.
 *
 * A legal edge in the transition graph that, until Phase 7, no action
 * performed. Three things must hold, all re-derived from the database here
 * rather than trusted from the page that rendered the button:
 *
 *   1. the caller may manage this project;
 *   2. the project is actually in READY_FOR_DELIVERY (assertValidTransition
 *      re-checks the edge even so);
 *   3. every agreed deliverable is DELIVERED or WAIVED.
 *
 * The status write runs under the caller's own session, so
 * `projects_update_staff` and `guard_project_status_write` both check it
 * again underneath — no privileged client is needed or used, because
 * `requireProjectManage` and that policy admit exactly the same roles.
 */
export async function completeHandover(
  _prev: DeliveryActionState,
  formData: FormData,
): Promise<DeliveryActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectManage(projectId)

  const parsed = completeHandoverSchema.safeParse({
    projectId,
    summary: formData.get('summary') ?? undefined,
  })
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) }

  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('id, status')
    .eq('id', projectId)
    .maybeSingle<{ id: string; status: string }>()

  if (!project) return { error: 'ไม่พบโปรเจกต์นี้' }

  try {
    assertValidTransition(project.status as never, 'DELIVERED')
  } catch (error) {
    if (error instanceof InvalidStatusTransitionError) {
      return { error: 'โปรเจกต์ยังไม่อยู่ในสถานะพร้อมส่งมอบ' }
    }
    throw error
  }

  // Re-derived server-side. The admin page shows the same figure, but a
  // disabled button is not a control.
  const deliverables = await getDeliverables(projectId)
  if (deliverables.length === 0) {
    return { error: 'ยังไม่มีรายการส่งมอบ กรุณาเพิ่มรายการก่อนส่งมอบ' }
  }

  const readiness = computeHandoverReadiness(deliverables)
  if (!readiness.isComplete) {
    return {
      error: `ยังมีรายการที่ยังไม่ส่งมอบ ${readiness.outstanding.length} รายการ: ${readiness.outstanding
        .map((item) => item.title)
        .slice(0, 3)
        .join(', ')}`,
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const { error, count } = await supabase
    .from('projects')
    .update({ status: 'DELIVERED', actual_delivery: today }, { count: 'exact' })
    .eq('id', projectId)
    // Concurrency guard: if someone moved the project since the read above,
    // this matches nothing and is reported as a failure rather than a success.
    .eq('status', project.status)

  if (error) {
    console.error('[delivery] handover failed:', error)
    return { error: 'ไม่สามารถบันทึกการส่งมอบได้ กรุณาลองใหม่อีกครั้ง' }
  }
  if (!count) {
    return { error: 'สถานะโปรเจกต์เปลี่ยนไปแล้ว กรุณารีเฟรชหน้านี้แล้วลองใหม่' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'handover.completed',
    entityType: 'project',
    entityId: projectId,
    projectId,
    metadata: {
      summary: parsed.data.summary,
      delivered: readiness.delivered,
      waived: readiness.waived,
    },
  })

  revalidateDelivery(projectId)
  return { message: 'บันทึกการส่งมอบเรียบร้อยแล้ว' }
}

/**
 * The client confirming they received the handover.
 *
 * The ONE write in this flow that belongs to the client side, and it is
 * append-only: `project_handover_acknowledgements` has no update or delete
 * policy and an immutability trigger besides. A confirmation that can be
 * edited afterwards is not evidence of anything.
 *
 * Name and email come from the authenticated profile, never from the form — a
 * form field would let someone acknowledge delivery in a colleague's name.
 * Acknowledging does not change project status: it records that the client
 * agrees, which is a different fact from the project being delivered, and
 * conflating them would let a client's click move the project's state.
 */
export async function acknowledgeHandover(
  _prev: DeliveryActionState,
  formData: FormData,
): Promise<DeliveryActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectAccess(projectId)

  const parsed = acknowledgeHandoverSchema.safeParse({
    projectId,
    note: formData.get('note') ?? undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'คำขอไม่ถูกต้อง' }

  const user = await getUser()
  if (!user) return { error: 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง' }

  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('status')
    .eq('id', projectId)
    .maybeSingle<{ status: string }>()

  // Acknowledging a handover that has not happened would be a confirmation of
  // nothing.
  if (project?.status !== 'DELIVERED') {
    return { error: 'ยังไม่มีการส่งมอบให้ยืนยัน' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .maybeSingle<{ full_name: string | null; email: string | null }>()

  const headerList = await headers()
  const { error } = await supabase.from('project_handover_acknowledgements').insert({
    project_id: projectId,
    acknowledged_by: user.id,
    acknowledged_name: profile?.full_name?.trim() || user.email || 'ไม่ระบุชื่อ',
    acknowledged_email: profile?.email ?? user.email ?? '',
    note: parsed.data.note,
    ip_address: clientIp(headerList),
    user_agent: headerList.get('user-agent'),
  })

  if (error) {
    // 23505 = this person already acknowledged. Idempotent, not an error:
    // clicking twice should not read as a failure.
    if (error.code === '23505') return { message: 'คุณได้ยืนยันการรับมอบไว้แล้ว' }
    console.error('[delivery] acknowledgement failed:', error)
    return { error: 'ไม่สามารถบันทึกการยืนยันได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'handover.acknowledged',
    entityType: 'project',
    entityId: projectId,
    projectId,
    metadata: { hasNote: parsed.data.note !== null },
  })

  revalidateDelivery(projectId)
  return { message: 'ขอบคุณ ระบบบันทึกการยืนยันรับมอบแล้ว' }
}
