'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'

import { SubmitButton, useActionToast } from '@/components/work/forms'
import { completePasswordReset } from '@/lib/work/services/password'
import type { ActionState } from '@/lib/work/services/projects'

/**
 * Sets a new password from a recovery link.
 *
 * No current-password field: not knowing it is why anyone is on this page.
 * What stands in for it is the recovery session itself, which the action
 * verifies from the JWT before writing anything — see `isRecoverySession()`.
 */
export function ResetPasswordForm({ landingPath }: { landingPath: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    completePasswordReset,
    {},
  )
  const router = useRouter()

  // Sent onward on success rather than left on a form with nothing more to do.
  useActionToast(state, () => router.replace(landingPath))

  return (
    <form action={formAction} className="auth-form">
      <label className="field-label" htmlFor="newPassword">
        รหัสผ่านใหม่
      </label>
      <input
        id="newPassword"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        placeholder="อย่างน้อย 8 ตัวอักษร"
        aria-invalid={Boolean(state.fieldErrors?.newPassword)}
      />
      {state.fieldErrors?.newPassword && (
        <p className="field-error">{state.fieldErrors.newPassword}</p>
      )}

      <label className="field-label" htmlFor="confirmPassword">
        ยืนยันรหัสผ่านใหม่
      </label>
      <input
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
      />
      {state.fieldErrors?.confirmPassword && (
        <p className="field-error">{state.fieldErrors.confirmPassword}</p>
      )}

      <div className="form-actions">
        <SubmitButton pendingLabel="กำลังบันทึก…">ตั้งรหัสผ่านใหม่</SubmitButton>
      </div>

      {state.error && <p className="auth-error">{state.error}</p>}
    </form>
  )
}
