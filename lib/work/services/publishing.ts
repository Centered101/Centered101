'use server'

import { revalidatePath } from 'next/cache'

import { requireProjectManage } from '@/lib/work/auth/permissions'
import { createClient } from '@/lib/work/supabase/server'
import {
  attachSourceCodeSchema,
  publishingActionSchema,
  savePublishingSchema,
} from '@/lib/work/validation/publishing'
import { logActivity } from './activity'

export type PublishingActionState = {
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

function revalidatePublishing(projectId: string) {
  revalidatePath(`/work/admin/projects/${projectId}/publishing`)
  revalidatePath(`/work/portal/projects/${projectId}/source-code`)
  revalidatePath(`/work/portal/projects/${projectId}/deployment`)
}

/**
 * EVERY action in this file is gated on `requireProjectManage`, which mirrors
 * `project_publishing`'s own policies (`app.can_manage_project` —
 * super_admin/admin/developer) exactly.
 *
 * NOT `requireProjectFinance`. An accountant settles the payment whose
 * `unlock_rules` release the source code, and must still not be able to
 * publish the site, rewrite the repository, or attach a delivery. Widening the
 * app gate past the policy underneath is the F1 defect, and it is why the
 * brand action was moved to this same gate in Phase 5.
 *
 * Every write is `{ count: 'exact' }` and a zero-row result is an error, never
 * a success message.
 */

/** Upsert, because a project's publishing row is created lazily on first save. */
async function upsertPublishing(
  projectId: string,
  patch: Record<string, unknown>,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()

  const existing = await supabase
    .from('project_publishing')
    .select('id')
    .eq('project_id', projectId)
    .maybeSingle<{ id: string }>()

  if (existing.data) {
    const { error, count } = await supabase
      .from('project_publishing')
      .update({ ...patch, updated_by: userId }, { count: 'exact' })
      .eq('project_id', projectId)

    if (error) {
      console.error('[publishing] update failed:', error)
      return { ok: false, error: 'ไม่สามารถบันทึกข้อมูลการเผยแพร่ได้ กรุณาลองใหม่อีกครั้ง' }
    }
    // Zero rows here means the UPDATE policy refused it. Reporting success
    // would be the silent-success bug F1 was about.
    if (!count) return { ok: false, error: 'ไม่สามารถบันทึกได้ — ไม่พบโปรเจกต์หรือไม่มีสิทธิ์แก้ไข' }
    return { ok: true }
  }

  const { error, count } = await supabase.from('project_publishing').insert(
    { project_id: projectId, ...patch, created_by: userId, updated_by: userId },
    { count: 'exact' },
  )

  if (error) {
    console.error('[publishing] insert failed:', error)
    return { ok: false, error: 'ไม่สามารถบันทึกข้อมูลการเผยแพร่ได้ กรุณาลองใหม่อีกครั้ง' }
  }
  if (!count) return { ok: false, error: 'ไม่สามารถบันทึกได้ — ไม่พบโปรเจกต์หรือไม่มีสิทธิ์แก้ไข' }
  return { ok: true }
}

/** Repository details, URLs, domain and hosting notes. Does NOT publish. */
export async function savePublishing(
  _prev: PublishingActionState,
  formData: FormData,
): Promise<PublishingActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectManage(projectId)

  const parsed = savePublishingSchema.safeParse({
    projectId,
    repositoryUrl: formData.get('repositoryUrl') ?? undefined,
    repositoryBranch: formData.get('repositoryBranch') ?? undefined,
    repositoryCommitSha: formData.get('repositoryCommitSha') ?? undefined,
    repositoryNotes: formData.get('repositoryNotes') ?? undefined,
    productionUrl: formData.get('productionUrl') ?? undefined,
    previewUrl: formData.get('previewUrl') ?? undefined,
    domain: formData.get('domain') ?? undefined,
    hostingProvider: formData.get('hostingProvider') ?? undefined,
    notes: formData.get('notes') ?? undefined,
  })
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) }
  const input = parsed.data

  const result = await upsertPublishing(
    projectId,
    {
      repository_url: input.repositoryUrl,
      repository_branch: input.repositoryBranch,
      repository_commit_sha: input.repositoryCommitSha,
      repository_notes: input.repositoryNotes,
      production_url: input.productionUrl,
      preview_url: input.previewUrl,
      domain: input.domain,
      hosting_provider: input.hostingProvider,
      notes: input.notes,
    },
    access.userId,
  )
  if (!result.ok) return { error: result.error }

  await logActivity({
    organizationId: access.organizationId,
    action: 'publishing.updated',
    entityType: 'project',
    entityId: projectId,
    projectId,
    // URLs only — never a token, and nothing read from a secret.
    metadata: {
      hasRepository: input.repositoryUrl !== null,
      productionUrl: input.productionUrl,
      previewUrl: input.previewUrl,
    },
  })

  revalidatePublishing(projectId)
  return { message: 'บันทึกข้อมูลการเผยแพร่แล้ว' }
}

