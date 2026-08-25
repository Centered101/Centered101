import Link from 'next/link'
import { Code2 } from 'lucide-react'

import { mockProjects, type MockProject } from '@/lib/work/mock/data'
import { ProgressBar } from './panel'
import { Status, statusTone } from './status'

/**
 * Recent projects table.
 *
 * Project names now link to the detail route. The prototype rendered them as
 * plain text because there was nowhere to go.
 *
 * NOTE: rows are keyed and linked by `project_code` because that is all the
 * mock data has. From Phase 2 the URL segment becomes the project UUID —
 * `project_code` is display-only and must never address a resource
 * (docs/ARCHITECTURE.md §5).
 */
export function ProjectsTable({ projects = mockProjects }: { projects?: MockProject[] }) {
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
          {projects.map((p) => (
            <tr key={p.id}>
              <td>
                <div className="project-name">
                  <div className={`project-icon ${p.tone}`}>
                    <Code2 size={16} />
                  </div>
                  <span>
                    <strong>
                      <Link href={`/work/admin/projects/${p.id}`}>{p.name}</Link>
                    </strong>
                    <small>{p.id}</small>
                  </span>
                </div>
              </td>
              <td>{p.client}</td>
              <td>
                <Status tone={statusTone(p.status)}>{p.status}</Status>
              </td>
              <td>
                <ProgressBar value={p.progress} />
              </td>
              <td>
                <strong>{p.amount}</strong>
              </td>
              <td>
                <span className="payment-paid">{p.paid}</span> ชำระแล้ว
              </td>
              <td className="muted">วันนี้ 10:42</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
