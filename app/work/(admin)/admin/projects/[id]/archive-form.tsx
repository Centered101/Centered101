'use client'

import { useActionState } from 'react'

import { SubmitButton, useActionToast } from '@/components/work/forms'
import { archiveProject, unarchiveProject, type ActionState } from '@/lib/work/services/projects'

/**
 * Archive / unarchive toggle.
 *
 * Only rendered for org managers (the page checks `staff.role` before
 * mounting this) — the server actions enforce the same restriction
 * independently via `requireRole('super_admin', 'admin')`, so a manager-only
 * control here is a UX match for a manager-only guarantee underneath, not the
 * guarantee itself.
 */
export function ArchiveForm({ projectId, archived }: { projectId: string; archived: boolean }) {
  const action = archived ? unarchiveProject : archiveProject
  const [state, formAction] = useActionState<ActionState, FormData>(action, {})
  useActionToast(state)

  return (
    <form action={formAction}>
      <input type="hidden" name="projectId" value={projectId} />
      <SubmitButton variant="outline" pendingLabel={archived ? 'กำลังกู้คืน...' : 'กำลังจัดเก็บ...'}>
        {archived ? 'กู้คืนจากที่จัดเก็บ' : 'จัดเก็บโปรเจกต์'}
      </SubmitButton>
    </form>
  )
}
