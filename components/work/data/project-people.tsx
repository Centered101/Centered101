import { UserRound } from 'lucide-react'

import { Panel, PanelHead } from '@/components/work/data/panel'
import { Status } from '@/components/work/data/status'
import { formatDate } from '@/lib/work/format'
import type { ProjectDetail, ProjectMember } from '@/lib/work/queries/projects'

/**
 * Who is on a project, and who put it there.
 *
 * WHY THIS IS NOT THE `clients` RECORD. A `client` is a company the agency
 * bills; it grants nobody a login. Access comes from `project_members`, one
 * row per person per project. Listing the company name here would answer a
 * different question than the one being asked — "who can open this?" — and
 * would answer it wrongly the moment a client company has two contacts and
 * only one of them was given access.
 *
 * Safe in both portals: `project_members_select_project` lets anyone who can
 * read the project read its member list, so a client sees who else is on their
 * own project and nothing about anyone else's.
 */

const ROLE_LABELS: Record<ProjectMember['role'], string> = {
  client_owner: 'เจ้าของฝั่งลูกค้า',
  client_member: 'ทีมงานฝั่งลูกค้า',
  developer: 'นักพัฒนา',
}

export function ProjectPeople({
  project,
  members,
}: {
  project: ProjectDetail
  members: ProjectMember[]
}) {
  const createdBy = project.createdByName ?? project.createdByEmail

  return (
    <Panel className="projects-panel">
      <PanelHead
        title="ผู้ใช้ในโปรเจกต์"
        description="ผู้ที่เข้าถึงโปรเจกต์นี้ได้ และผู้ที่เปิดงานเข้าคิว"
        action={<UserRound className="panel-symbol" size={20} />}
      />

      <div className="ownership-rows">
        <div>
          <span>ผู้เปิดงานเข้าคิว</span>
          <strong>{createdBy ?? 'ไม่ทราบ'}</strong>
        </div>
        <div>
          <span>เปิดงานเมื่อ</span>
          <strong>{formatDate(project.createdAt)}</strong>
        </div>
        <div>
          <span>ลูกค้า</span>
          <strong>{project.clientName}</strong>
        </div>
      </div>

      {members.length === 0 ? (
        // Worth saying out loud on the admin side: a project with no members
        // is invisible in the client portal, which is easy to miss when the
        // client company record exists and looks complete.
        <p className="muted empty-inline">
          ยังไม่มีผู้ใช้ที่เข้าถึงโปรเจกต์นี้ได้ — ลูกค้าจะยังไม่เห็นโปรเจกต์นี้ในพอร์ทัล
        </p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ชื่อ</th>
                <th>อีเมล</th>
                <th>บทบาท</th>
                <th>เพิ่มเมื่อ</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>
                    <strong>{member.fullName ?? '—'}</strong>
                  </td>
                  <td className="muted">{member.email || '—'}</td>
                  <td>
                    <Status tone={member.role === 'developer' ? 'violet' : 'blue'}>
                      {ROLE_LABELS[member.role]}
                    </Status>
                  </td>
                  <td className="muted">{formatDate(member.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}
