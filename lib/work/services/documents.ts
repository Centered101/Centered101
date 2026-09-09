'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'

import { requireProjectFinance, requireProjectManage } from '@/lib/work/auth/permissions'
import { createClient } from '@/lib/work/supabase/server'
import { createAdminClient } from '@/lib/work/supabase/admin'
import {
  documentActionSchema,
  saveBrandSchema,
  setDocumentVisibilitySchema,
  updateDocumentSchema,
  uploadDocumentSchema,
} from '@/lib/work/validation/documents'
import type { DocumentVisibility } from '@/lib/work/types/enums'
import { logActivity } from './activity'

/**
 * Document mutations — the write path the Phase 5 audit found missing.
 *
 * Before this file the `documents` table had five RLS policies, a private
 * bucket and a signed-URL download route, and NOTHING in the application that
 * could put a row in it: `queries/documents.ts` only ever read. Invoices
 * arrived by other means; an actual upload was unreachable.
 *
 * WHAT THIS FILE DOES NOT DO, deliberately:
 *   - it never issues, voids or numbers a finance document. `document_number`,
 *     `issued_at`, `amount` and the DRAFT -> ISSUED lifecycle stay with the
 *     quotation/invoice code that already owns them. This uploads FILES and
 *     classifies them; it does not price anything.
 *   - it never touches payment_milestones, payments or the ฿250 rule.
 *   - it never writes `organization_id` from the form. That is read from the
 *     project row after authorization, so a caller cannot file a document
 *     into another tenant by editing a hidden input.
 *
 * Authorization is `requireProjectFinance` throughout, matching the EXISTING
 * `documents_insert_staff` policy (super_admin/admin/accountant). A developer
 * holds `document:read` and can see documents; they cannot upload one, and
 * this file does not widen that.
 */

const BUCKET = 'work-documents'

/** Mirrors the bucket's own allowed_mime_types (migration 0015). */
const ALLOWED_MIME = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
/** The bucket's own limit (25 MB). Checked here too so the error is in Thai. */
const MAX_BYTES = 26214400

export type DocumentActionState = {
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

function revalidateDocuments(projectId: string) {
  revalidatePath(`/work/admin/projects/${projectId}`)
  revalidatePath(`/work/admin/projects/${projectId}/documents`)
  revalidatePath('/work/admin/documents')
  revalidatePath(`/work/portal/projects/${projectId}`)
  revalidatePath(`/work/portal/projects/${projectId}/documents`)
}

/**
 * The organization a project belongs to, read under the CALLER'S session so
 * RLS has to agree the project is theirs before its id is used for anything.
 * Never taken from the form — see this file's header.
 */
async function projectOrganization(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('projects')
    .select('organization_id')
    .eq('id', projectId)
    .maybeSingle<{ organization_id: string }>()
  return data?.organization_id ?? null
}

/**
 * Uploads a document file and its metadata row.
 *
 * Storage first, row second — the same order `uploadProjectAsset` and
 * `submitFeedback` already use: a failed upload costs a retry, whereas a row
 * inserted before its file would be a document that renders with a download
 * button leading nowhere. If the row then fails, the orphaned object is
 * removed.
 *
 * The storage path is chosen ENTIRELY by the server and follows migration
 * 0015's convention, `{organization_id}/{project_id}/{uuid}.{ext}`, so no part
 * of it is caller-controlled. A guessable path is harmless anyway (the bucket
 * is private and the download route re-checks RLS), but a path built from a
 * user-supplied filename is a directory-traversal question nobody needs.
 */
export async function uploadDocument(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectFinance(projectId)

  const parsed = uploadDocumentSchema.safeParse({
    projectId,
    title: formData.get('title'),
    type: formData.get('type'),
    visibility: formData.get('visibility') ?? undefined,
    notes: formData.get('notes') ?? undefined,
  })
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) }
  const input = parsed.data

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { fieldErrors: { file: 'กรุณาเลือกไฟล์' } }
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return { fieldErrors: { file: 'ประเภทไฟล์นี้ไม่รองรับ (PDF, รูปภาพ, Word, Excel)' } }
  }
  if (file.size > MAX_BYTES) {
    return { fieldErrors: { file: 'ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 25MB)' } }
  }

  const supabase = await createClient()
  const organizationId = await projectOrganization(supabase, projectId)
  if (!organizationId) return { error: 'ไม่พบโปรเจกต์นี้' }

  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
  const path = `${organizationId}/${projectId}/${randomUUID()}.${extension}`

  const admin = createAdminClient()
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (uploadError) {
    console.error('[documents] upload failed:', uploadError)
    return { error: 'อัปโหลดไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }
  }

  // Inserted under the caller's session, so `documents_insert_staff` re-checks
  // the authorization requireProjectFinance already made.
  const { data: created, error } = await supabase
    .from('documents')
    .insert({
      organization_id: organizationId,
      project_id: projectId,
      type: input.type,
      // DRAFT, always. Issuing is a finance act with a number and a date, and
      // this action deliberately owns neither.
      status: 'DRAFT',
      title: input.title,
      notes: input.notes,
      visibility: input.visibility,
      storage_path: path,
      file_size: file.size,
      mime_type: file.type,
      created_by: access.userId,
    })
    .select('id')
    .single<{ id: string }>()

  if (error || !created) {
    console.error('[documents] row insert failed:', error)
    await admin.storage.from(BUCKET).remove([path])
    return { error: 'ไม่สามารถบันทึกเอกสารได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId,
    action: 'document.uploaded',
    entityType: 'document',
    entityId: created.id,
    projectId,
    metadata: { title: input.title, type: input.type, visibility: input.visibility },
  })

  revalidateDocuments(projectId)
  return { message: 'อัปโหลดเอกสารแล้ว' }
}

