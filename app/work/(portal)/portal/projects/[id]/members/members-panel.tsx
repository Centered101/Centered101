'use client'

import { useActionState, useState } from 'react'

import { SubmitButton, useActionToast } from '@/components/work/forms'
import { Status } from '@/components/work/data/status'
import {
  PROJECT_COLLABORATION_ROLE_LABELS,
  PROJECT_INVITATION_STATUS_LABELS,
  PROJECT_ROLE_LABELS,
  formatDate,
  invitationStatusTone,
} from '@/lib/work/format'
import {
  changeMemberRole,
  inviteMember,
  removeMember,
  revokeInvitation,
  type InvitationActionState,
} from '@/lib/work/services/collaboration'
import type { ActionState } from '@/lib/work/services/projects'
import { PROJECT_COLLABORATION_ROLES } from '@/lib/work/types/enums'
import type {
  ProjectInvitationListItem,
  ProjectMemberListItem,
} from '@/lib/work/queries/collaboration'

const INVITABLE_ROLES = PROJECT_COLLABORATION_ROLES.filter((role) => role !== 'OWNER')

/**
 * Members + invitations for one project.
 *
 * `canManage` gates EVERYTHING below the member/invitation lists themselves
 * — the invite form, the role selects, the remove/revoke buttons. A MEMBER
 * or VIEWER (canManage = false) sees who is on the project and nothing they
 * could act on, matching the brief's "never expose management actions to
 * unauthorized users" — this is a UX courtesy on top of RLS, which would
 * refuse the underlying write regardless.
 */
export function MembersPanel({
  projectId,
  members,
  invitations,
  canManage,
  currentUserId,
}: {
  projectId: string
  members: ProjectMemberListItem[]
  invitations: ProjectInvitationListItem[]
  canManage: boolean
  currentUserId: string
}) {
  const [inviteState, inviteAction] = useActionState<InvitationActionState, FormData>(inviteMember, {})
  useActionToast(inviteState)
  const [copied, setCopied] = useState(false)

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ชื่อ</th>
              <th>อีเมล</th>
              <th>บทบาท</th>
              <th>เข้าร่วมเมื่อ</th>
              {canManage && <th />}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <MemberRow
                key={member.id}
                projectId={projectId}
                member={member}
                canManage={canManage}
                isSelf={member.profileId === currentUserId}
              />
            ))}
          </tbody>
        </table>
      </div>

      {canManage && (
        <>
          <PanelDivider title="เชิญสมาชิกใหม่" />
          <form action={inviteAction} className="work-form">
            <input type="hidden" name="projectId" value={projectId} />
            <label>
              <span>อีเมล</span>
              <input name="email" type="email" required placeholder="name@example.com" />
            </label>
            <label>
              <span>บทบาท</span>
              <select name="role" defaultValue="MEMBER">
                {INVITABLE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {PROJECT_COLLABORATION_ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-actions">
              <SubmitButton pendingLabel="กำลังส่ง...">ส่งคำเชิญ</SubmitButton>
            </div>
          </form>

          {inviteState.invitationUrl && (
            <p className="checkout-notice">
              คัดลอกลิงก์นี้และส่งให้ผู้ที่คุณเชิญ (จะไม่แสดงอีก):{' '}
              <code>{inviteState.invitationUrl}</code>{' '}
              <button
                type="button"
                className="text-btn"
                onClick={() => {
                  navigator.clipboard.writeText(inviteState.invitationUrl ?? '')
                  setCopied(true)
                }}
              >
                {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
              </button>
            </p>
          )}

          <PanelDivider title="คำเชิญที่ส่งไว้" />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>อีเมล</th>
                  <th>บทบาท</th>
                  <th>สถานะ</th>
                  <th>หมดอายุ</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {invitations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted empty-inline">
                      ยังไม่มีคำเชิญ
                    </td>
                  </tr>
                ) : (
                  invitations.map((invitation) => (
                    <InvitationRow key={invitation.id} projectId={projectId} invitation={invitation} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}

function PanelDivider({ title }: { title: string }) {
  return (
    <div style={{ marginTop: 20, marginBottom: 8 }}>
      <strong>{title}</strong>
    </div>
  )
}

function MemberRow({
  projectId,
  member,
  canManage,
  isSelf,
}: {
  projectId: string
  member: ProjectMemberListItem
  canManage: boolean
  isSelf: boolean
}) {
  const [roleState, roleAction] = useActionState<ActionState, FormData>(changeMemberRole, {})
  useActionToast(roleState)
  const [removeState, removeAction] = useActionState<ActionState, FormData>(removeMember, {})
  useActionToast(removeState)

  // Nobody manages the OWNER row from here — ownership transfer is a
  // separate, more deliberate action this phase does not implement (see
  // migration 0025b's own note), so the OWNER always renders as a label.
  const canActOnThisRow = canManage && member.role !== 'OWNER' && !isSelf

  return (
    <tr>
      <td>
        {member.name}
        {isSelf && <small className="muted"> (คุณ)</small>}
      </td>
      <td className="muted">{member.email}</td>
      <td>
        {canActOnThisRow ? (
          <form action={roleAction} className="row-inline">
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="memberId" value={member.id} />
            <select
              name="role"
              defaultValue={member.role}
              onChange={(event) => event.currentTarget.form?.requestSubmit()}
            >
              {PROJECT_COLLABORATION_ROLES.filter((role) => role !== 'OWNER').map((role) => (
                <option key={role} value={role}>
                  {PROJECT_COLLABORATION_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </form>
        ) : (
          <Status tone="blue">
            {PROJECT_ROLE_LABELS[member.role] ?? member.role}
          </Status>
        )}
      </td>
      <td className="muted">{formatDate(member.joinedAt)}</td>
      {canManage && (
        <td className="row-actions">
          {canActOnThisRow && (
            <form action={removeAction}>
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="memberId" value={member.id} />
              <button type="submit" className="text-btn danger">
                ลบ
              </button>
            </form>
          )}
        </td>
      )}
    </tr>
  )
}

function InvitationRow({
  projectId,
  invitation,
}: {
  projectId: string
  invitation: ProjectInvitationListItem
}) {
  const [state, action] = useActionState<ActionState, FormData>(revokeInvitation, {})
  useActionToast(state)

  return (
    <tr>
      <td>{invitation.email}</td>
      <td>{PROJECT_ROLE_LABELS[invitation.role] ?? invitation.role}</td>
      <td>
        <Status tone={invitationStatusTone(invitation.status)}>
          {PROJECT_INVITATION_STATUS_LABELS[invitation.status]}
        </Status>
      </td>
      <td className="muted">{formatDate(invitation.expiresAt)}</td>
      <td className="row-actions">
        {invitation.status === 'PENDING' && (
          <form action={action}>
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="invitationId" value={invitation.id} />
            <button type="submit" className="text-btn danger">
              ยกเลิก
            </button>
          </form>
        )}
      </td>
    </tr>
  )
}
