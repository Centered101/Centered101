'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import {
  requireAdmin,
  requireProjectAccess,
  requireProjectManage,
} from '@/lib/work/auth/permissions'
import { createClient } from '@/lib/work/supabase/server'
import {
  createChangeRequestSchema,
  createDeploymentSchema,
  createProjectSchema,
  updateProjectSchema,
} from '@/lib/work/validation/projects'
import { logActivity } from './activity'

/**
 * Project mutations.
 *
 * Every action here follows the same four steps, in this order:
 *
 *   1. AUTHORIZE with a guard from lib/work/auth/permissions.
 *   2. PARSE the FormData with Zod. Nothing reaches Supabase unparsed.
 *   3. WRITE through the request-scoped client, so RLS re-checks the write
 *      independently of step 1.
 *   4. LOG to activity_logs, then revalidate.
 *
 * Steps 1 and 3 overlap deliberately. The guard produces a good error message;
 * RLS produces the guarantee. Deleting the guard would make the app rude, not
 * insecure.
 */

export type ActionState = {
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

// -----------------------------------------------------------------------------
// Create
// -----------------------------------------------------------------------------
export async function createProject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await requireAdmin()
  if (!staff.can('project:write')) {
    return { error: 'บัญชีของคุณไม่มีสิทธิ์สร้างโปรเจกต์' }
  }

  const parsed = createProjectSchema.safeParse({
    clientId: formData.get('clientId'),
    name: formData.get('name'),
    description: formData.get('description') ?? undefined,
    type: formData.get('type'),
    startDate: formData.get('startDate') ?? undefined,
    expectedDelivery: formData.get('expectedDelivery') ?? undefined,
    totalAmount: formData.get('totalAmount'),
    deliveryMethod: formData.get('deliveryMethod'),
    sourceCodeOwnership: formData.get('sourceCodeOwnership'),
    maintenanceEnabled: formData.get('maintenanceEnabled') === 'on',
  })

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error) }
  }

  const input = parsed.data
  const supabase = await createClient()

  // project_code is omitted: the trigger from migration 0016 generates it
  // atomically. Supplying one from here would race.
  const { data, error } = await supabase
    .from('projects')
    .insert({
      organization_id: staff.organizationId,
      client_id: input.clientId,
      name: input.name,
      description: input.description,
      type: input.type,
      status: 'DRAFT',
      start_date: input.startDate,
      expected_delivery: input.expectedDelivery,
      total_amount: input.totalAmount,
      delivery_method: input.deliveryMethod,
      source_code_ownership: input.sourceCodeOwnership,
      maintenance_enabled: input.maintenanceEnabled,
      created_by: staff.userId,
    })
    .select('id, project_code')
    .single()

  if (error || !data) {
    console.error('[projects] create failed:', error)
    // 23503 = foreign key violation: the client id does not belong to this
    // organization. Worth naming, because the user can fix it.
    if (error?.code === '23503') {
      return { fieldErrors: { clientId: 'ไม่พบลูกค้ารายนี้ในพื้นที่ทำงาน' } }
    }
    return { error: 'ไม่สามารถสร้างโปรเจกต์ได้ กรุณาลองใหม่อีกครั้ง' }
  }

  const project = data as unknown as { id: string; project_code: string }

  await logActivity({
    organizationId: staff.organizationId,
    action: 'project.created',
    entityType: 'project',
    entityId: project.id,
    projectId: project.id,
    metadata: { name: input.name, code: project.project_code },
  })

  revalidatePath('/work/admin/projects')
  revalidatePath('/work/admin/dashboard')

  // redirect() throws, so it must be the last statement — anything after it
  // would silently never run.
  redirect(`/work/admin/projects/${project.id}?created=1`)
}