/**
 * Marks the project live.
 *
 * `published_at` and `published_by` come from the server clock and the
 * session — never from the form. A client cannot reach this at all:
 * `requireProjectManage` refuses them, and `project_publishing` has no policy
 * that would let them write the row even if they got past it.
 *
 * Requires a production URL first. "Published" with nowhere to point is the
 * kind of claim this codebase refuses to store — the same reason the portal
 * will not invent a deployment URL.
 */
export async function publishProject(
  _prev: PublishingActionState,
  formData: FormData,
): Promise<PublishingActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectManage(projectId)

  const parsed = publishingActionSchema.safeParse({ projectId })
  if (!parsed.success) return { error: 'คำขอไม่ถูกต้อง' }

  const supabase = await createClient()
  const current = await supabase
    .from('project_publishing')
    .select('production_url')
    .eq('project_id', projectId)
    .maybeSingle<{ production_url: string | null }>()

  if (!current.data?.production_url) {
    return { error: 'กรุณาบันทึก production URL ก่อนเผยแพร่' }
  }

  const now = new Date().toISOString()
  const result = await upsertPublishing(
    projectId,
    { published_at: now, published_by: access.userId, unpublished_at: null },
    access.userId,
  )
  if (!result.ok) return { error: result.error }

  await logActivity({
    organizationId: access.organizationId,
    action: 'publishing.published',
    entityType: 'project',
    entityId: projectId,
    projectId,
    metadata: { productionUrl: current.data.production_url },
  })

  revalidatePublishing(projectId)
  return { message: 'เผยแพร่โปรเจกต์แล้ว' }
}

/** Takes the project off live. The publishing record itself is never deleted. */
export async function unpublishProject(
  _prev: PublishingActionState,
  formData: FormData,
): Promise<PublishingActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectManage(projectId)

  const parsed = publishingActionSchema.safeParse({ projectId })
  if (!parsed.success) return { error: 'คำขอไม่ถูกต้อง' }

  const supabase = await createClient()
  const current = await supabase
    .from('project_publishing')
    .select('published_at')
    .eq('project_id', projectId)
    .maybeSingle<{ published_at: string | null }>()

  // The DB constraint refuses this too; catching it here gives a real message
  // instead of a constraint violation.
  if (!current.data?.published_at) return { error: 'โปรเจกต์นี้ยังไม่ได้เผยแพร่' }

  const result = await upsertPublishing(
    projectId,
    { unpublished_at: new Date().toISOString() },
    access.userId,
  )
  if (!result.ok) return { error: result.error }

  await logActivity({
    organizationId: access.organizationId,
    action: 'publishing.unpublished',
    entityType: 'project',
    entityId: projectId,
    projectId,
  })

  revalidatePublishing(projectId)
  return { message: 'ยกเลิกการเผยแพร่แล้ว' }
}

/**
 * Links an already-uploaded document as the delivered source-code package.
 *
 * LINKS, never uploads: the file arrived through the Phase 5 document flow,
 * which is the one place file type and size are checked and the one bucket
 * anything lands in. This action only records which of those documents is the
 * handover.
 *
 * Attaching does NOT unlock anything. Whether the client may download it is
 * decided every time by `unlock_rules` on their PAID milestones, which this
 * action cannot touch and does not consult.
 */
export async function attachSourceCode(
  _prev: PublishingActionState,
  formData: FormData,
): Promise<PublishingActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectManage(projectId)

  const parsed = attachSourceCodeSchema.safeParse({
    projectId,
    documentId: formData.get('documentId'),
    deliveryVersion: formData.get('deliveryVersion') ?? undefined,
  })
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) }
  const input = parsed.data

  const supabase = await createClient()

  // The document must exist IN THIS PROJECT, read under the caller's own
  // session. A document id from another project would otherwise be linked here
  // and later served through the source-code route under this project's
  // authorization — project-level IDOR, which org-level RLS alone would not
  // catch.
  const { data: document } = await supabase
    .from('documents')
    .select('id, title, storage_path, visibility')
    .eq('id', input.documentId)
    .eq('project_id', projectId)
    .maybeSingle<{ id: string; title: string; storage_path: string | null; visibility: string }>()

  if (!document) return { error: 'ไม่พบเอกสารนี้ในโปรเจกต์' }
  if (!document.storage_path) return { error: 'เอกสารนี้ไม่มีไฟล์แนบ' }

  const result = await upsertPublishing(
    projectId,
    { source_document_id: document.id, delivery_version: input.deliveryVersion },
    access.userId,
  )
  if (!result.ok) return { error: result.error }

  await logActivity({
    organizationId: access.organizationId,
    action: 'source_code.attached',
    entityType: 'project',
    entityId: projectId,
    projectId,
    metadata: { documentTitle: document.title, deliveryVersion: input.deliveryVersion },
  })

  revalidatePublishing(projectId)
  return {
    message:
      document.visibility === 'INTERNAL'
        ? 'แนบไฟล์ซอร์สโค้ดแล้ว — ลูกค้าจะดาวน์โหลดได้เมื่อปลดล็อกตามแผนการชำระเงิน'
        : 'แนบไฟล์ซอร์สโค้ดแล้ว',
  }
}