/** Edits title/type/visibility/notes. Never the file, the number or the amount. */
export async function updateDocument(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectFinance(projectId)

  const parsed = updateDocumentSchema.safeParse({
    projectId,
    documentId: formData.get('documentId'),
    title: formData.get('title'),
    type: formData.get('type'),
    visibility: formData.get('visibility') ?? undefined,
    notes: formData.get('notes') ?? undefined,
  })
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) }
  const input = parsed.data

  // `requireProjectFinance` already resolved (and authorized) this project's
  // organization, so re-querying it would be a second round trip for an answer
  // already in hand — and one that could disagree with the one authorization
  // was granted against.
  const organizationId = access.organizationId
  const supabase = await createClient()

  // `.eq('project_id', projectId)` alongside the id: the id came from the
  // browser, and without this a valid document id from ANOTHER project would
  // be edited under this project's authorization. RLS would still confine it
  // to the caller's organization, but not to the project they were authorized
  // for — this is the difference between org-level and project-level IDOR.
  const { error, count } = await supabase
    .from('documents')
    .update(
      {
        title: input.title,
        type: input.type,
        visibility: input.visibility,
        notes: input.notes,
      },
      { count: 'exact' },
    )
    .eq('id', input.documentId)
    .eq('project_id', projectId)

  if (error) {
    console.error('[documents] update failed:', error)
    return { error: 'ไม่สามารถบันทึกการแก้ไขได้ กรุณาลองใหม่อีกครั้ง' }
  }
  if (!count) return { error: 'ไม่พบเอกสารนี้ในโปรเจกต์' }

  await logActivity({
    organizationId,
    action: 'document.updated',
    entityType: 'document',
    entityId: input.documentId,
    projectId,
    metadata: { title: input.title, type: input.type, visibility: input.visibility },
  })

  revalidateDocuments(projectId)
  return { message: 'บันทึกการแก้ไขแล้ว' }
}

/**
 * The visibility toggle, as its own action and its own audit event.
 *
 * Separate from `updateDocument` because "who decided the client could see
 * this, and when" is the question an access dispute asks, and folding it into
 * a generic update would bury the answer in a metadata blob.
 */
