'use server'

import { revalidatePath } from 'next/cache'

import { requireUser } from '@/lib/work/auth/session'
import { createClient } from '@/lib/work/supabase/server'
import { updateProfileSchema } from '@/lib/work/validation/auth'
import type { ActionState } from './projects'

/**
 * The one thing a user may change about themselves.
 *
 * Roles live in organization_members and project_members, which nobody has a
 * write policy on from the app — so there is no field here that could widen
 * access. Email is deliberately absent too: it is the login identity, owned by
 * the auth server, and changing it needs a confirmation round trip rather than
 * a text input.
 *
 * The name is written TWICE, on purpose. `profiles.full_name` is what pages
 * read, but the sidebar and the avatar chip come from
 * `user_metadata.full_name` via `displayNameFor()`. Writing only the profile
 * row leaves the chrome showing the old name until the next sign-in.
 */
export async function updateOwnProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser()

  const parsed = updateProfileSchema.safeParse({ fullName: formData.get('fullName') })
  if (!parsed.success) {
    return { fieldErrors: { fullName: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' } }
  }

  const { fullName } = parsed.data
  const supabase = await createClient()

  // RLS (profiles_update_self) re-checks the row independently of requireUser:
  // the `.eq()` produces the good error message, the policy is the guarantee.
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', user.id)

  if (error) {
    console.error('[profile] update failed', error)
    return { error: 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }
  }

  const { error: metadataError } = await supabase.auth.updateUser({
    data: { full_name: fullName },
  })
  if (metadataError) {
    // The profile row is already committed, so this is not a failed save — the
    // chrome is merely one sign-in behind. Say so rather than claim an error.
    console.error('[profile] auth metadata out of step', metadataError)
  }

  // 'layout' rather than the page: the display name is rendered by the portal
  // shell, above this route.
  revalidatePath('/work/portal', 'layout')

  return { message: 'บันทึกข้อมูลแล้ว' }
}
