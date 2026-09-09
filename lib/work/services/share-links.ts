'use server'

import { revalidatePath } from 'next/cache'

import { requireProjectManage } from '@/lib/work/auth/permissions'
import { createClient } from '@/lib/work/supabase/server'
import { generateShareToken, hashShareToken } from '@/lib/work/tokens'
import { getWorkUrl } from '@/lib/work/auth/callback-url'
import { logActivity } from './activity'

export type ShareLinkActionState = {
  error?: string
  message?: string
  /** The full share URL, shown ONCE right after creation. Never stored. */
  shareUrl?: string
}

const EXPIRY_DAYS = [7, 30, 90] as const

/**
 * Issues a new share link for a project.
 *
 * The raw token is generated here, hashed before it touches the database
 * (lib/work/tokens.ts), and returned to the caller exactly once — this
 * function is the only place in the codebase that ever sees the plaintext
 * alongside the project it unlocks. Losing this response loses the token: it
 * cannot be recovered from `share_links` afterwards, by design.
 */
export async function createShareLink(
  _prev: ShareLinkActionState,
  formData: FormData,
): Promise<ShareLinkActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const access = await requireProjectManage(projectId)

  const days = Number(formData.get('expiresInDays') ?? 30)
  const expiresInDays = (EXPIRY_DAYS as readonly number[]).includes(days) ? days : 30

  const maxViewsRaw = String(formData.get('maxViews') ?? '').trim()
  const maxViews = maxViewsRaw ? Math.max(1, Math.floor(Number(maxViewsRaw))) : null

  const label = String(formData.get('label') ?? '').trim() || null

  const token = generateShareToken()
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()

  const supabase = await createClient()
  const { error } = await supabase.from('share_links').insert({
    organization_id: access.organizationId,
    project_id: projectId,
    token_hash: hashShareToken(token),
    label,
    expires_at: expiresAt,
    max_views: maxViews && Number.isFinite(maxViews) ? maxViews : null,
    created_by: access.userId,
  })

  if (error) {
    console.error('[share-links] create failed:', error)
    return { error: 'ไม่สามารถสร้างลิงก์แชร์ได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'share_link.created',
    entityType: 'share_link',
    projectId,
    metadata: { expiresAt, maxViews, label },
  })

  revalidatePath(`/work/admin/projects/${projectId}`)

  const shareUrl = await getWorkUrl(`/share/${token}`)
  return { message: 'สร้างลิงก์แชร์แล้ว — คัดลอกไว้ตอนนี้ จะไม่แสดงลิงก์นี้อีก', shareUrl }
}

/** Revokes a share link. Sets `revoked_at`; the row and its history stay. */
export async function revokeShareLink(
  _prev: ShareLinkActionState,
  formData: FormData,
): Promise<ShareLinkActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const shareLinkId = String(formData.get('shareLinkId') ?? '')
  const access = await requireProjectManage(projectId)

  const supabase = await createClient()
  const { error } = await supabase
    .from('share_links')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', shareLinkId)
    .eq('project_id', projectId)

  if (error) {
    console.error('[share-links] revoke failed:', error)
    return { error: 'ไม่สามารถยกเลิกลิงก์ได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'share_link.revoked',
    entityType: 'share_link',
    entityId: shareLinkId,
    projectId,
  })

  revalidatePath(`/work/admin/projects/${projectId}`)

  return { message: 'ยกเลิกลิงก์แล้ว' }
}
