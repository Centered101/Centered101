import { Panel, PageHeading, PanelHead } from '@/components/work/data/panel'
import { Status } from '@/components/work/data/status'
import { PasswordForm } from '@/components/work/forms/password-form'
import { requireAdmin } from '@/lib/work/auth/permissions'
import { hasPasswordIdentity, requireUser } from '@/lib/work/auth/session'
import { ORG_ROLE_LABELS, formatDate } from '@/lib/work/format'
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
  const [user, members] = await Promise.all([requireUser(), getOrganizationMembers()])
  const hasPassword = hasPasswordIdentity(user)

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


      <Panel>
        <PanelHead
          title={hasPassword ? 'เปลี่ยนรหัสผ่าน' : 'ตั้งรหัสผ่าน'}
          description={
            hasPassword
              ? 'ต้องกรอกรหัสผ่านปัจจุบันเพื่อยืนยันตัวตน'
              : 'บัญชีนี้เข้าสู่ระบบด้วย Google — ตั้งรหัสผ่านไว้เพื่อเข้าสู่ระบบด้วยอีเมลได้อีกทาง'
          }
        />
        <PasswordForm hasPassword={hasPassword} />
      </Panel>

      <Panel className="projects-panel">
        <PanelHead title="สมาชิกทีม" description={`ทั้งหมด ${members.length} คน`} />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ชื่อ</th>
                <th>อีเมล</th>
                <th>บทบาท</th>
                <th>เข้าร่วมเมื่อ</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>
                    <strong>{member.fullName ?? '—'}</strong>
                  </td>
                  <td className="muted">{member.email}</td>
                  <td>
                    <Status tone={member.role === 'accountant' ? 'violet' : 'blue'}>
                      {ORG_ROLE_LABELS[member.role]}
                    </Status>
                  </td>
                  <td className="muted">{formatDate(member.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  )
}
