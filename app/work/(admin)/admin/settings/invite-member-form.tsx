'use client'

import { useActionState, useRef } from 'react'
import { UserPlus } from 'lucide-react'

import { SubmitButton, useActionToast } from '@/components/work/forms'
import { ORG_ROLE_LABELS } from '@/lib/work/format'
import { inviteMember } from '@/lib/work/services/members'
import type { ActionState } from '@/lib/work/services/projects'
import { INVITABLE_ROLES } from '@/lib/work/validation/members'
import type { OrgRole } from '@/lib/work/types/enums'

/**
 * Invite somebody onto the team.
 *
 * The organization is never sent: the action reads it from the caller's own
 * membership, so there is no hidden field here to point at another workspace.
 *
 * The form resets on success rather than staying filled, because the next
 * thing a person does after inviting one colleague is invite another — and a
 * form still holding the previous address invites a duplicate submission.
 */
export function InviteMemberForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction] = useActionState<ActionState, FormData>(inviteMember, {})
  useActionToast(state, () => formRef.current?.reset())

  return (
    <form ref={formRef} action={formAction} className="work-form invite-form">
      <label>
        <span>อีเมล</span>
        <input
          name="email"
          type="email"
          autoComplete="off"
          required
          placeholder="colleague@example.com"
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
        {state.fieldErrors?.email && (
          <small className="field-error">{state.fieldErrors.email}</small>
        )}
      </label>

      <label>
        <span>บทบาท</span>
        <select name="role" defaultValue="developer">
          {INVITABLE_ROLES.map((role) => (
            <option key={role} value={role}>
              {ORG_ROLE_LABELS[role as OrgRole]}
            </option>
          ))}
        </select>
      </label>

      <div className="form-actions">
        <SubmitButton pendingLabel="กำลังส่งคำเชิญ…">
          <UserPlus size={15} />
          ส่งคำเชิญ
        </SubmitButton>
      </div>
    </form>
  )
}
