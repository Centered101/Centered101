'use server'

import { revalidatePath } from 'next/cache'

import { requireProjectFinance, requireProjectManage } from '@/lib/work/auth/permissions'
import { createClient } from '@/lib/work/supabase/server'
import {
  createMaintenancePlanSchema,
  createMaintenanceRecordSchema,
  maintenanceRecordActionSchema,
  setMaintenanceStatusSchema,
  updateMaintenancePlanSchema,
} from '@/lib/work/validation/maintenance'
import { logActivity } from './activity'

export type MaintenanceActionState = {
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

function revalidateMaintenance(projectId: string) {
  revalidatePath(`/work/admin/projects/${projectId}/maintenance`)
  revalidatePath('/work/admin/maintenance')
  revalidatePath(`/work/portal/projects/${projectId}/maintenance`)
}

/**
 * TWO DIFFERENT GATES IN THIS FILE, ON PURPOSE.
 *
 *   PLANS  -> `requireProjectFinance`, mirroring `maintenance_plans_*_finance`
 *             (`app.can_manage_project_finance`, migration 0016). A maintenance
 *             plan is a BILLING product: what it costs, on what cycle, whether
 *             it is active. An accountant owning that is correct and is
 *             existing behaviour this phase preserves rather than narrows.
 *
 *   RECORDS -> `requireProjectManage`, mirroring `maintenance_records_*_staff`
 *             (`app.can_manage_project`, migration 0042). A record asserts that
 *             ENGINEERING WORK WAS PERFORMED. An accountant must not be able to
 *             claim that, and the client reads these rows as the answer to
 *             "what did my monthly fee buy".
 *
 * Each gate matches its table's policy exactly, so neither is wider than what
 * the database will actually allow — and every write checks `count`, so a
 * refusal can never surface as a success message.
 */

// -----------------------------------------------------------------------------
// Plans — billing
// -----------------------------------------------------------------------------

export async function createMaintenancePlan(
  _prev: MaintenanceActionState,
  formData: FormData,
): Promise<MaintenanceActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectFinance(projectId)

  const parsed = createMaintenancePlanSchema.safeParse({
    projectId,
    name: formData.get('name'),
    billingCycle: formData.get('billingCycle'),
    priceAmount: formData.get('priceAmount') ?? '0',
    services: formData.get('servicesJson') ?? '[]',
    startedOn: formData.get('startedOn') ?? undefined,
    nextBillingDate: formData.get('nextBillingDate') ?? undefined,
  })
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) }
  const input = parsed.data

  const supabase = await createClient()
  const { error, count } = await supabase.from('maintenance_plans').insert(
    {
      project_id: projectId,
      name: input.name,
      billing_cycle: input.billingCycle,
      price_amount: input.priceAmount,
      services: input.services,
      started_on: input.startedOn,
      next_billing_date: input.nextBillingDate,
      status: 'ACTIVE',
      created_by: access.userId,
    },
    { count: 'exact' },
  )

  if (error) {
    console.error('[maintenance] create plan failed:', error)
    return { error: 'ไม่สามารถสร้างแผนดูแลรักษาได้ กรุณาลองใหม่อีกครั้ง' }
  }
  if (!count) return { error: 'ไม่สามารถสร้างแผนได้ — ไม่มีสิทธิ์ในโปรเจกต์นี้' }

  await logActivity({
    organizationId: access.organizationId,
    action: 'maintenance.plan_created',
    entityType: 'maintenance_plan',
    entityId: projectId,
    projectId,
    metadata: { name: input.name, priceAmount: input.priceAmount, cycle: input.billingCycle },
  })

  revalidateMaintenance(projectId)
  return { message: 'สร้างแผนดูแลรักษาแล้ว' }
}

export async function updateMaintenancePlan(
  _prev: MaintenanceActionState,
  formData: FormData,
): Promise<MaintenanceActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectFinance(projectId)

  const parsed = updateMaintenancePlanSchema.safeParse({
    projectId,
    planId: formData.get('planId'),
    name: formData.get('name'),
    billingCycle: formData.get('billingCycle'),
    priceAmount: formData.get('priceAmount') ?? '0',
    services: formData.get('servicesJson') ?? '[]',
    startedOn: formData.get('startedOn') ?? undefined,
    nextBillingDate: formData.get('nextBillingDate') ?? undefined,
  })
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) }
  const input = parsed.data

  const supabase = await createClient()
  // `.eq('project_id', projectId)` beside the id — the project-level IDOR
  // guard every write in this codebase uses.
  const { error, count } = await supabase
    .from('maintenance_plans')
    .update(
      {
        name: input.name,
        billing_cycle: input.billingCycle,
        price_amount: input.priceAmount,
        services: input.services,
        started_on: input.startedOn,
        next_billing_date: input.nextBillingDate,
      },
      { count: 'exact' },
    )
    .eq('id', input.planId)
    .eq('project_id', projectId)

  if (error) {
    console.error('[maintenance] update plan failed:', error)
    return { error: 'ไม่สามารถบันทึกแผนได้ กรุณาลองใหม่อีกครั้ง' }
  }
  if (!count) return { error: 'ไม่พบแผนนี้ในโปรเจกต์' }

  await logActivity({
    organizationId: access.organizationId,
    action: 'maintenance.plan_updated',
    entityType: 'maintenance_plan',
    entityId: input.planId,
    projectId,
    metadata: { name: input.name },
  })

  revalidateMaintenance(projectId)
  return { message: 'บันทึกแผนดูแลรักษาแล้ว' }
}