// -----------------------------------------------------------------------------
// Update
// -----------------------------------------------------------------------------
export async function updateProject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectManage(projectId)

  const parsed = updateProjectSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') ?? undefined,
    status: formData.get('status'),
    progress: formData.get('progress'),
    expectedDelivery: formData.get('expectedDelivery') ?? undefined,
    totalAmount: formData.get('totalAmount'),
    deliveryMethod: formData.get('deliveryMethod'),
    sourceCodeOwnership: formData.get('sourceCodeOwnership'),
  })

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error) }
  }

  const input = parsed.data
  const supabase = await createClient()

  const { error } = await supabase
    .from('projects')
    .update({
      name: input.name,
      description: input.description,
      status: input.status,
      progress: input.progress,
      expected_delivery: input.expectedDelivery,
      total_amount: input.totalAmount,
      delivery_method: input.deliveryMethod,
      source_code_ownership: input.sourceCodeOwnership,
    })
    .eq('id', projectId)

  if (error) {
    console.error('[projects] update failed:', error)
    return { error: 'ไม่สามารถบันทึกการเปลี่ยนแปลงได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'project.updated',
    entityType: 'project',
    entityId: projectId,
    projectId,
    metadata: { name: input.name, status: input.status, progress: input.progress },
  })

  revalidatePath(`/work/admin/projects/${projectId}`)
  revalidatePath('/work/admin/projects')
  revalidatePath('/work/admin/dashboard')

  return { message: 'บันทึกการเปลี่ยนแปลงแล้ว' }
}

// -----------------------------------------------------------------------------
// Deployments
// -----------------------------------------------------------------------------
/**
 * Records a deployment by hand.
 *
 * The brief's interim answer to "Vercel integration is not implemented yet":
 * an admin saves a real preview URL instead of the UI inventing one. When the
 * provider API arrives it fills these same columns.
 */
export async function createDeployment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectManage(projectId)

  const parsed = createDeploymentSchema.safeParse({
    environment: formData.get('environment'),
    url: formData.get('url'),
    version: formData.get('version') ?? undefined,
    commitSha: formData.get('commitSha') ?? undefined,
    notes: formData.get('notes') ?? undefined,
  })

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error) }
  }

  const input = parsed.data
  const supabase = await createClient()

  const { error } = await supabase.from('project_deployments').insert({
    project_id: projectId,
    environment: input.environment,
    status: 'READY',
    url: input.url,
    version: input.version,
    commit_sha: input.commitSha,
    notes: input.notes,
    deployed_at: new Date().toISOString(),
    created_by: access.userId,
  })

  if (error) {
    console.error('[deployments] create failed:', error)
    return { error: 'ไม่สามารถบันทึกการเผยแพร่ได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'deployment.created',
    entityType: 'deployment',
    projectId,
    metadata: { environment: input.environment, url: input.url, version: input.version },
  })

  revalidatePath(`/work/admin/projects/${projectId}`)
  revalidatePath('/work/admin/deployments')

  return { message: 'บันทึกการเผยแพร่แล้ว' }
}

// -----------------------------------------------------------------------------
// Change requests
// -----------------------------------------------------------------------------
/**
 * Raised by a CLIENT on their own project.
 *
 * Uses requireProjectAccess, not requireProjectManage: this is the one write a
 * client is allowed to make, and RLS backs it with an insert policy scoped to
 * `app.is_project_client(project_id) and requested_by = auth.uid()`. Status and
 * price are absent from the form and from this insert — a client who could set
 * either would be approving and pricing their own request.
 */
export async function createChangeRequest(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectAccess(projectId)

  const parsed = createChangeRequestSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') ?? undefined,
    priority: formData.get('priority') ?? 'NORMAL',
  })

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error) }
  }

  const input = parsed.data
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' }

  const { error } = await supabase.from('change_requests').insert({
    project_id: projectId,
    title: input.title,
    description: input.description,
    priority: input.priority,
    status: 'OPEN',
    requested_by: user.id,
  })

  if (error) {
    console.error('[change-requests] create failed:', error)
    return { error: 'ไม่สามารถส่งคำขอได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'change_request.created',
    entityType: 'change_request',
    projectId,
    metadata: { title: input.title, priority: input.priority },
  })

  revalidatePath(`/work/portal/projects/${projectId}/change-requests`)
  revalidatePath('/work/admin/change-requests')

  return { message: 'ส่งคำขอเปลี่ยนแปลงแล้ว' }
}