export async function setDocumentVisibility(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectFinance(projectId)

  const parsed = setDocumentVisibilitySchema.safeParse({
    projectId,
    documentId: formData.get('documentId'),
    visibility: formData.get('visibility'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'คำขอไม่ถูกต้อง' }
  const input = parsed.data

  // Same as updateDocument: the authorized organization is already known.
  const organizationId = access.organizationId
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('documents')
    .select('id, title, visibility')
    .eq('id', input.documentId)
    .eq('project_id', projectId)
    .maybeSingle<{ id: string; title: string; visibility: DocumentVisibility }>()

  if (!existing) return { error: 'ไม่พบเอกสารนี้ในโปรเจกต์' }
  if (existing.visibility === input.visibility) return { message: 'สิทธิ์การเข้าถึงเป็นค่านี้อยู่แล้ว' }

  const { error, count } = await supabase
    .from('documents')
    .update({ visibility: input.visibility }, { count: 'exact' })
    .eq('id', input.documentId)
    .eq('project_id', projectId)

  if (error) {
    console.error('[documents] visibility change failed:', error)
    return { error: 'ไม่สามารถเปลี่ยนสิทธิ์การเข้าถึงได้ กรุณาลองใหม่อีกครั้ง' }
  }
  if (!count) return { error: 'ไม่พบเอกสารนี้ในโปรเจกต์' }

  await logActivity({
    organizationId,
    action: 'document.visibility_changed',
    entityType: 'document',
    entityId: input.documentId,
    projectId,
    metadata: { title: existing.title, from: existing.visibility, to: input.visibility },
  })

  revalidateDocuments(projectId)
  return {
    message:
      input.visibility === 'CLIENT_VISIBLE'
        ? 'ลูกค้าสามารถเห็นเอกสารนี้แล้ว'
        : 'เอกสารนี้เป็นเอกสารภายในแล้ว',
  }
}

/**
 * Archives a document: it leaves the client's view and the default staff list,
 * and its file stays exactly where it is.
 *
 * NOT a delete. `documents_delete_managers` still exists for the rare real
 * deletion, but an archived document remains the record that something was
 * once issued — which is the whole point of keeping a paper trail.
 */
export async function archiveDocument(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectFinance(projectId)

  const parsed = documentActionSchema.safeParse({
    projectId,
    documentId: formData.get('documentId'),
  })
  if (!parsed.success) return { error: 'คำขอไม่ถูกต้อง' }
  const input = parsed.data

  const supabase = await createClient()
  const organizationId = await projectOrganization(supabase, projectId)
  if (!organizationId) return { error: 'ไม่พบโปรเจกต์นี้' }

  const { error, count } = await supabase
    .from('documents')
    .update(
      { archived_at: new Date().toISOString(), archived_by: access.userId },
      { count: 'exact' },
    )
    .eq('id', input.documentId)
    .eq('project_id', projectId)
    .is('archived_at', null)

  if (error) {
    console.error('[documents] archive failed:', error)
    return { error: 'ไม่สามารถเก็บเอกสารได้ กรุณาลองใหม่อีกครั้ง' }
  }
  // Zero rows means it was already archived, or is not in this project.
  if (!count) return { error: 'เอกสารนี้ถูกเก็บไปแล้วหรือไม่พบในโปรเจกต์' }

  await logActivity({
    organizationId,
    action: 'document.archived',
    entityType: 'document',
    entityId: input.documentId,
    projectId,
  })

  revalidateDocuments(projectId)
  return { message: 'เก็บเอกสารเข้าคลังแล้ว' }
}

/**
 * Uploads a NEW document that supersedes an existing one.
 *
 * A replacement is a new row, never an overwrite: the superseded file stays
 * downloadable and `supersedes_id` keeps the chain walkable — the same shape
 * agreement_versions and payment_plans.supersedes_id already use, and for the
 * same reason (a document whose content can change after someone read it is
 * not evidence of anything).
 *
 * The old row is archived rather than deleted, so it leaves the client's list
 * while remaining in the history.
 */
export async function replaceDocument(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectFinance(projectId)

  const supersedesId = String(formData.get('documentId') ?? '')
  const parsedTarget = documentActionSchema.safeParse({ projectId, documentId: supersedesId })
  if (!parsedTarget.success) return { error: 'คำขอไม่ถูกต้อง' }

  const supabase = await createClient()

  // Confirmed to be in THIS project under the caller's session before anything
  // else happens — the same project-level IDOR guard updateDocument uses.
  const { data: previous } = await supabase
    .from('documents')
    .select('id, title, type, visibility, project_id')
    .eq('id', supersedesId)
    .eq('project_id', projectId)
    .maybeSingle<{
      id: string
      title: string
      type: string
      visibility: DocumentVisibility
      project_id: string
    }>()
  if (!previous) return { error: 'ไม่พบเอกสารที่ต้องการแทนที่' }

  const parsed = uploadDocumentSchema.safeParse({
    projectId,
    title: formData.get('title') || previous.title,
    type: formData.get('type') || previous.type,
    // Inherits the superseded document's visibility unless the form says
    // otherwise: silently making a replacement more visible than the thing it
    // replaced is exactly the kind of quiet widening this phase is about.
    visibility: formData.get('visibility') || previous.visibility,
    notes: formData.get('notes') ?? undefined,
  })
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) }
  const input = parsed.data

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { fieldErrors: { file: 'กรุณาเลือกไฟล์' } }
  if (!ALLOWED_MIME.includes(file.type)) {
    return { fieldErrors: { file: 'ประเภทไฟล์นี้ไม่รองรับ (PDF, รูปภาพ, Word, Excel)' } }
  }
  if (file.size > MAX_BYTES) return { fieldErrors: { file: 'ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 25MB)' } }

  const organizationId = await projectOrganization(supabase, projectId)
  if (!organizationId) return { error: 'ไม่พบโปรเจกต์นี้' }

  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
  const path = `${organizationId}/${projectId}/${randomUUID()}.${extension}`

  const admin = createAdminClient()
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (uploadError) {
    console.error('[documents] replacement upload failed:', uploadError)
    return { error: 'อัปโหลดไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }
  }

  const { data: created, error } = await supabase
    .from('documents')
    .insert({
      organization_id: organizationId,
      project_id: projectId,
      type: input.type,
      status: 'DRAFT',
      title: input.title,
      notes: input.notes,
      visibility: input.visibility,
      storage_path: path,
      file_size: file.size,
      mime_type: file.type,
      supersedes_id: previous.id,
      created_by: access.userId,
    })
    .select('id')
    .single<{ id: string }>()

  if (error || !created) {
    console.error('[documents] replacement row insert failed:', error)
    await admin.storage.from(BUCKET).remove([path])
    return { error: 'ไม่สามารถบันทึกเอกสารได้ กรุณาลองใหม่อีกครั้ง' }
  }

  // The old row is archived, not deleted: it stays in the history chain and
  // its file stays downloadable to staff.
  await supabase
    .from('documents')
    .update({ archived_at: new Date().toISOString(), archived_by: access.userId })
    .eq('id', previous.id)
    .eq('project_id', projectId)
    .is('archived_at', null)

  await logActivity({
    organizationId,
    action: 'document.replaced',
    entityType: 'document',
    entityId: created.id,
    projectId,
    metadata: { title: input.title, supersedes: previous.id, previousTitle: previous.title },
  })

  revalidateDocuments(projectId)
  return { message: 'แทนที่เอกสารด้วยฉบับใหม่แล้ว' }
}

// -----------------------------------------------------------------------------
// Brand
// -----------------------------------------------------------------------------
/**
 * Saves the project's OFFICIAL brand palette and typefaces
 * (`projects.brand`, migration 0039).
 *
 * Never touches `projects.requirements.brandColors/fonts` — that is the
 * CLIENT'S ask, written once at intake, and the whole point of two columns is
 * that proposing a different palette does not overwrite what they asked for.
 *
 * GATED ON PROJECT MANAGEMENT, NOT FINANCE. A palette is not a price, and
 * `requireProjectFinance` admits accountants — who `projects_update_staff`
 * (super_admin/admin/developer) then refuses at the RLS layer. That mismatch
 * is exactly the F1 shape: an app gate wider than the policy underneath it.
 * `requireProjectManage` mirrors that policy exactly, so an accountant is
 * turned away at the door with a real message instead of being let through to
 * a write that cannot land. Developers keep it, since brand is delivery work.
 *
 * Written under the caller's session so `projects_update_staff` re-checks it
 * independently; a client cannot reach this at all — `requireProjectManage`
 * refuses them well before the write, and their own `projects_update_owner`
 * policy plus the status-write guard would refuse it again.
 */
export async function saveProjectBrand(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectManage(projectId)

  const parsed = saveBrandSchema.safeParse({
    projectId,
    colors: formData.get('colorsJson') ?? '[]',
    fonts: formData.get('fontsJson') ?? '[]',
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'ข้อมูลแบรนด์ไม่ถูกต้อง' }
  }
  const input = parsed.data

  const supabase = await createClient()

  const { error, count } = await supabase
    .from('projects')
    .update({ brand: { colors: input.colors, fonts: input.fonts } }, { count: 'exact' })
    .eq('id', projectId)

  if (error) {
    console.error('[documents] brand save failed:', error)
    return { error: 'ไม่สามารถบันทึกแบรนด์ได้ กรุณาลองใหม่อีกครั้ง' }
  }
  if (!count) return { error: 'ไม่สามารถบันทึกแบรนด์ได้ — ไม่พบโปรเจกต์หรือไม่มีสิทธิ์แก้ไข' }

  await logActivity({
    organizationId: access.organizationId,
    action: 'brand.updated',
    entityType: 'project',
    entityId: projectId,
    projectId,
    metadata: { colors: input.colors.length, fonts: input.fonts.length },
  })

  revalidateDocuments(projectId)
  return { message: 'บันทึกแบรนด์โปรเจกต์แล้ว' }
}
