'use server'

import { revalidatePath } from 'next/cache'

import { getWorkUrl } from '@/lib/work/auth/callback-url'
import { getUser } from '@/lib/work/auth/session'
import { requireProjectMembers } from '@/lib/work/auth/permissions'
import { createAdminClient } from '@/lib/work/supabase/admin'
import { createClient } from '@/lib/work/supabase/server'
import { generateShareToken, hashShareToken } from '@/lib/work/tokens'
import { unwrapOr } from '@/lib/work/queries/internal'
import {
  changeMemberRoleSchema,
  inviteMemberSchema,
} from '@/lib/work/validation/collaboration'
import { logActivity } from './activity'
import type { ActionState } from './projects'

export type InvitationActionState = ActionState & {
  /** The full invitation URL, shown ONCE right after creation — same rule as createShareLink. */
  invitationUrl?: string
}

const INVITATION_EXPIRY_DAYS = 14

/**
 * Invites someone onto a project by email.
 *
 * Gated by `requireProjectMembers` — a self-serve OWNER, or agency staff who
 * can manage the project. `role <> 'OWNER'` is enforced THREE times over,
 * deliberately: the Zod schema, the RLS `with check` (migration 0026), and
 * the table's own `project_invitations_role_not_owner` CHECK constraint —
 * ownership is transferred, never invited.
 *
 * The token is generated here, hashed before it touches the database (the
 * same `lib/work/tokens.ts` primitives `createShareLink` uses — a
 * cryptographically random 256-bit token, only its SHA-256 hash stored), and
 * returned exactly once. There is no email-sending in this codebase yet
 * (nothing here pretends otherwise): the URL is handed back to the inviter
 * to copy and send however they already reach this person, the same shape
 * `createShareLink` already uses for its own one-time URL.
 */
