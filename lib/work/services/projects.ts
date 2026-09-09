'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import {
  requireAdmin,
  requireCapability,
  requireClient,
  requireProjectAccess,
  requireProjectManage,
  requireRole,
} from '@/lib/work/auth/permissions'
import { createClient } from '@/lib/work/supabase/server'
import { createAdminClient } from '@/lib/work/supabase/admin'
import {
  createChangeRequestSchema,
  createDeploymentSchema,
  createProjectSchema,
  updateProjectSchema,
} from '@/lib/work/validation/projects'
import { createOwnProjectSchema } from '@/lib/work/validation/collaboration'
import { assertValidTransition } from '@/lib/work/auth/project-status'
import { getProjectById, getProjectFeatures, getProjectIntake } from '@/lib/work/queries/projects'
import type { ProjectStatus } from '@/lib/work/types/enums'
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
    deliveryMethod: formData.get('deliveryMethod'),
    sourceCodeOwnership: formData.get('sourceCodeOwnership'),
    maintenanceEnabled: formData.get('maintenanceEnabled') === 'on',
    pricingItems: formData.get('pricingItemsJson') ?? undefined,
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
      // No total_amount: it defaults to 0 and the pricing-items trigger
      // (migration 0019) sets it for real the moment the insert below runs.
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

  // Draft pricing rows from the create form, if any were added — inserted
  // AFTER the project so a failure here never leaves an orphaned pricing
  // item, only a project with no pricing yet (which the detail page's own
  // pricing panel can always add). Each insert fires the same trigger
  // (migration 0019) that keeps `projects.total_amount` in sync, so the
  // project ends up priced correctly whether items arrived here or later.
  if (input.pricingItems.length > 0) {
    const { error: pricingError } = await supabase.from('project_pricing_items').insert(
      input.pricingItems.map((item, index) => ({
        project_id: project.id,
        kind: item.kind,
        name: item.name,
        quantity: item.quantity,
        unit_amount: item.unitAmount,
        sort_order: index,
        created_by: staff.userId,
      })),
    )
    if (pricingError) {
      console.error('[projects] pricing items insert failed:', pricingError)
    }
  }

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
  redirect(`/admin/projects/${project.id}?created=1`)
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
      // No total_amount: derived from pricing items, see migration 0019.
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
// Archive
// -----------------------------------------------------------------------------
/**
 * Archive vs cancel vs delete — three different actions, on purpose:
 *
 *   CANCELLED is a `status` value (set via updateProject, above). The work
 *   stopped; nothing about the row's visibility changes.
 *
 *   ARCHIVE sets `archived_at`, a separate column `getProjects()` already
 *   filters on (`.is('archived_at', null)`) — the read side of this has
 *   existed since migration 0004. Archiving removes a project from the active
 *   lists; every payment, document, deployment and activity log entry
 *   underneath it is untouched.
 *
 *   DELETE is not offered here at all. The RLS policy
 *   (`projects_delete_managers`) exists for someone with direct database
 *   access, not for a button in this UI — an agency's billing and delivery
 *   history should not be one click away from disappearing.
 *
 * Restricted to org managers (super_admin/admin), one level stricter than the
 * `project:write` capability `updateProject` accepts from any staff role —
 * archiving is a lifecycle-ending, list-wide action, not a routine edit.
 */
export async function archiveProject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const staff = await requireRole('super_admin', 'admin')
  const access = await requireProjectAccess(projectId)

  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', projectId)

  if (error) {
    console.error('[projects] archive failed:', error)
    return { error: 'ไม่สามารถจัดเก็บโปรเจกต์ได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'project.archived',
    entityType: 'project',
    entityId: projectId,
    projectId,
    metadata: { archivedBy: staff.userId },
  })

  revalidatePath(`/work/admin/projects/${projectId}`)
  revalidatePath('/work/admin/projects')
  revalidatePath('/work/admin/dashboard')

  return { message: 'จัดเก็บโปรเจกต์แล้ว' }
}

/** Restores an archived project to the active lists. Same restriction as archive. */
export async function unarchiveProject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const staff = await requireRole('super_admin', 'admin')
  const access = await requireProjectAccess(projectId)

  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update({ archived_at: null })
    .eq('id', projectId)

  if (error) {
    console.error('[projects] unarchive failed:', error)
    return { error: 'ไม่สามารถกู้คืนโปรเจกต์ได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'project.unarchived',
    entityType: 'project',
    entityId: projectId,
    projectId,
    metadata: { unarchivedBy: staff.userId },
  })

  revalidatePath(`/work/admin/projects/${projectId}`)
  revalidatePath('/work/admin/projects')
  revalidatePath('/work/admin/dashboard')

  return { message: 'กู้คืนโปรเจกต์แล้ว' }
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

