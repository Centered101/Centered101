'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'

import { SubmitButton, useActionToast } from '@/components/work/forms'
import { useWorkHref } from '@/components/work/layout/work-link-context'
import { PROJECT_ROLE_LABELS, formatDate } from '@/lib/work/format'
import {
  acceptProjectInvitationById,
  type AcceptInvitationState,
} from '@/lib/work/services/collaboration'
import type { ProjectInvitationListItem } from '@/lib/work/queries/collaboration'

export function InvitationsInbox({ invitations }: { invitations: ProjectInvitationListItem[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>โปรเจกต์</th>
            <th>บทบาท</th>
            <th>เชิญโดย</th>
            <th>หมดอายุ</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {invitations.map((invitation) => (
            <InvitationRow key={invitation.id} invitation={invitation} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function InvitationRow({ invitation }: { invitation: ProjectInvitationListItem }) {
  const router = useRouter()
  const projectsHref = useWorkHref('/work/portal/projects')
  const [state, action] = useActionState<AcceptInvitationState, FormData>(
    acceptProjectInvitationById,
    {},
  )
  useActionToast(state, () => {
    if (state.projectId) router.push(`${projectsHref}/${state.projectId}`)
  })

  return (
    <tr>
      <td>{invitation.projectName}</td>
      <td>{PROJECT_ROLE_LABELS[invitation.role] ?? invitation.role}</td>
      <td className="muted">{invitation.invitedByName ?? '—'}</td>
      <td className="muted">{formatDate(invitation.expiresAt)}</td>
      <td className="row-actions">
        <form action={action}>
          <input type="hidden" name="invitationId" value={invitation.id} />
          <SubmitButton pendingLabel="กำลังตอบรับ...">ยอมรับ</SubmitButton>
        </form>
      </td>
    </tr>
  )
}
