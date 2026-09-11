import { WorkLink } from '@/components/work/layout/work-link'

import { Panel, PageHeading } from '@/components/work/data/panel'
import { EmptyState } from '@/components/work/states'
import { Status } from '@/components/work/data/status'
import { requireAdmin } from '@/lib/work/auth/permissions'
import {
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
  formatDate,
  formatMoney,
  projectStatusTone,
} from '@/lib/work/format'
import { getAdminProjectInbox } from '@/lib/work/queries/projects'
import { InboxFilter } from './inbox-filter'

export const metadata = { title: 'คำขอโปรเจกต์' }

const FILTERS = [
  { key: 'all', label: 'ทั้งหมด', statuses: ['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_INFORMATION'] as const },
  { key: 'new', label: 'ใหม่', statuses: ['SUBMITTED'] as const },
  { key: 'reviewing', label: 'กำลังตรวจสอบ', statuses: ['UNDER_REVIEW'] as const },
  { key: 'needs_info', label: 'รอข้อมูลเพิ่มเติม', statuses: ['NEEDS_INFORMATION'] as const },
] as const

/**
 * Admin Project Inbox (docs/ADMIN_PROJECT_LIFECYCLE.md §2).
 *
 * Every client-submitted project awaiting a decision — SUBMITTED,
 * UNDER_REVIEW, or NEEDS_INFORMATION. A project never appears here on its
 * own: `submitProject()` is the only writer of SUBMITTED, so a project sits
 * in DRAFT, invisible to admin, until its owner explicitly asks for review —
 * exactly the brief's "must NOT automatically treat a submitted project as
 * an approved project" (§2), one step earlier: it isn't even reviewed until
 * asked.
 */
export default async function AdminInboxPage(props: { searchParams: Promise<{ filter?: string }> }) {
  await requireAdmin()
  const { filter } = await props.searchParams

  const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0]
  const projects = await getAdminProjectInbox(active.statuses)

  return (
    <>
      <PageHeading
        title="คำขอโปรเจกต์"
        description={`คำขอที่รอการตรวจสอบ ${projects.length} รายการ`}
      />

      <InboxFilter active={active.key} filters={FILTERS} />

      {projects.length === 0 ? (
        <EmptyState title="ไม่มีคำขอในหมวดนี้" description="เมื่อลูกค้าส่งคำขอโปรเจกต์ จะแสดงที่นี่" />
      ) : (
        <div className="projects-grid">
          {projects.map((project) => (
            <Panel key={project.id} className="project-card">
              <h3>
                <WorkLink href={`/work/admin/projects/${project.id}/review`}>{project.name}</WorkLink>
              </h3>
              <small className="muted">{project.projectCode}</small>

              <div className="project-card-meta">
                <span>ลูกค้า: {project.clientName}</span>
                <span>ประเภท: {PROJECT_TYPE_LABELS[project.type] ?? project.type}</span>
                <span>ส่งคำขอเมื่อ: {formatDate(project.submittedAt)}</span>
                <span>งบประมาณโดยประมาณ: {project.totalAmount > 0 ? formatMoney(project.totalAmount, project.currency) : 'ยังไม่ระบุ'}</span>
                <span>สมาชิก {project.memberCount} คน</span>
              </div>

              <div className="project-card-foot">
                <Status tone={projectStatusTone(project.status)}>
                  {PROJECT_STATUS_LABELS[project.status]}
                </Status>
                <WorkLink href={`/work/admin/projects/${project.id}/review`} className="text-btn">
                  ตรวจสอบโปรเจกต์
                </WorkLink>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </>
  )
}