// -----------------------------------------------------------------------------
// Self-serve (client-created) projects
// -----------------------------------------------------------------------------
/**
 * A CLIENT creates their own project.
 *
 * `owner_id` is ALWAYS `context.userId` — the authenticated identity from
 * `requireClient()`, never a value read from `formData`. There is no
 * `ownerId` field in `createOwnProjectSchema` at all, so there is nothing a
 * caller could even attempt to override.
 *
 * WHY THE PRIVILEGED CLIENT: `organization_id` and `client_id` are NOT NULL
 * on `projects`, and a client user has NO read access to `organizations` or
 * `clients` (migration 0004: "Client users get nothing here") — there is
 * nothing for their own session to resolve those from, and nothing should be
 * asked of them either; a self-serve creator does not know or care which
 * agency organization backs this deployment. This resolves BOTH server-side,
 * from a value the client never supplies: the sole organization this
 * deployment serves (see migration 0025b's own note on this — the one thing
 * that needs revisiting if this ever becomes genuinely multi-agency), and a
 * `clients` row representing this individual, found by `created_by = this
 * user` or created on first use. Nothing here trusts `formData` for either.
 *
 * The actual INSERT into `projects` sets `owner_id`, which is what the
 * trigger from migration 0025b reads to create the OWNER `project_members`
 * row automatically — this action does not insert into `project_members`
 * itself.
 */
export async function createOwnProject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await requireClient()

  const parsed = createOwnProjectSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') ?? undefined,
    type: formData.get('type') ?? undefined,
  })
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) }

  const admin = createAdminClient()

  const { data: org, error: orgError } = await admin
    .from('organizations')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>()

  if (orgError || !org) {
    console.error('[projects] no organization configured for self-serve creation', orgError)
    return { error: 'ไม่สามารถสร้างโปรเจกต์ได้ในขณะนี้ กรุณาติดต่อทีมงาน' }
  }

  let clientId: string
  const { data: existingClient } = await admin
    .from('clients')
    .select('id')
    .eq('organization_id', org.id)
    .eq('created_by', context.userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>()

  if (existingClient) {
    clientId = existingClient.id
  } else {
    const { data: newClient, error: clientError } = await admin
      .from('clients')
      .insert({
        organization_id: org.id,
        name: context.displayName || context.email || 'ลูกค้า',
        contact_name: context.displayName || null,
        contact_email: context.email || null,
        created_by: context.userId,
      })
      .select('id')
      .single<{ id: string }>()

    if (clientError || !newClient) {
      console.error('[projects] failed to provision self-serve client record', clientError)
      return { error: 'ไม่สามารถสร้างโปรเจกต์ได้ กรุณาลองใหม่อีกครั้ง' }
    }
    clientId = newClient.id
  }

  const { data: project, error: projectError } = await admin
    .from('projects')
    .insert({
      organization_id: org.id,
      client_id: clientId,
      owner_id: context.userId,
      name: parsed.data.name,
      description: parsed.data.description,
      type: parsed.data.type,
      status: 'DRAFT',
      created_by: context.userId,
    })
    .select('id')
    .single<{ id: string }>()

  if (projectError || !project) {
    console.error('[projects] self-serve create failed:', projectError)
    return { error: 'ไม่สามารถสร้างโปรเจกต์ได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: org.id,
    action: 'project.created_self_serve',
    entityType: 'project',
    entityId: project.id,
    projectId: project.id,
    metadata: { name: parsed.data.name },
  })

  revalidatePath('/work/portal/projects')

  // Lands in the intake wizard, not the project page — Step 1 (this action)
  // only collected name/type/description; the wizard's remaining steps
  // (requirements, scope, timeline, budget, payment proposal, delivery,
  // brand assets, review) all write to this same DRAFT row.
  redirect(`/work/portal/projects/${project.id}/wizard?step=requirements`)
}

/**
 * "Delete project" (brief §5, OWNER) — implemented as archive, the same
 * substitution the existing staff ArchiveForm makes, and for the same
 * reason: a real DELETE is a destructive action this codebase does not
 * hand out without explicit justification, and archiving already achieves
 * what a self-serve owner actually needs (the project stops being active,
 * nothing is lost). requireProjectAccess + isProjectOwner is the guard,
 * not RLS's projects_delete_managers, which stays staff-manager-only and
 * unchanged — a self-serve owner never reaches an actual DELETE statement.
 */
