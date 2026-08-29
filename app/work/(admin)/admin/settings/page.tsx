import { Avatar } from '@/components/work/data/avatar'
import { Panel, PageHeading, PanelHead } from '@/components/work/data/panel'
import { Status } from '@/components/work/data/status'
import { AccountSecurity } from '@/components/work/account/account-security'
import { InviteMemberForm } from './invite-member-form'
import { MemberRemoveButton, MemberRoleSelect } from './member-row-actions'
import { requireAdmin } from '@/lib/work/auth/permissions'
import { ORG_ROLE_LABELS, formatDate, initialFor } from '@/lib/work/format'
import { getOrganizationMembers } from '@/lib/work/queries/organization'

export const metadata = { title: 'ตั้งค่า' }

/**
 * Workspace settings.
 *
 * Read-only in this phase. Roles are shown, not edited: changing a role is a
 * manager-only write (`organization_members_update_managers`), and the form to
 * do it belongs with the member-invitation flow rather than being half-built
 * here.
 */
export default async function AdminSettingsPage() {
  const staff = await requireAdmin()
  const canManage = staff.can('member:manage')
  const members = await getOrganizationMembers()

  return (
    <>
      <PageHeading
        title="ตั้งค่า"
        description="ข้อมูลพื้นที่ทำงานและสมาชิกในทีม"
      />

      <Panel className="ownership">
        <PanelHead title="พื้นที่ทำงาน" description="ข้อมูลองค์กรของคุณ" />
        <div className="ownership-rows">
          <div>
            <span>ชื่อพื้นที่ทำงาน</span>
            <strong>{staff.organizationName}</strong>
          </div>
          <div>
            <span>บทบาทของคุณ</span>
            <strong>{ORG_ROLE_LABELS[staff.role]}</strong>
          </div>
          <div>
            <span>อีเมล</span>
            <strong>{staff.email}</strong>
          </div>
        </div>
      </Panel>


      <AccountSecurity returnTo="/work/admin/settings" />

      <Panel className="projects-panel">
        <PanelHead title="สมาชิกทีม" description={`ทั้งหมด ${members.length} คน`} />
        {/* Only managers may write organization_members — the policy refuses
            anyone else, so offering the form to them would be a dead end. */}
        {canManage && <InviteMemberForm />}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ชื่อ</th>
                <th>อีเมล</th>
                <th>บทบาท</th>
                <th>เข้าร่วมเมื่อ</th>
                {canManage && <th aria-label="จัดการ" />}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>
                    <div className="member-cell">
                      <Avatar
                        src={member.avatarUrl}
                        initial={initialFor(member.fullName, member.email)}
                        name={member.fullName ?? member.email}
                        className="avatar member-avatar"
                        size={26}
                      />
                      <strong>{member.fullName ?? '—'}</strong>
                    </div>
                  </td>
                  <td className="muted">{member.email}</td>
                  <td>
                    {/* Your own row stays a label: the action refuses to act
                        on it, so a control that could only fail is worse than
                        no control. */}
                    {canManage && member.profileId !== staff.userId ? (
                      <MemberRoleSelect memberId={member.id} role={member.role} />
                    ) : (
                      <Status tone={member.role === 'accountant' ? 'violet' : 'blue'}>
                        {ORG_ROLE_LABELS[member.role]}
                      </Status>
                    )}
                  </td>
                  <td className="muted">{formatDate(member.createdAt)}</td>
                  {canManage && (
                    <td className="row-actions">
                      {member.profileId !== staff.userId && (
                        <MemberRemoveButton
                          memberId={member.id}
                          name={member.fullName ?? member.email}
                        />
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  )
}
