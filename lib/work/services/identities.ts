'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { getCallbackUrl } from '@/lib/work/auth/callback-url'
import { requireUser } from '@/lib/work/auth/session'
import { createClient } from '@/lib/work/supabase/server'
import { isNetworkError } from '@/lib/work/supabase/errors'
import { safeRedirectPath } from '@/lib/work/validation/auth'
import type { ActionState } from './projects'

/**
 * Connecting and disconnecting a Google account.
 *
 * This is IDENTITY LINKING, not sign-in. `signInWithOAuth()` in actions.ts
 * authenticates someone who is signed out; `linkIdentity()` attaches a second
 * sign-in method to the account already in the session. They share the same
 * callback route, because both come back holding a code to exchange.
 *
 * REQUIRES "Manual linking" to be enabled on the Supabase project
 * (Authentication → Providers → Advanced). It is off by default, and the
 * failure it produces is opaque — so the error below names the setting.
 */

/** Where to return after the provider round trip. */
function returnPath(formData: FormData): string {
  return safeRedirectPath(formData.get('next') as string | null, '/work/portal/profile')
}

/**
 * Could not reach the auth server at all.
 *
 * Without this check a dropped connection was reported as "Manual linking is
 * off", sending people to a dashboard setting that was never the problem. See
 * `isNetworkError` for why this matters in a Server Action specifically.
 */
const NETWORK_MESSAGE = 'ติดต่อเซิร์ฟเวอร์ยืนยันตัวตนไม่ได้ ตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง'

export async function linkGoogle(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser()

  const supabase = await createClient()

  let url: string | null = null

  // redirect() throws NEXT_REDIRECT to do its job, so it stays outside the try
  // — catching it here would swallow the navigation and report it as a failure.
  try {
    const { data, error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo: await getCallbackUrl(returnPath(formData)) },
    })

    if (error) {
      console.error('[identities] link failed', error)
      return {
        error: isNetworkError(error)
          ? NETWORK_MESSAGE
          : 'เชื่อมบัญชี Google ไม่สำเร็จ — ตรวจสอบว่าเปิด Manual linking ไว้ที่ Supabase Dashboard → Authentication → Providers',
      }
    }

    url = data?.url ?? null
  } catch (thrown) {
    console.error('[identities] link threw', thrown)
    return { error: isNetworkError(thrown) ? NETWORK_MESSAGE : 'เชื่อมบัญชี Google ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }
  }

  if (!url) {
    return { error: 'เชื่อมบัญชี Google ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }
  }

  redirect(url)
}

export async function unlinkGoogle(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser()

  const supabase = await createClient()

  // Read the identities fresh rather than trusting anything the form sent:
  // unlinking is destructive, and the decision below depends on how many
  // sign-in methods actually remain.
  const { data, error: listError } = await supabase.auth.getUserIdentities()

  if (listError) {
    console.error('[identities] list failed', listError)
    return {
      error: isNetworkError(listError)
        ? NETWORK_MESSAGE
        : 'ไม่สามารถอ่านข้อมูลการเชื่อมต่อได้ กรุณาลองใหม่อีกครั้ง',
    }
  }

  const identities = data?.identities ?? []
  const google = identities.find((identity) => identity.provider === 'google')

  if (!google) {
    return { error: 'บัญชีนี้ยังไม่ได้เชื่อมกับ Google' }
  }

  // THE GUARD THAT MATTERS. Removing the only way into an account locks its
  // owner out permanently — there is no "forgot password" for an account with
  // no password. Supabase refuses this too, but its message does not explain
  // what to do about it.
  if (identities.length < 2) {
    return {
      error:
        'นี่เป็นวิธีเข้าสู่ระบบเดียวของบัญชีนี้ — ตั้งรหัสผ่านก่อน แล้วจึงยกเลิกการเชื่อม Google ได้',
    }
  }

  const { error } = await supabase.auth.unlinkIdentity(google)

  if (error) {
    console.error('[identities] unlink failed', error)
    return {
      error: isNetworkError(error) ? NETWORK_MESSAGE : 'ยกเลิกการเชื่อมไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
    }
  }

  // 'layout': the sidebar renders the display name and avatar, which came from
  // the Google profile and may now be stale.
  revalidatePath(returnPath(formData), 'layout')

  return { message: 'ยกเลิกการเชื่อมบัญชี Google แล้ว' }
}
