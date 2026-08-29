'use client'

import { useActionState } from 'react'

import { SubmitButton, useActionToast } from '@/components/work/forms'
import { linkGoogle, unlinkGoogle } from '@/lib/work/services/identities'
import type { ActionState } from '@/lib/work/services/projects'

/**
 * Connect or disconnect Google for the signed-in account.
 *
 * `linked` decides which action the form posts to. Both actions re-read the
 * real identity list from the session before doing anything, so a form posted
 * against the wrong one is refused rather than obeyed — this prop chooses the
 * button, not the outcome.
 *
 * `returnTo` exists because the panel appears on two different pages and the
 * provider round trip has to come back to the one the user left.
 */
export function GoogleConnectionForm({
  linked,
  returnTo,
}: {
  linked: boolean
  returnTo: string
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    linked ? unlinkGoogle : linkGoogle,
    {},
  )
  useActionToast(state)

  return (
    <form action={formAction} className="connection-form">
      <input type="hidden" name="next" value={returnTo} />
      <SubmitButton
        variant="outline"
        pendingLabel={linked ? 'กำลังยกเลิก…' : 'กำลังเชื่อมต่อ…'}
      >
        {linked ? 'ยกเลิกการเชื่อม' : 'เชื่อมบัญชี Google'}
      </SubmitButton>
    </form>
  )
}
