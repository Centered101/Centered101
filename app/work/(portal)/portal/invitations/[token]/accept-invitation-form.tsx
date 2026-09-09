'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'

import { SubmitButton, useActionToast } from '@/components/work/forms'
import { acceptProjectInvitation, type AcceptInvitationState } from '@/lib/work/services/collaboration'

export function AcceptInvitationForm({ token }: { token: string }) {
  const router = useRouter()
  const [state, action] = useActionState<AcceptInvitationState, FormData>(acceptProjectInvitation, {})
  useActionToast(state, () => {
    if (state.projectId) router.push(`/work/portal/projects/${state.projectId}`)
  })

  return (
    <form action={action} className="work-form">
      <input type="hidden" name="token" value={token} />
      {state.error && <p className="field-error">{state.error}</p>}
      <div className="form-actions">
        <SubmitButton pendingLabel="กำลังยอมรับ...">ยอมรับคำเชิญ</SubmitButton>
      </div>
    </form>
  )
}
