'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'

import { requireProjectAccess } from '@/lib/work/auth/permissions'
import { createAdminClient } from '@/lib/work/supabase/admin'
import { createClient } from '@/lib/work/supabase/server'
import {
  addProjectAssetLinkSchema,
  budgetSchema,
  deliverySchema,
  paymentProposalSchema,
  requirementsSchema,
  timelineSchema,
} from '@/lib/work/validation/intake'
import type { ActionState } from './projects'
import { logActivity } from './activity'

/**
 * The client intake wizard's write side (docs/PROJECT_WORKSPACE_ARCHITECTURE.md,
 * docs/ADMIN_PROJECT_REVIEW.md §1). Every action here is OWNER-only and
 * writes ONLY to `projects.requirements`/`requested_*` — informational
 * columns that no pricing, payment, or unlock logic ever reads (migration
 * 0030's own comment). This file cannot touch `total_amount`,
 * `payment_plans`, or `unlock_rules` even by accident: it has no code path
 * that writes any of them.
 *
 * One action per wizard section rather than one giant form — each section
 * saves independently as the client moves through the wizard, which is
 * what makes "leave and resume later" free: the DRAFT project row already
 * IS the draft (docs/PROJECT_WORKSPACE_ARCHITECTURE.md §3's own design
 * decision), so there is nothing else to persist a draft of.
 */

async function requireOwner(projectId: string) {
  const access = await requireProjectAccess(projectId)
  if (!access.isProjectOwner) throw new Error('คุณไม่มีสิทธิ์แก้ไขโปรเจกต์นี้')
  return access
}

function revalidateIntake(projectId: string) {
  revalidatePath(`/work/portal/projects/${projectId}`)
  revalidatePath(`/work/portal/projects/${projectId}/wizard`)
  revalidatePath(`/work/admin/projects/${projectId}/review`)
}

