'use client'

import { useActionState } from 'react'

import { SubmitButton, useActionToast } from '@/components/work/forms'
import { updateOwnProfile } from '@/lib/work/services/profile'
import type { ActionState } from '@/lib/work/services/projects'

/**
 * Edit your own display name.
 *
 * The user id is never sent: the action reads it from the session, so there is
 * no hidden field here to retarget at somebody else's row.
 */
export function ProfileForm({ fullName }: { fullName: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(updateOwnProfile, {})
  useActionToast(state)

  return (
    <form action={formAction} className="work-form">
      <label>
        <span>ชื่อ</span>
        <input name="fullName" required defaultValue={fullName} maxLength={120} />
        {state.fieldErrors?.fullName && (
          <small className="field-error">{state.fieldErrors.fullName}</small>
        )}
      </label>

      <div className="form-actions">
        <SubmitButton pendingLabel="กำลังบันทึก…">บันทึก</SubmitButton>
      </div>
    </form>
  )
}
