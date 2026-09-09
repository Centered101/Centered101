'use client'

import { useActionState, useState } from 'react'

import { SubmitButton, useActionToast } from '@/components/work/forms'
import { renameOrganization } from '@/lib/work/services/organization'
import type { ActionState } from '@/lib/work/services/projects'

/**
 * Inline rename for the workspace name.
 *
 * Rendered only for managers (`settings:manage`) — the page checks before
 * mounting this, and `renameOrganization` re-checks the same capability plus
 * the `organizations_update_managers` policy underneath, so the control is a
 * UX match for a guarantee that lives elsewhere.
 */
export function RenameWorkspaceForm({ currentName }: { currentName: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(renameOrganization, {})
  const [name, setName] = useState(currentName)
  useActionToast(state)

  return (
    <form action={formAction} className="workspace-name-form">
      <input
        name="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        aria-label="ชื่อพื้นที่ทำงาน"
        aria-invalid={Boolean(state.fieldErrors?.name)}
        maxLength={80}
        required
      />
      <SubmitButton variant="outline" pendingLabel="กำลังบันทึก…">
        บันทึก
      </SubmitButton>
      {state.fieldErrors?.name && (
        <small className="field-error">{state.fieldErrors.name}</small>
      )}
    </form>
  )
}
