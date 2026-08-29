'use server'

import { hasPasswordIdentity, requireUser } from '@/lib/work/auth/session'
import { createClient } from '@/lib/work/supabase/server'
import { changePasswordSchema, setPasswordSchema } from '@/lib/work/validation/auth'
import type { ActionState } from './projects'

/**
 * Change (or set) the account password.
 *
 * WHY THE CURRENT PASSWORD IS RE-VERIFIED: `supabase.auth.updateUser()` accepts
 * a new password on the strength of the session alone. That means a borrowed
 * session — a shared laptop, a stolen cookie — could be used to change the
 * password and lock the real owner out of their own account. Asking for the
 * current password turns "has the session" into "knows the secret", which is
 * the whole point of the control.
 *
 * WHETHER A PASSWORD EXISTS IS READ FROM THE SESSION, never from the form. An
 * account created through Google has no password identity yet; it may set one
 * without proving a previous password, because there is no previous password
 * to prove. A client that lied about this to skip verification would be caught
 * here, because the check below re-derives the answer from `user.identities`.
 */
export async function changePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser()
  const hasPassword = hasPasswordIdentity(user)

  const raw = {
    currentPassword: String(formData.get('currentPassword') ?? ''),
    newPassword: String(formData.get('newPassword') ?? ''),
    confirmPassword: String(formData.get('confirmPassword') ?? ''),
  }

  const parsed = hasPassword
    ? changePasswordSchema.safeParse(raw)
    : setPasswordSchema.safeParse({
        newPassword: raw.newPassword,
        confirmPassword: raw.confirmPassword,
      })

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '')
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return { fieldErrors }
  }

  const supabase = await createClient()

  if (hasPassword) {
    if (!user.email) {
      return { error: 'บัญชีนี้ไม่มีอีเมลที่ยืนยันแล้ว จึงเปลี่ยนรหัสผ่านจากหน้านี้ไม่ได้' }
    }

    // Re-authenticating rotates this user's own session cookies, which is
    // harmless — it is the same person, still signed in.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: raw.currentPassword,
    })

    if (verifyError) {
      // Deliberately not distinguishing "wrong password" from any other
      // sign-in failure here: the field it belongs to is enough.
      return { fieldErrors: { currentPassword: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' } }
    }
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword })

  if (error) {
    console.error('[password] update failed', error)
    // Supabase rejects a new password identical to the old one. That is a
    // fixable, user-facing mistake, so it gets its own message on its own
    // field rather than a generic failure.
    if (/different from the old password/i.test(error.message)) {
      return { fieldErrors: { newPassword: 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม' } }
    }
    if (/weak|at least|length/i.test(error.message)) {
      return { fieldErrors: { newPassword: 'รหัสผ่านไม่ปลอดภัยพอ กรุณาใช้รหัสผ่านที่คาดเดายากขึ้น' } }
    }
    return { error: 'เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }
  }

  return {
    message: hasPassword ? 'เปลี่ยนรหัสผ่านแล้ว' : 'ตั้งรหัสผ่านแล้ว',
  }
}