export async function archiveOwnProject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectAccess(projectId)
  if (!access.isProjectOwner) denyAccessMessage()

  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', projectId)

  if (error) {
    console.error('[projects] self-serve archive failed:', error)
    return { error: 'ไม่สามารถจัดเก็บโปรเจกต์ได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'project.archived_self_serve',
    entityType: 'project',
    entityId: projectId,
    projectId,
  })

  revalidatePath(`/work/portal/projects/${projectId}`)
  revalidatePath('/work/portal/projects')

  return { message: 'จัดเก็บโปรเจกต์แล้ว' }
}

function denyAccessMessage(): never {
  throw new Error('คุณไม่มีสิทธิ์ดำเนินการนี้')
}

// -----------------------------------------------------------------------------
// Admin project lifecycle (docs/ADMIN_PROJECT_LIFECYCLE.md)
// -----------------------------------------------------------------------------
/**
 * Moves a self-serve project from DRAFT to SUBMITTED — the ONE place this
 * status is ever written. Once submitted, the project appears in the
 * admin Project Inbox (`/admin/inbox`).
 *
 * Only the OWNER may submit (matches who may edit the project at all), and
 * only from DRAFT (`assertValidTransition`) — resubmitting from
 * NEEDS_INFORMATION goes through `provideRequestedInformation` instead,
 * which is its own action with its own transition edge.
 */
export async function submitProject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectAccess(projectId)
  if (!access.isProjectOwner) denyAccessMessage()

  // docs/CLIENT_PROJECT_INTAKE.md §9's "I confirm that the information
  // submitted is correct" — checked server-side, not just a disabled
  // button: a client calling this action directly without ever seeing the
  // checkbox still cannot submit.
  if (formData.get('confirmed') !== 'on') {
    return { error: 'กรุณายืนยันว่าข้อมูลที่ส่งถูกต้อง' }
  }

  const supabase = await createClient()

  const { data: current } = await supabase
    .from('projects')
    .select('status')
    .eq('id', projectId)
    .maybeSingle<{ status: ProjectStatus }>()
  if (!current) return { error: 'ไม่พบโปรเจกต์' }

  // `assertValidTransition` only allows DRAFT -> SUBMITTED — a second
  // submit attempt (status already SUBMITTED or later) is rejected right
  // here, before any write. This IS the duplicate-submission guard the
  // brief asks for; the `.eq('status', current.status)` below is the
  // second, database-level belt-and-braces layer against a race between
  // this read and that write.
  try {
    assertValidTransition(current.status, 'SUBMITTED')
  } catch {
    return { error: 'โปรเจกต์นี้ส่งคำขอไปแล้ว' }
  }

  const { error } = await supabase
    .from('projects')
    .update({
      status: 'SUBMITTED',
      submitted_at: new Date().toISOString(),
      intake_confirmed_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .eq('status', current.status)

  if (error) {
    console.error('[projects] submit failed:', error)
    return { error: 'ไม่สามารถส่งคำขอโปรเจกต์ได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'project.submitted',
    entityType: 'project',
    entityId: projectId,
    projectId,
  })

  revalidatePath(`/work/portal/projects/${projectId}`)
  revalidatePath('/work/portal/projects')
  revalidatePath('/work/admin/inbox')

  return { message: 'ส่งคำขอโปรเจกต์แล้ว ทีมงานจะตรวจสอบและติดต่อกลับ' }
}

/**
 * Marks a submitted project as actively being looked at — separates "sitting
 * in the inbox, untouched" from "someone is on it right now" in the Project
 * Inbox's filter list. A thin action, not a decision: it carries no note and
 * is meant to be a one-click "claim this" from the inbox list itself.
 * SUBMITTED -> UNDER_REVIEW, exactly the graph's first edge.
 */
export async function startReviewingProject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await requireCapability('project:write')
  const projectId = String(formData.get('projectId') ?? '')

  assertValidTransition('SUBMITTED', 'UNDER_REVIEW')

  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update({ status: 'UNDER_REVIEW' })
    .eq('id', projectId)
    .eq('status', 'SUBMITTED')

  if (error) {
    console.error('[projects] start review failed:', error)
    return { error: 'ไม่สามารถเริ่มตรวจสอบได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: staff.organizationId,
    action: 'project.review_started',
    entityType: 'project',
    entityId: projectId,
    projectId,
  })

  revalidatePath('/work/admin/inbox')
  revalidatePath(`/work/admin/projects/${projectId}/review`)

  return { message: 'เริ่มตรวจสอบโปรเจกต์แล้ว' }
}