export async function saveRequirements(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireOwner(projectId)

  const parsed = requirementsSchema.safeParse({
    goals: formData.get('goals') ?? undefined,
    targetAudience: formData.get('targetAudience') ?? undefined,
    requiredFeatures: formData.get('requiredFeatures') ?? undefined,
    requiredPages: formData.get('requiredPages') ?? undefined,
    integrations: formData.get('integrations') ?? undefined,
    authentication: formData.get('authentication') ?? undefined,
    adminRequirements: formData.get('adminRequirements') ?? undefined,
    userRequirements: formData.get('userRequirements') ?? undefined,
    technicalRequirements: formData.get('technicalRequirements') ?? undefined,
    technology: formData.get('technology') ?? undefined,
    referenceLinks: formData.get('referenceLinks') ?? undefined,
    designPreferences: formData.get('designPreferences') ?? undefined,
    brandColors: formData.get('brandColors') ?? undefined,
    fonts: formData.get('fonts') ?? undefined,
    contentAvailability: formData.get('contentAvailability') ?? undefined,
    domainRequirements: formData.get('domainRequirements') ?? undefined,
    notes: formData.get('notes') ?? undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' }

  const supabase = await createClient()
  const { error } = await supabase.from('projects').update({ requirements: parsed.data }).eq('id', projectId)
  if (error) {
    console.error('[intake] save requirements failed:', error)
    return { error: 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'project.requirements_updated',
    entityType: 'project',
    entityId: projectId,
    projectId,
  })
  revalidateIntake(projectId)
  return { message: 'บันทึกความต้องการโครงการแล้ว' }
}

export async function saveTimeline(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  await requireOwner(projectId)

  const parsed = timelineSchema.safeParse({
    requestedStartDate: formData.get('requestedStartDate') ?? undefined,
    requestedDeadline: formData.get('requestedDeadline') ?? undefined,
    importantLaunchDate: formData.get('importantLaunchDate') ?? undefined,
    requestedDuration: formData.get('requestedDuration') ?? undefined,
    requestedPriority: formData.get('requestedPriority') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update({
      requested_start_date: parsed.data.requestedStartDate,
      requested_deadline: parsed.data.requestedDeadline,
      important_launch_date: parsed.data.importantLaunchDate,
      requested_duration: parsed.data.requestedDuration,
      requested_priority: parsed.data.requestedPriority ?? null,
    })
    .eq('id', projectId)
  if (error) {
    console.error('[intake] save timeline failed:', error)
    return { error: 'ไม่สามารถบันทึกกำหนดเวลาได้ กรุณาลองใหม่อีกครั้ง' }
  }

  revalidateIntake(projectId)
  return { message: 'บันทึกกำหนดเวลาแล้ว' }
}

export async function saveBudget(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  await requireOwner(projectId)

  const parsed = budgetSchema.safeParse({
    requestedBudgetMin: formData.get('requestedBudgetMin') ?? undefined,
    requestedBudgetMax: formData.get('requestedBudgetMax') ?? undefined,
    requestedBudgetPreferred: formData.get('requestedBudgetPreferred') ?? undefined,
    requestedCurrency: formData.get('requestedCurrency') ?? undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update({
      requested_budget_min: parsed.data.requestedBudgetMin,
      requested_budget_max: parsed.data.requestedBudgetMax,
      requested_budget_preferred: parsed.data.requestedBudgetPreferred,
      requested_currency: parsed.data.requestedCurrency,
    })
    .eq('id', projectId)
  if (error) {
    console.error('[intake] save budget failed:', error)
    return { error: 'ไม่สามารถบันทึกงบประมาณได้ กรุณาลองใหม่อีกครั้ง' }
  }

  revalidateIntake(projectId)
  return { message: 'บันทึกงบประมาณแล้ว' }
}

/** The client's PROPOSED payment split — informational, see the file header. */
export async function savePaymentProposal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  await requireOwner(projectId)

  const parsed = paymentProposalSchema.safeParse({
    type: formData.get('type'),
    milestones: formData.get('milestonesJson') ?? '[]',
    notes: formData.get('notes') ?? undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update({ requested_payment_plan: parsed.data })
    .eq('id', projectId)
  if (error) {
    console.error('[intake] save payment proposal failed:', error)
    return { error: 'ไม่สามารถบันทึกข้อเสนอการชำระเงินได้ กรุณาลองใหม่อีกครั้ง' }
  }

  revalidateIntake(projectId)
  return { message: 'บันทึกข้อเสนอแผนการชำระเงินแล้ว' }
}

export async function saveDeliveryRequest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  await requireOwner(projectId)

  const parsed = deliverySchema.safeParse({
    items: formData.getAll('items'),
    custom: formData.get('customDeliverables') ?? undefined,
  })
  if (!parsed.success) return { error: 'ข้อมูลไม่ถูกต้อง' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    // Known keys and custom free-entry strings share one array — split back
    // apart at read time by getProjectIntake (KNOWN_DELIVERY_KEYS check).
    .update({ requested_delivery: [...parsed.data.items, ...parsed.data.custom] })
    .eq('id', projectId)
  if (error) {
    console.error('[intake] save delivery request failed:', error)
    return { error: 'ไม่สามารถบันทึกรายการส่งมอบได้ กรุณาลองใหม่อีกครั้ง' }
  }

  revalidateIntake(projectId)
  return { message: 'บันทึกรายการส่งมอบที่ต้องการแล้ว' }
}

/**
 * Replaces the project's scope items (checkbox list, brief §3) — a fresh
 * `project_scopes` version each save, same versioning shape the agency
 * side already uses (migration 0006), now reachable by a self-serve OWNER
 * via `project_scopes_insert_owner`/`project_features_insert_owner`
 * (migration 0030).
 */
export async function saveScope(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireOwner(projectId)

  const items = formData
    .getAll('items')
    .map((value) => String(value).trim())
    .filter(Boolean)
    .slice(0, 50)
  const customItems = String(formData.get('customItems') ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 20)
  const allItems = [...new Set([...items, ...customItems])]

  const supabase = await createClient()

  const { data: latest } = await supabase
    .from('project_scopes')
    .select('version')
    .eq('project_id', projectId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle<{ version: number }>()
  const nextVersion = (latest?.version ?? 0) + 1

  const { data: scope, error: scopeError } = await supabase
    .from('project_scopes')
    .insert({ project_id: projectId, version: nextVersion, created_by: access.userId })
    .select('id')
    .single<{ id: string }>()
  if (scopeError || !scope) {
    console.error('[intake] save scope failed:', scopeError)
    return { error: 'ไม่สามารถบันทึกขอบเขตงานได้ กรุณาลองใหม่อีกครั้ง' }
  }

  if (allItems.length > 0) {
    const { error: featuresError } = await supabase.from('project_features').insert(
      allItems.map((name, index) => ({
        scope_id: scope.id,
        project_id: projectId,
        name,
        sort_order: index,
        is_included: true,
      })),
    )
    if (featuresError) {
      console.error('[intake] save scope items failed:', featuresError)
      return { error: 'บันทึกขอบเขตงานหลักสำเร็จ แต่บันทึกรายการย่อยไม่สำเร็จ' }
    }
  }

  revalidateIntake(projectId)
  return { message: 'บันทึกขอบเขตงานแล้ว' }
}

const ASSET_BUCKET = 'work-assets'

/**
 * Uploads a brand/reference file (brief §4). Same shape as
 * `submitFeedback`'s screenshot upload: uploaded BEFORE the row exists (a
 * storage failure costs a retry, not an orphaned row), path chosen by the
 * server from the caller's own id, cleaned up if the row insert then fails.
 */
export async function uploadProjectAsset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectAccess(projectId)

  const kind = String(formData.get('kind') ?? 'OTHER')
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'กรุณาระบุชื่อไฟล์' }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { error: 'กรุณาเลือกไฟล์' }

  const ALLOWED = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
    'image/gif',
    'application/pdf',
    'font/ttf',
    'font/otf',
    'font/woff',
    'font/woff2',
  ]
  if (!ALLOWED.includes(file.type)) return { error: 'ประเภทไฟล์นี้ไม่รองรับ' }
  if (file.size > 10 * 1024 * 1024) return { error: 'ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)' }

  const extension = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const path = `${access.userId}/${randomUUID()}.${extension}`

  const admin = createAdminClient()
  const { error: uploadError } = await admin.storage.from(ASSET_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (uploadError) {
    console.error('[intake] asset upload failed:', uploadError)
    return { error: 'อัปโหลดไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }
  }

  const supabase = await createClient()
  const { error: insertError } = await supabase.from('project_assets').insert({
    project_id: projectId,
    kind,
    name,
    storage_path: path,
    file_size: file.size,
    mime_type: file.type,
    uploaded_by: access.userId,
  })

  if (insertError) {
    console.error('[intake] asset row insert failed:', insertError)
    await admin.storage.from(ASSET_BUCKET).remove([path])
    return { error: 'ไม่สามารถบันทึกไฟล์ได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'project.asset_uploaded',
    entityType: 'project_asset',
    projectId,
    metadata: { kind, name },
  })
  revalidateIntake(projectId)
  return { message: 'อัปโหลดไฟล์แล้ว' }
}

/** A reference WEBSITE — a link, not a file (§4's "Reference websites"). */
export async function addProjectAssetLink(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = addProjectAssetLinkSchema.safeParse({
    projectId: formData.get('projectId'),
    kind: formData.get('kind'),
    name: formData.get('name'),
    externalUrl: formData.get('externalUrl'),
    notes: formData.get('notes') ?? undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' }

  const access = await requireProjectAccess(parsed.data.projectId)
  const supabase = await createClient()
  const { error } = await supabase.from('project_assets').insert({
    project_id: parsed.data.projectId,
    kind: parsed.data.kind,
    name: parsed.data.name,
    external_url: parsed.data.externalUrl,
    notes: parsed.data.notes,
    uploaded_by: access.userId,
  })
  if (error) {
    console.error('[intake] asset link insert failed:', error)
    return { error: 'ไม่สามารถบันทึกลิงก์ได้ กรุณาลองใหม่อีกครั้ง' }
  }

  revalidateIntake(parsed.data.projectId)
  return { message: 'เพิ่มลิงก์อ้างอิงแล้ว' }
}

export async function removeProjectAsset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const assetId = String(formData.get('assetId') ?? '')
  await requireProjectAccess(projectId)

  const supabase = await createClient()
  const { data: asset } = await supabase
    .from('project_assets')
    .select('storage_path')
    .eq('id', assetId)
    .eq('project_id', projectId)
    .maybeSingle<{ storage_path: string | null }>()

  const { error } = await supabase.from('project_assets').delete().eq('id', assetId).eq('project_id', projectId)
  if (error) {
    console.error('[intake] asset remove failed:', error)
    return { error: 'ไม่สามารถลบไฟล์ได้ กรุณาลองใหม่อีกครั้ง' }
  }

  if (asset?.storage_path) {
    const admin = createAdminClient()
    await admin.storage.from(ASSET_BUCKET).remove([asset.storage_path])
  }

  revalidateIntake(projectId)
  return { message: 'ลบไฟล์แล้ว' }
}

/**
 * Admin review of one asset (§5) — Approved / Needs Replacement / Needs
 * Clarification. Staff-only via `project_assets_update_staff` RLS
 * (`requireProjectAccess` alone does not admit a client here — the RLS
 * policy is the real gate, this only produces a clean error instead of a
 * silent zero-rows update).
 */
export async function reviewProjectAsset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const assetId = String(formData.get('assetId') ?? '')
  const status = String(formData.get('status') ?? '')
  const note = String(formData.get('note') ?? '').trim() || null
  const access = await requireProjectAccess(projectId)
  if (!access.isStaff) throw new Error('คุณไม่มีสิทธิ์ตรวจสอบไฟล์นี้')

  const supabase = await createClient()
  const { error } = await supabase
    .from('project_assets')
    .update({
      review_status: status,
      review_note: note,
      reviewed_by: access.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', assetId)
    .eq('project_id', projectId)

  if (error) {
    console.error('[intake] asset review failed:', error)
    return { error: 'ไม่สามารถบันทึกผลตรวจสอบได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'project.asset_reviewed',
    entityType: 'project_asset',
    entityId: assetId,
    projectId,
    metadata: { status, note },
  })
  revalidateIntake(projectId)
  return { message: 'บันทึกผลตรวจสอบแล้ว' }
}
