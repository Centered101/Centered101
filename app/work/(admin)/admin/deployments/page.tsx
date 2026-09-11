import { WorkLink } from '@/components/work/layout/work-link'
import { ExternalLink } from 'lucide-react'

import { Panel, PageHeading } from '@/components/work/data/panel'
import { Status } from '@/components/work/data/status'
import { EmptyState } from '@/components/work/states'
import { requireCapability } from '@/lib/work/auth/permissions'
import {
  DEPLOYMENT_ENVIRONMENT_LABELS,
  DEPLOYMENT_STATUS_LABELS,
  deploymentStatusTone,
  formatDateTime,
} from '@/lib/work/format'
import { getDeployments } from '@/lib/work/queries/deployments'

export const metadata = { title: 'การเผยแพร่' }

/**
 * Deployment history.
 *
 * Records entered by staff, not readings from a hosting provider — no Vercel
 * API is called anywhere in this phase. Add a deployment from a project's
 * detail page.
 */
export default async function AdminDeploymentsPage() {
  await requireCapability('project:read')
  const deployments = await getDeployments()

  return (
    <>
      <PageHeading title="การเผยแพร่" description="ประวัติการเผยแพร่ของทุกโปรเจกต์" />

      <Panel className="projects-panel">
        {deployments.length === 0 ? (
          <EmptyState
            title="ยังไม่มีการเผยแพร่"
            description="บันทึกลิงก์ตัวอย่างหรือเวอร์ชันที่เผยแพร่ได้จากหน้ารายละเอียดโปรเจกต์"
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>โปรเจกต์</th>
                  <th>สภาพแวดล้อม</th>
                  <th>เวอร์ชัน</th>
                  <th>สถานะ</th>
                  <th>ลิงก์</th>
                  <th>Commit</th>
                  <th>เผยแพร่เมื่อ</th>
                </tr>
              </thead>
              <tbody>
                {deployments.map((deployment) => (
                  <tr key={deployment.id}>
                    <td>
                      <strong>
                        <WorkLink href={`/work/admin/projects/${deployment.projectId}`}>
                          {deployment.projectName ?? '—'}
                        </WorkLink>
                      </strong>
                    </td>
                    <td>{DEPLOYMENT_ENVIRONMENT_LABELS[deployment.environment]}</td>
                    <td className="muted">{deployment.version ?? '—'}</td>
                    <td>
                      <Status tone={deploymentStatusTone(deployment.status)}>
                        {DEPLOYMENT_STATUS_LABELS[deployment.status]}
                      </Status>
                    </td>
                    <td>
                      {deployment.url ? (
                        // noreferrer as well as noopener: these URLs belong to
                        // client projects and the referrer would leak which
                        // agency workspace linked to them.
                        <a
                          className="text-btn"
                          href={deployment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          เปิด <ExternalLink size={13} />
                        </a>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="muted">{deployment.commitSha?.slice(0, 7) ?? '—'}</td>
                    <td className="muted">{formatDateTime(deployment.deployedAt)}</td>
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
