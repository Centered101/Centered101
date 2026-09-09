import Link from 'next/link'
import { Users } from 'lucide-react'

import { EmptyState } from '@/components/work/states'
import { ProgressBar } from '@/components/work/data/panel'
import { Status } from '@/components/work/data/status'
import {
  PROJECT_NEXT_ACTION_LABELS,
  PROJECT_STATUS_LABELS,
  formatMoney,
  paymentStatusTone,
  projectStatusTone,
} from '@/lib/work/format'
import type { OwnedProjectListItem } from '@/lib/work/queries/projects'

/**
 * "My Projects" card grid — the client portal's project list, shown as cards
 * (name / status / owner / member count / progress / payment status)
 * rather than the admin side's table (ProjectsTable), which has no concept
 * of a self-serve owner. See getMyProjectsWithCollaboration.
 */
export function MyProjectsGrid({
  projects,
  basePath = '/work/portal/projects',
}: {
  projects: OwnedProjectListItem[]
  basePath?: string
}) {
  if (projects.length === 0) {
    return (
      <EmptyState
        title="ยังไม่มีโปรเจกต์"
        description="สร้างโปรเจกต์แรกของคุณ หรือรอทีมงาน/เจ้าของโปรเจกต์เชิญคุณเข้าร่วม"
      />
    )
  }

  return (
    <div className="projects-grid">
      {projects.map((project) => {
        const paymentLabel =
          project.totalAmount > 0
            ? `${formatMoney(project.paidAmount, project.currency)} / ${formatMoney(project.totalAmount, project.currency)}`
            : 'ยังไม่มีราคา'
        const paymentTone =
          project.totalAmount > 0 && project.paidAmount >= project.totalAmount ? 'PAID' : 'PENDING'

        return (
          <div key={project.id} className="project-card">
            <h3>
              <Link href={`${basePath}/${project.id}`}>{project.name}</Link>
            </h3>
            <small className="muted">{project.projectCode}</small>

            <div className="project-card-meta">
              <span>เจ้าของ: {project.ownerName ?? project.clientName}</span>
              <span className="row-inline">
                <Users size={13} /> สมาชิก {project.memberCount} คน
              </span>
              {project.milestonesTotal > 0 && (
                <span>
                  ชำระแล้ว {project.milestonesPaid}/{project.milestonesTotal} งวด
                </span>
              )}
              <span>{paymentLabel}</span>
              {PROJECT_NEXT_ACTION_LABELS[project.status] && (
                <span className="next-action">
                  ขั้นตอนถัดไป: {PROJECT_NEXT_ACTION_LABELS[project.status]}
                </span>
              )}
            </div>

            <ProgressBar value={project.progress} />

            <div className="project-card-foot">
              <Status tone={projectStatusTone(project.status)}>
                {PROJECT_STATUS_LABELS[project.status]}
              </Status>
              <Status tone={paymentStatusTone(paymentTone)}>
                {paymentTone === 'PAID' ? 'ชำระครบ' : 'รอชำระ'}
              </Status>
            </div>
          </div>
        )
      })}
    </div>
  )
}
