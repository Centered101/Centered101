import { Panel, PageHeading, PanelHead } from '@/components/work/data/panel'
import { Status } from '@/components/work/data/status'
import { AccountSecurity } from '@/components/work/account/account-security'
import { requireClient } from '@/lib/work/auth/permissions'
import { formatDate } from '@/lib/work/format'
import { getOwnProfile } from '@/lib/work/queries/organization'
import { getClientProjects } from '@/lib/work/queries/projects'
import { ProfileForm } from './profile-form'

export const metadata = { title: 'โปรไฟล์' }

/**
 * The client's own profile.
 *
 * `profiles` carries no role column, by design: roles live in
 * organization_members and project_members, which a client has no write policy
 * on. There is therefore nothing on this page a client could edit to gain
 * access — the worst they can do to their own row is change their name, which
 * is exactly what the form below offers.
 */
export default async function PortalProfilePage() {
  const client = await requireClient()
  const [profile, projects] = await Promise.all([getOwnProfile(), getClientProjects()])

  return (
    <>
      <PageHeading title="โปรไฟล์" description="ข้อมูลบัญชีและสิทธิ์เข้าถึงของคุณ" />

      <Panel className="ownership">
        <PanelHead
          title="บัญชีของคุณ"
          description="แก้ไขชื่อที่แสดงได้ที่นี่ — อีเมลผูกกับบัญชีเข้าสู่ระบบ จึงเปลี่ยนจากหน้านี้ไม่ได้"
        />
        <ProfileForm fullName={profile?.fullName ?? ''} />
        <div className="ownership-rows">
          <div>
            <span>อีเมล</span>
            <strong>{profile?.email ?? client.email}</strong>
          </div>
          <div>
            <span>เข้าร่วมเมื่อ</span>
            <strong>{formatDate(profile?.createdAt ?? null)}</strong>
          </div>
        </div>
      </Panel>


      <AccountSecurity returnTo="/work/portal/profile" />

      <Panel className="projects-panel">
        <PanelHead
          title="สิทธิ์เข้าถึงโปรเจกต์"
          description={`คุณเข้าถึงได้ ${projects.length} โปรเจกต์`}
        />
        {projects.length === 0 ? (
          <p className="muted empty-inline">ยังไม่ได้รับสิทธิ์เข้าถึงโปรเจกต์ใด</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>โปรเจกต์</th>
                  <th>รหัส</th>
                  <th>ลูกค้า</th>
                  <th>ความคืบหน้า</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <strong>{project.name}</strong>
                    </td>
                    <td className="muted">{project.projectCode}</td>
                    <td>{project.clientName}</td>
                    <td>
                      <Status tone="blue">{project.progress}%</Status>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  )
}
