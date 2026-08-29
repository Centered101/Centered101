'use client'

import { useActionState, useState } from 'react'
import { Trash2 } from 'lucide-react'

import { useActionToast } from '@/components/work/forms'
import { ORG_ROLE_LABELS } from '@/lib/work/format'
import { changeMemberRole, removeMember } from '@/lib/work/services/members'
import type { ActionState } from '@/lib/work/services/projects'
import { ORG_ROLES, type OrgRole } from '@/lib/work/types/enums'

/**
 * The role selector for one member.
 *
 * Submits on change rather than behind a save button: a single select with its
 * own button is two clicks for one decision, and the row already shows the
 * result. `super_admin` stays in the list even for an `admin` who may not
 * grant it — the action refuses and says why, which teaches the rule; hiding
 * the option would leave them wondering where it went.
 */
export function MemberRoleSelect({ memberId, role }: { memberId: string; role: OrgRole }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    changeMemberRole,
    {},
  )
  useActionToast(state)

  return (
    <form action={formAction} className="member-role-form">
      <input type="hidden" name="memberId" value={memberId} />
      <select
        name="role"
        defaultValue={role}
        disabled={pending}
        aria-label="บทบาท"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {ORG_ROLES.map((option) => (
          <option key={option} value={option}>
            {ORG_ROLE_LABELS[option]}
          </option>
        ))}
      </select>
    </form>
  )
}

/**
 * Remove one member from the team.
 *
 * The confirmation is a second click on the same button rather than a
 * `window.confirm()` dialog: the dialog is dismissed by muscle memory and
 * looks nothing like the rest of the app. Arming resets itself, so a row left
 * armed by accident does not stay one stray click from deleting.
 */
export function MemberRemoveButton({ memberId, name }: { memberId: string; name: string }) {
  const [armed, setArmed] = useState(false)
  const [state, formAction, pending] = useActionState<ActionState, FormData>(removeMember, {})
  useActionToast(state, () => setArmed(false))

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!armed) {
          event.preventDefault()
          setArmed(true)
          window.setTimeout(() => setArmed(false), 4000)
        }
      }}
    >
      <input type="hidden" name="memberId" value={memberId} />
      <button
        type="submit"
        className={`row-action${armed ? ' armed' : ''}`}
        disabled={pending}
        aria-label={`นำ ${name} ออกจากทีม`}
      >
        <Trash2 size={14} />
        {pending ? 'กำลังนำออก…' : armed ? 'ยืนยัน' : 'นำออก'}
      </button>
    </form>
  )
}
