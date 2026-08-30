'use client'

import { useActionState, useRef } from 'react'

import { PasswordInput } from './password-input'
import { SubmitButton, useActionToast } from './index'
import { changePassword } from '@/lib/work/services/password'
import type { ActionState } from '@/lib/work/services/projects'

/**
 * Change, or first set, the account password.
 *
 * Shared by the client portal's profile page and the admin settings page —
 * everyone has an account, so everyone needs this, and two copies would drift.
 *
 * `hasPassword` only decides what to RENDER. The server re-derives it from the
 * session, so a form posted without the current-password field does not skip
 * verification: `changePassword()` looks at `user.identities` and rejects it.
 *
 * The fields are cleared on success. Leaving a password sitting in a form
 * after it has been accepted is an easy thing to shoulder-surf and serves no
 * purpose once the action has returned.
 */
export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, formAction] = useActionState<ActionState, FormData>(changePassword, {})
  const formRef = useRef<HTMLFormElement>(null)

  useActionToast(state, () => formRef.current?.reset())

  return (
    <form ref={formRef} action={formAction} className="work-form">
      {hasPassword && (
        <label className="full">
          <span>รหัสผ่านปัจจุบัน</span>
          <PasswordInput
            name="currentPassword"
            required
            autoComplete="current-password"
          />
          {state.fieldErrors?.currentPassword && (
            <small className="field-error">{state.fieldErrors.currentPassword}</small>
          )}
        </label>
      )}

      <label>
        <span>รหัสผ่านใหม่</span>
        <PasswordInput
          name="newPassword"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="อย่างน้อย 8 ตัวอักษร"
        />
        {state.fieldErrors?.newPassword && (
          <small className="field-error">{state.fieldErrors.newPassword}</small>
        )}
      </label>

      <label>
        <span>ยืนยันรหัสผ่านใหม่</span>
        <PasswordInput
          name="confirmPassword"
          required
          minLength={8}
          autoComplete="new-password"
        />
        {state.fieldErrors?.confirmPassword && (
          <small className="field-error">{state.fieldErrors.confirmPassword}</small>
        )}
      </label>

      <div className="form-actions">
        <SubmitButton pendingLabel="กำลังบันทึก…">
          {hasPassword ? 'เปลี่ยนรหัสผ่าน' : 'ตั้งรหัสผ่าน'}
        </SubmitButton>
      </div>
    </form>
  )
}