/** The fields docs/ADMIN_PROJECT_REVIEW.md §8 requires before a project can move to QUOTATION_DRAFT — checked against what this phase can actually collect (see that doc's own note on requirements/delivery fields not existing yet). */
async function findMissingQuotationFields(projectId: string): Promise<string[]> {
  const [project, features, intake] = await Promise.all([
    getProjectById(projectId),
    getProjectFeatures(projectId),
    getProjectIntake(projectId),
  ])
  const missing: string[] = []
  if (!project) return ['โปรเจกต์']
  if (!project.name || project.name.trim().length === 0) missing.push('ชื่อโปรเจกต์')
  if (!project.description || project.description.trim().length === 0) missing.push('รายละเอียดโปรเจกต์')
  if (!project.type) missing.push('ประเภทโปรเจกต์')
  if (!project.clientId) missing.push('ลูกค้า')
  if (features.length === 0) missing.push('ขอบเขตงาน (Scope)')
  // Requirements/delivery now have somewhere to live (migration 0030) — a
  // self-serve submission genuinely can carry them, so they are checked
  // here too. A staff-created project (no owner_id, never touches the
  // wizard) legitimately has neither — only enforced when the project
  // actually has an owner (came through the wizard) so this cannot block
  // approving a project the agency itself created and priced directly.
  if (project.ownerId) {
    if (!intake?.requirements.goals) missing.push('เป้าหมายของโปรเจกต์ (Requirements)')
    if (!intake || intake.requestedDelivery.length === 0) missing.push('รายการที่ต้องการให้ส่งมอบ (Delivery)')
  }
  return missing
}

/**
 * Approve for Quotation (docs/ADMIN_PROJECT_REVIEW.md §8):
 * SUBMITTED/UNDER_REVIEW -> QUOTATION_DRAFT, but ONLY if the minimum
 * required information exists. Does NOT create a quotation itself — that
 * is a later phase; this only clears the project to have one drafted.
 */
export async function approveForQuotation(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await requireCapability('project:write')
  const projectId = String(formData.get('projectId') ?? '')

  const supabase = await createClient()
  const { data: current } = await supabase
    .from('projects')
    .select('status')
    .eq('id', projectId)
    .maybeSingle<{ status: ProjectStatus }>()
  if (!current) return { error: 'ไม่พบโปรเจกต์' }

  try {
    assertValidTransition(current.status, 'QUOTATION_DRAFT')
  } catch {
    return { error: 'ไม่สามารถอนุมัติจากสถานะปัจจุบันได้' }
  }

  const missing = await findMissingQuotationFields(projectId)
  if (missing.length > 0) {
    return { error: `ข้อมูลไม่ครบถ้วน กรุณาระบุ: ${missing.join(', ')}` }
  }

  const { error } = await supabase
    .from('projects')
    .update({ status: 'QUOTATION_DRAFT' })
    .eq('id', projectId)
    .eq('status', current.status)

  if (error) {
    console.error('[projects] approve for quotation failed:', error)
    return { error: 'ไม่สามารถอนุมัติได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: staff.organizationId,
    action: 'project.approved_for_quotation',
    entityType: 'project',
    entityId: projectId,
    projectId,
  })

  revalidatePath(`/work/admin/projects/${projectId}`)
  revalidatePath(`/work/admin/projects/${projectId}/review`)
  revalidatePath('/work/admin/inbox')

  return { message: 'อนุมัติให้ดำเนินการเสนอราคาแล้ว' }
}

/**
 * Request More Information (docs/ADMIN_PROJECT_REVIEW.md §5–6):
 * SUBMITTED/UNDER_REVIEW -> NEEDS_INFORMATION, with a required message the
 * client will see. The note is stored in `activity_logs.metadata` — a
 * message TO the client, not project state — and read back by
 * `getLatestInformationRequest()` for the client-facing banner.
 */
