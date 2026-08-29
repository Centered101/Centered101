import Link from 'next/link'
import { Code2 } from 'lucide-react'

import {
  PROJECT_STATUS_LABELS,
  formatDate,
  formatMoney,
  idTone,
  projectStatusTone,
} from '@/lib/work/format'
import type { ProjectListItem } from '@/lib/work/queries/projects'
import { EmptyState } from '@/components/work/states'
import { ProgressBar } from './panel'
import { Status } from './status'

/**
 * Projects table.
 *
 * Rows are keyed and linked by the project UUID. `project_code` is shown under
 * the name because humans quote it, but it never appears in a URL — guessing
 * PRJ-2026-002 must get you nothing (docs/ARCHITECTURE.md §5).
 *
 * `projects` is required, with no default. The prototype defaulted to mock
 * data, which meant a page that forgot to pass real data silently rendered
 * fiction. An empty array now renders an empty state, which is the truth.
 */
export function ProjectsTable({
  projects,
  basePath = '/work/admin/projects',
  emptyDescription = 'เมื่อสร้างโปรเจกต์แล้ว รายการจะแสดงที่นี่',
}: {
  projects: ProjectListItem[]
  basePath?: string
  emptyDescription?: string
}) {
  if (projects.length === 0) {
    return <EmptyState title="ยังไม่มีโปรเจกต์" description={emptyDescription} />
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>โปรเจกต์</th>
            <th>ลูกค้า</th>
            <th>สถานะ</th>
            <th>ความคืบหน้า</th>
            <th>มูลค่า</th>
            <th>การชำระเงิน</th>
            <th>อัปเดตล่าสุด</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id}>
              <td>
                <div className="project-name">
                  <div className={`project-icon ${idTone(project.id)}`}>
                    <Code2 size={16} />
                  </div>
                  <span>
                    <strong>
                      <Link href={`${basePath}/${project.id}`}>{project.name}</Link>
                    </strong>
                    <small>{project.projectCode}</small>
                  </span>
                </div>
              </td>
              <td>{project.clientName}</td>
              <td>
                <Status tone={projectStatusTone(project.status)}>
                  {PROJECT_STATUS_LABELS[project.status]}
                </Status>
              </td>
              <td>
                <ProgressBar value={project.progress} />
              </td>
              <td>
                <strong>{formatMoney(project.totalAmount, project.currency)}</strong>
              </td>
              <td>
                <span className="payment-paid">
                  {formatMoney(project.paidAmount, project.currency)}
                </span>{' '}
                ชำระแล้ว
              </td>
              <td className="muted">{formatDate(project.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
