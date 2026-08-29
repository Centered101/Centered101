'use server'

import { revalidatePath } from 'next/cache'

import { getCallbackUrl } from '@/lib/work/auth/callback-url'
import { requireAdmin } from '@/lib/work/auth/permissions'
import { createAdminClient } from '@/lib/work/supabase/admin'
import { createClient } from '@/lib/work/supabase/server'
import type { OrgRole } from '@/lib/work/types/enums'
import {
  changeMemberRoleSchema,
  inviteMemberSchema,
  removeMemberSchema,
} from '@/lib/work/validation/members'
import { logActivity } from './activity'
import type { ActionState } from './projects'

/**
 * Inviting somebody onto the team.
 *
 * TWO CLIENTS, AND THE SPLIT IS THE WHOLE DESIGN.
 *
 *   * The ADMIN client is used for exactly one thing: creating the auth user
 *     and sending the invitation mail. That is an auth-server operation with
 *     no session to act under — the invitee has no account yet, by definition.
 *     It touches no application table.
 *
 *   * The MEMBERSHIP ROW is written through the caller's own client, so
 *     `organization_members_insert_managers` re-checks `app.is_org_manager()`
 *     against the real session. The capability check below produces the good
 *     error message; that policy is the guarantee. Writing the row with the
 *     admin client would have made the entire authorization advisory.
 *
 * AN EXISTING ACCOUNT IS NOT AN ERROR. Supabase refuses to invite an address
 * that already has one, which is the common case for a colleague who has
 * signed in before — so that refusal is turned into a lookup and the person is
 * simply added to the team.
 */
export async function inviteMember(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await requireAdmin()
  if (!staff.can('member:manage')) {
    return { error: 'บัญชีของคุณไม่มีสิทธิ์เชิญสมาชิก' }
  }

  const parsed = inviteMemberSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
  })
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '')
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return { fieldErrors }
  }

  const { email, role } = parsed.data
  const admin = createAdminClient()

  // Sent before the row is written: if the mail cannot go out there is no
  // half-made member sitting in the table with no way to sign in.
  const invited = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: await getCallbackUrl('/work/admin/dashboard'),
  })

  let profileId = invited.data?.user?.id ?? null
  let alreadyHadAccount = false

  if (!profileId) {
    // `email_exists` is the expected path for a colleague who already signs
    // in here; anything else is a real failure and is reported as one.
    const message = invited.error?.message ?? ''
    const existing = /already|exists|registered/i.test(message)
    if (!existing) {
      console.error('[members] invite failed', invited.error)
      return { error: 'ส่งคำเชิญไม่สำเร็จ — ตรวจสอบการตั้งค่าอีเมลของ Supabase' }
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    // Cast at the boundary rather than through maybeSingle's generic: while
    // lib/work/types/database.ts is still the permissive placeholder, that
    // generic does not narrow and `profile.id` stays `unknown`.
    const existingId = (profile as { id: string } | null)?.id

    if (!existingId) {
      return { error: 'อีเมลนี้มีบัญชีอยู่แล้วแต่ยังไม่มีโปรไฟล์ในระบบ' }
    }

    profileId = existingId
    alreadyHadAccount = true
  }

  const supabase = await createClient()
  const { error } = await supabase.from('organization_members').insert({
    organization_id: staff.organizationId,
    profile_id: profileId,
    role: role as OrgRole,
  })

  if (error) {
    // 23505 — the person is already on this team. Saying so is more useful
    // than reporting a constraint name.
    if (error.code === '23505') {
      return { error: 'อีเมลนี้เป็นสมาชิกทีมอยู่แล้ว' }
    }
    console.error('[members] membership insert failed', error)
    return { error: 'เพิ่มสมาชิกไม่สำเร็จ' }
  }

  await logActivity({
    organizationId: staff.organizationId,
    action: 'member.invited',
    entityType: 'organization_member',
    entityId: profileId,
    metadata: { email, role },
  })

  revalidatePath('/work/admin/settings')

  return {
    message: alreadyHadAccount
      ? `เพิ่ม ${email} เข้าทีมแล้ว`
      : `ส่งคำเชิญไปที่ ${email} แล้ว`,
  }
}