export async function requestMoreInformation(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await requireCapability('project:write')
  const projectId = String(formData.get('projectId') ?? '')
  const note = String(formData.get('note') ?? '').trim()
  if (!note) return { error: 'กรุณาระบุคำถามหรือข้อมูลที่ต้องการเพิ่มเติม' }

  const supabase = await createClient()
  const { data: current } = await supabase
    .from('projects')
    .select('status')
    .eq('id', projectId)
    .maybeSingle<{ status: ProjectStatus }>()
  if (!current) return { error: 'ไม่พบโปรเจกต์' }

  try {
    assertValidTransition(current.status, 'NEEDS_INFORMATION')
  } catch {
    return { error: 'ไม่สามารถขอข้อมูลเพิ่มเติมจากสถานะปัจจุบันได้' }
  }

  const { error } = await supabase
    .from('projects')
    .update({ status: 'NEEDS_INFORMATION' })
    .eq('id', projectId)
    .eq('status', current.status)

  if (error) {
    console.error('[projects] request more information failed:', error)
    return { error: 'ไม่สามารถส่งคำขอข้อมูลเพิ่มเติมได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: staff.organizationId,
    action: 'project.information_requested',
    entityType: 'project',
    entityId: projectId,
    projectId,
    metadata: { note },
  })

  revalidatePath(`/work/admin/projects/${projectId}`)
  revalidatePath(`/work/admin/projects/${projectId}/review`)
  revalidatePath('/work/admin/inbox')
  revalidatePath(`/work/portal/projects/${projectId}`)

  return { message: 'ส่งคำขอข้อมูลเพิ่มเติมถึงลูกค้าแล้ว' }
}

/**
 * The client's response to a NEEDS_INFORMATION request
 * (docs/ADMIN_PROJECT_REVIEW.md §6): NEEDS_INFORMATION -> SUBMITTED. Does
 * not itself carry the client's answer as structured data (this phase has
 * nowhere to put it — see the doc's note on the requirements schema not
 * existing yet); the client answers by editing whatever project fields
 * they can already edit, then presses this to put the project back in
 * front of admin.
 */
export async function provideRequestedInformation(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectAccess(projectId)
  if (!access.isProjectOwner) denyAccessMessage()

  assertValidTransition('NEEDS_INFORMATION', 'SUBMITTED')

  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update({ status: 'SUBMITTED' })
    .eq('id', projectId)
    .eq('status', 'NEEDS_INFORMATION')

  if (error) {
    console.error('[projects] provide requested information failed:', error)
    return { error: 'ไม่สามารถส่งข้อมูลได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'project.information_submitted',
    entityType: 'project',
    entityId: projectId,
    projectId,
  })

  revalidatePath(`/work/portal/projects/${projectId}`)
  revalidatePath('/work/portal/projects')
  revalidatePath('/work/admin/inbox')

  return { message: 'ส่งข้อมูลเพิ่มเติมแล้ว ทีมงานจะตรวจสอบอีกครั้ง' }
}

/**
 * Reject Project (docs/ADMIN_PROJECT_REVIEW.md §7): requires a reason,
 * never deletes the row, keeps `rejected_by`/`rejected_at`/`rejection_reason`
 * as durable evidence (migration 0028b) alongside the `activity_logs`
 * event. Uses the admin override table, not the normal graph — a rejection
 * is a deliberate exit, not a step in the happy path.
 */
export async function rejectProject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await requireCapability('project:write')
  const projectId = String(formData.get('projectId') ?? '')
  const reason = String(formData.get('reason') ?? '').trim()
  if (!reason) return { error: 'กรุณาระบุเหตุผลในการปฏิเสธคำขอ' }

  const supabase = await createClient()
  const { data: current } = await supabase
    .from('projects')
    .select('status')
    .eq('id', projectId)
    .maybeSingle<{ status: ProjectStatus }>()
  if (!current) return { error: 'ไม่พบโปรเจกต์' }

  try {
    assertValidTransition(current.status, 'CANCELLED', { allowAdminOverride: true })
  } catch {
    return { error: 'ไม่สามารถปฏิเสธจากสถานะปัจจุบันได้' }
  }

  const { error } = await supabase
    .from('projects')
    .update({
      status: 'CANCELLED',
      rejected_by: staff.userId,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', projectId)
    .eq('status', current.status)

  if (error) {
    console.error('[projects] reject failed:', error)
    return { error: 'ไม่สามารถปฏิเสธคำขอได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: staff.organizationId,
    action: 'project.rejected',
    entityType: 'project',
    entityId: projectId,
    projectId,
    metadata: { reason },
  })

  revalidatePath(`/work/admin/projects/${projectId}`)
  revalidatePath(`/work/admin/projects/${projectId}/review`)
  revalidatePath('/work/admin/inbox')
  revalidatePath(`/work/portal/projects/${projectId}`)

  return { message: 'ปฏิเสธคำขอโปรเจกต์แล้ว' }
}