export async function inviteMember(
  _prev: InvitationActionState,
  formData: FormData,
): Promise<InvitationActionState> {
  const parsed = inviteMemberSchema.safeParse({
    projectId: formData.get('projectId'),
    email: formData.get('email'),
    role: formData.get('role'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' }
  }

  const { projectId, email, role } = parsed.data
  const access = await requireProjectMembers(projectId)

  const supabase = await createClient()

  // Already an active member? Nothing to invite. Fetched and matched in JS
  // rather than an embedded-resource filter, so this does not depend on
  // exactly how PostgREST resolves a dot-path filter on a joined table.
  const membersResult = await supabase
    .from('project_members')
    .select('profiles!project_members_profile_id_fkey(email)')
    .eq('project_id', projectId)
    .eq('status', 'ACTIVE')
  const activeMembers = unwrapOr<{ profiles: { email: string } | null }[]>(membersResult, 'สมาชิก', [])
  const alreadyMember = activeMembers.some((row) => row.profiles?.email?.toLowerCase() === email)
  if (alreadyMember) {
    return { error: 'อีเมลนี้เป็นสมาชิกของโปรเจกต์นี้อยู่แล้ว' }
  }

  // A pending invitation to the same email already exists — revoke it first
  // (the unique index would reject a second PENDING row for the same
  // project+email anyway; this turns that into a clear message instead of a
  // raw constraint error, and reissues instead of asking the user to find
  // and revoke the old one themselves).
  await supabase
    .from('project_invitations')
    .update({ status: 'REVOKED' })
    .eq('project_id', projectId)
    .eq('status', 'PENDING')
    .ilike('email', email)

  const token = generateShareToken()
  const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await supabase.from('project_invitations').insert({
    project_id: projectId,
    email,
    role,
    token_hash: hashShareToken(token),
    invited_by: access.userId,
    expires_at: expiresAt,
  })

  if (error) {
    console.error('[collaboration] invite failed:', error)
    return { error: 'ไม่สามารถส่งคำเชิญได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'project_invitation.created',
    entityType: 'project_invitation',
    projectId,
    metadata: { email, role },
  })

  revalidatePath(`/work/portal/projects/${projectId}`)
  revalidatePath(`/work/portal/projects/${projectId}/members`)

  const invitationUrl = await getWorkUrl(`/portal/invitations/${token}`)
  return {
    message: 'สร้างคำเชิญแล้ว — คัดลอกลิงก์นี้ไว้ตอนนี้ จะไม่แสดงอีก',
    invitationUrl,
  }
}

/** Revokes a pending invitation. Sets status = REVOKED; the row and its history stay. */
export async function revokeInvitation(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const invitationId = String(formData.get('invitationId') ?? '')
  const access = await requireProjectMembers(projectId)

  const supabase = await createClient()
  const { error } = await supabase
    .from('project_invitations')
    .update({ status: 'REVOKED' })
    .eq('id', invitationId)
    .eq('project_id', projectId)
    .eq('status', 'PENDING')

  if (error) {
    console.error('[collaboration] revoke failed:', error)
    return { error: 'ไม่สามารถยกเลิกคำเชิญได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'project_invitation.revoked',
    entityType: 'project_invitation',
    entityId: invitationId,
    projectId,
  })

  revalidatePath(`/work/portal/projects/${projectId}`)
  revalidatePath(`/work/portal/projects/${projectId}/members`)

  return { message: 'ยกเลิกคำเชิญแล้ว' }
}

export type AcceptInvitationState = ActionState & {
  /** The project the caller was just added to, so the UI can redirect there. */
  projectId?: string
}

/**
 * Accepts an invitation the signed-in user was sent.
 *
 * THE ORDER OF THESE STEPS IS THE SECURITY MODEL, the same shape as
 * acceptAgreement() (services/agreements.ts):
 *
 *   1. Hash the token and look up the invitation UNDER THE CALLER'S SESSION.
 *      RLS (`project_invitations_select_own`) only returns a row whose email
 *      matches the caller's own verified `profiles.email` — someone else's
 *      invitation, or a wrong/guessed token, comes back as nothing here,
 *      never a distinguishable error.
 *   2. Flip PENDING -> ACCEPTED, again under the caller's own session — RLS
 *      (`project_invitations_update_accept_own`) enforces the email match a
 *      SECOND time, independently, and rejects an already-ACCEPTED,
 *      EXPIRED, or REVOKED row outright (its USING clause requires
 *      status = 'PENDING').
 *   3. ONLY THEN, with step 2 having just proven this exact person accepted
 *      this exact invitation, use the privileged client to insert the
 *      project_members row — a write the caller's own session has no RLS
 *      policy for (project_members_insert_owner requires is_project_owner;
 *      a brand-new member is not yet the owner of anything). This is a write
 *      performed ON BEHALF of an already-authorized action, never a
 *      shortcut around authorization.
 */
export async function acceptProjectInvitation(
  _prev: AcceptInvitationState,
  formData: FormData,
): Promise<AcceptInvitationState> {
  const token = String(formData.get('token') ?? '')
  if (!token) return { error: 'ลิงก์คำเชิญไม่ถูกต้อง' }
  return finalizeAcceptance({ column: 'token_hash', value: hashShareToken(token) })
}

/**
 * Accepts an invitation from the "Login -> Invitations" inbox
 * (getMyPendingInvitations), which lists rows by email match and — by
 * design, the token is never returned after creation — does not have the
 * token to accept by. Keyed by id instead; RLS enforces the exact same email
 * match either way (project_invitations_select_own /
 * _update_accept_own do not care which column found the row).
 */
export async function acceptProjectInvitationById(
  _prev: AcceptInvitationState,
  formData: FormData,
): Promise<AcceptInvitationState> {
  const invitationId = String(formData.get('invitationId') ?? '')
  if (!invitationId) return { error: 'คำเชิญไม่ถูกต้อง' }
  return finalizeAcceptance({ column: 'id', value: invitationId })
}

async function finalizeAcceptance(lookup: {
  column: 'token_hash' | 'id'
  value: string
}): Promise<AcceptInvitationState> {
  const user = await getUser()
  if (!user) return { error: 'กรุณาเข้าสู่ระบบก่อนยอมรับคำเชิญ' }

  const supabase = await createClient()

  const { data: invitation } = await supabase
    .from('project_invitations')
    .select('id, project_id, role, status, expires_at')
    .eq(lookup.column, lookup.value)
    .maybeSingle<{ id: string; project_id: string; role: string; status: string; expires_at: string }>()

  // Same answer whether the token/id is wrong, addressed to someone else, or
  // simply does not exist — RLS already collapsed those cases into "no row".
  if (!invitation) return { error: 'ไม่พบคำเชิญนี้ หรือคำเชิญนี้ไม่ได้ส่งถึงอีเมลของคุณ' }
  if (invitation.status === 'REVOKED') return { error: 'คำเชิญนี้ถูกยกเลิกแล้ว' }
  if (invitation.status === 'ACCEPTED') return { error: 'คำเชิญนี้ถูกใช้ไปแล้ว' }
  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    return { error: 'คำเชิญนี้หมดอายุแล้ว' }
  }

  const { error: acceptError } = await supabase
    .from('project_invitations')
    .update({ status: 'ACCEPTED', accepted_at: new Date().toISOString(), accepted_by: user.id })
    .eq('id', invitation.id)
    .eq('status', 'PENDING')

  if (acceptError) {
    console.error('[collaboration] accept failed:', acceptError)
    return { error: 'ไม่สามารถยอมรับคำเชิญได้ กรุณาลองใหม่อีกครั้ง' }
  }

  const admin = createAdminClient()
  const { error: memberError } = await admin.from('project_members').upsert(
    {
      project_id: invitation.project_id,
      profile_id: user.id,
      role: invitation.role,
      status: 'ACTIVE',
      invited_by: null, // set at read time from the invitation row if ever needed — not denormalised here
      created_by: user.id,
    },
    { onConflict: 'project_id,profile_id' },
  )

  if (memberError) {
    console.error('[collaboration] member insert after accept failed:', memberError)
    return { error: 'ยอมรับคำเชิญแล้วแต่เพิ่มสมาชิกไม่สำเร็จ กรุณาติดต่อทีมงาน' }
  }

  revalidatePath('/work/portal/projects')
  revalidatePath(`/work/portal/projects/${invitation.project_id}`)
  revalidatePath('/work/portal/invitations')

  return { message: 'เข้าร่วมโปรเจกต์แล้ว', projectId: invitation.project_id }
}

/** Removes a member (sets status = REMOVED). Cannot target the OWNER row — see migration 0026's own RLS comment. */
export async function removeMember(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const projectId = String(formData.get('projectId') ?? '')
  const memberId = String(formData.get('memberId') ?? '')
  const access = await requireProjectMembers(projectId)

  const supabase = await createClient()
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('id', memberId)
    .eq('project_id', projectId)

  if (error) {
    console.error('[collaboration] remove member failed:', error)
    return { error: 'ไม่สามารถลบสมาชิกได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'project_member.removed',
    entityType: 'project_member',
    entityId: memberId,
    projectId,
  })

  revalidatePath(`/work/portal/projects/${projectId}`)
  revalidatePath(`/work/portal/projects/${projectId}/members`)

  return { message: 'ลบสมาชิกแล้ว' }
}

/** Changes a member's role. Can never set (or target) OWNER — enforced by RLS, re-checked here for a clean error message. */
export async function changeMemberRole(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = changeMemberRoleSchema.safeParse({
    projectId: formData.get('projectId'),
    memberId: formData.get('memberId'),
    role: formData.get('role'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' }

  const { projectId, memberId, role } = parsed.data
  const access = await requireProjectMembers(projectId)

  const supabase = await createClient()
  const { error } = await supabase
    .from('project_members')
    .update({ role })
    .eq('id', memberId)
    .eq('project_id', projectId)
    .neq('role', 'OWNER')

  if (error) {
    console.error('[collaboration] change role failed:', error)
    return { error: 'ไม่สามารถเปลี่ยนบทบาทได้ กรุณาลองใหม่อีกครั้ง' }
  }

  await logActivity({
    organizationId: access.organizationId,
    action: 'project_member.role_changed',
    entityType: 'project_member',
    entityId: memberId,
    projectId,
    metadata: { role },
  })

  revalidatePath(`/work/portal/projects/${projectId}`)
  revalidatePath(`/work/portal/projects/${projectId}/members`)

  return { message: 'เปลี่ยนบทบาทแล้ว' }
}