/**
 * ACTIVE / PAUSED / CANCELLED / EXPIRED, as its own action.
 *
 * `cancelled_at` is written by the server, and cleared when a plan leaves
 * CANCELLED — the table's `maintenance_cancelled_has_timestamp` constraint
 * requires the pair to agree, and a stale timestamp on a reactivated plan
 * would misdate the cancellation that no longer applies.
 */
export async function setMaintenanceStatus(
  _prev: MaintenanceActionState,
  formData: FormData,
): Promise<MaintenanceActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectFinance(projectId)

  const parsed = setMaintenanceStatusSchema.safeParse({
    projectId,
    planId: formData.get('planId'),
    status: formData.get('status'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'คำขอไม่ถูกต้อง' }
  const input = parsed.data

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('maintenance_plans')
    .select('id, name, status')
    .eq('id', input.planId)
    .eq('project_id', projectId)
    .maybeSingle<{ id: string; name: string; status: string }>()

  if (!existing) return { error: 'ไม่พบแผนนี้ในโปรเจกต์' }
  if (existing.status === input.status) return { message: 'สถานะเป็นค่านี้อยู่แล้ว' }

  const cancelling = input.status === 'CANCELLED'
  const { error, count } = await supabase
    .from('maintenance_plans')
    .update(
      { status: input.status, cancelled_at: cancelling ? new Date().toISOString() : null },
      { count: 'exact' },
    )
    .eq('id', input.planId)
    .eq('project_id', projectId)

  if (error) {
    console.error('[maintenance] status change failed:', error)
    return { error: 'ไม่สามารถเปลี่ยนสถานะแผนได้ กรุณาลองใหม่อีกครั้ง' }
  }
  if (!count) return { error: 'ไม่พบแผนนี้ในโปรเจกต์' }

  await logActivity({
    organizationId: access.organizationId,
    action: 'maintenance.status_changed',
    entityType: 'maintenance_plan',
    entityId: input.planId,
    projectId,
    metadata: { name: existing.name, from: existing.status, to: input.status },
  })

  revalidateMaintenance(projectId)
  return { message: 'อัปเดตสถานะแผนแล้ว' }
}

// -----------------------------------------------------------------------------
// Records — work actually performed
// -----------------------------------------------------------------------------

/**
 * Records work done. Gated on `requireProjectManage`, NOT finance: asserting
 * that engineering work happened is not an accounting act.
 *
 * `performed_by` is the authenticated user, never a form field.
 */
export async function createMaintenanceRecord(
  _prev: MaintenanceActionState,
  formData: FormData,
): Promise<MaintenanceActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectManage(projectId)

  const parsed = createMaintenanceRecordSchema.safeParse({
    projectId,
    planId: formData.get('planId') ?? undefined,
    title: formData.get('title'),
    description: formData.get('description') ?? undefined,
    performedOn: formData.get('performedOn') ?? undefined,
    minutesSpent: formData.get('minutesSpent') ?? undefined,
  })
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) }
  const input = parsed.data

  const supabase = await createClient()

  // A plan id from the browser must belong to THIS project, or a record would
  // attach to another client's plan.
  if (input.planId) {
    const { data: plan } = await supabase
      .from('maintenance_plans')
      .select('id')
      .eq('id', input.planId)
      .eq('project_id', projectId)
      .maybeSingle<{ id: string }>()
    if (!plan) return { error: 'ไม่พบแผนดูแลรักษานี้ในโปรเจกต์' }
  }

  const { error, count } = await supabase.from('maintenance_records').insert(
    {
      project_id: projectId,
      plan_id: input.planId,
      title: input.title,
      description: input.description,
      performed_on: input.performedOn ?? new Date().toISOString().slice(0, 10),
      minutes_spent: input.minutesSpent,
      performed_by: access.userId,
      created_by: access.userId,
    },
    { count: 'exact' },
  )

  if (error) {
    console.error('[maintenance] create record failed:', error)
    return { error: 'ไม่สามารถบันทึกงานดูแลรักษาได้ กรุณาลองใหม่อีกครั้ง' }
  }
  if (!count) return { error: 'ไม่สามารถบันทึกได้ — ไม่มีสิทธิ์แก้ไขโปรเจกต์นี้' }

  await logActivity({
    organizationId: access.organizationId,
    action: 'maintenance.record_created',
    entityType: 'maintenance_record',
    entityId: projectId,
    projectId,
    metadata: { title: input.title, minutesSpent: input.minutesSpent },
  })

  revalidateMaintenance(projectId)
  return { message: 'บันทึกงานดูแลรักษาแล้ว' }
}

export async function deleteMaintenanceRecord(
  _prev: MaintenanceActionState,
  formData: FormData,
): Promise<MaintenanceActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectManage(projectId)

  const parsed = maintenanceRecordActionSchema.safeParse({
    projectId,
    recordId: formData.get('recordId'),
  })
  if (!parsed.success) return { error: 'คำขอไม่ถูกต้อง' }

  const supabase = await createClient()
  const { error, count } = await supabase
    .from('maintenance_records')
    .delete({ count: 'exact' })
    .eq('id', parsed.data.recordId)
    .eq('project_id', projectId)

  if (error) {
    console.error('[maintenance] delete record failed:', error)
    return { error: 'ไม่สามารถลบรายการได้ กรุณาลองใหม่อีกครั้ง' }
  }
  if (!count) return { error: 'ไม่พบรายการนี้ในโปรเจกต์' }

  await logActivity({
    organizationId: access.organizationId,
    action: 'maintenance.record_deleted',
    entityType: 'maintenance_record',
    entityId: parsed.data.recordId,
    projectId,
  })

  revalidateMaintenance(projectId)
  return { message: 'ลบรายการแล้ว' }
}