// -----------------------------------------------------------------------------
// Changing and revoking membership
// -----------------------------------------------------------------------------
/**
 * The rules both mutations below share, checked against the row as it really
 * is rather than against anything the form claimed.
 *
 * NOBODY MAY ACT ON THEIR OWN ROW. It is the one guard that makes the rest
 * safe to reason about: without it the last super_admin can demote or delete
 * themselves and leave a workspace nobody can administer — a state with no
 * recovery path inside the app, since granting the role requires the role.
 * Handing your own seat to someone else is done by promoting them first.
 *
 * A super_admin's row is editable only by another super_admin, so an `admin`
 * cannot remove the person above them.
 */
async function resolveTarget(
  memberId: string,
  staff: Awaited<ReturnType<typeof requireAdmin>>,
): Promise<{ error: string } | { profileId: string; role: OrgRole; email: string }> {
  const supabase = await createClient()

  // Read under the caller's own session: RLS already limits this to their
  // organization, so a member id from another workspace simply is not found.
  const { data } = await supabase
    .from('organization_members')
    .select('profile_id, role, profiles(email)')
    .eq('id', memberId)
    .maybeSingle<{ profile_id: string; role: OrgRole; profiles: { email: string } | null }>()

  if (!data) return { error: 'ไม่พบสมาชิกคนนี้ในทีมของคุณ' }

  if (data.profile_id === staff.userId) {
    return { error: 'เปลี่ยนบทบาทหรือลบบัญชีของตัวเองไม่ได้ — ให้ผู้ดูแลคนอื่นทำแทน' }
  }

  if (data.role === 'super_admin' && staff.role !== 'super_admin') {
    return { error: 'เฉพาะผู้ดูแลระบบสูงสุดเท่านั้นที่แก้ไขบัญชีระดับเดียวกันได้' }
  }

  return { profileId: data.profile_id, role: data.role, email: data.profiles?.email ?? '' }
}

export async function changeMemberRole(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await requireAdmin()
  if (!staff.can('member:manage')) {
    return { error: 'บัญชีของคุณไม่มีสิทธิ์จัดการสมาชิก' }
  }

  const parsed = changeMemberRoleSchema.safeParse({
    memberId: formData.get('memberId'),
    role: formData.get('role'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' }
  }

  const { memberId, role } = parsed.data
  const target = await resolveTarget(memberId, staff)
  if ('error' in target) return target

  if (role === 'super_admin' && staff.role !== 'super_admin') {
    return { error: 'เฉพาะผู้ดูแลระบบสูงสุดเท่านั้นที่แต่งตั้งผู้ดูแลระบบสูงสุดได้' }
  }

  if (role === target.role) return { message: 'บทบาทไม่เปลี่ยนแปลง' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('organization_members')
    .update({ role })
    .eq('id', memberId)

  if (error) {
    console.error('[members] role change failed', error)
    return { error: 'เปลี่ยนบทบาทไม่สำเร็จ' }
  }

  await logActivity({
    organizationId: staff.organizationId,
    action: 'member.role_changed',
    entityType: 'organization_member',
    entityId: target.profileId,
    metadata: { email: target.email, from: target.role, to: role },
  })

  revalidatePath('/work/admin/settings')
  return { message: `เปลี่ยนบทบาทของ ${target.email} แล้ว` }
}

/**
 * Removes somebody from the team.
 *
 * DELETES THE MEMBERSHIP, NOT THE ACCOUNT. The person keeps their login and
 * their profile; they simply stop being staff of this organization. Deleting
 * the auth user would also destroy the `actor_id` on every audit entry they
 * ever wrote, which is exactly the history a revocation makes worth keeping.
 */
export async function removeMember(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await requireAdmin()
  if (!staff.can('member:manage')) {
    return { error: 'บัญชีของคุณไม่มีสิทธิ์จัดการสมาชิก' }
  }

  const parsed = removeMemberSchema.safeParse({ memberId: formData.get('memberId') })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' }
  }

  const target = await resolveTarget(parsed.data.memberId, staff)
  if ('error' in target) return target

  const supabase = await createClient()
  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('id', parsed.data.memberId)

  if (error) {
    console.error('[members] remove failed', error)
    return { error: 'นำสมาชิกออกไม่สำเร็จ' }
  }

  await logActivity({
    organizationId: staff.organizationId,
    action: 'member.removed',
    entityType: 'organization_member',
    entityId: target.profileId,
    metadata: { email: target.email, role: target.role },
  })

  revalidatePath('/work/admin/settings')
  return { message: `นำ ${target.email} ออกจากทีมแล้ว` }
}
