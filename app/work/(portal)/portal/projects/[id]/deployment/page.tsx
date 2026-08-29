import { ExternalLink } from 'lucide-react'

import { Panel, PageHeading, PanelHead } from '@/components/work/data/panel'
import { Status } from '@/components/work/data/status'
import { requireProjectAccess } from '@/lib/work/auth/permissions'
import {
  DELIVERY_METHOD_LABELS,
  DEPLOYMENT_STATUS_LABELS,
  deploymentStatusTone,
  formatDateTime,
} from '@/lib/work/format'
import { getDeployments } from '@/lib/work/queries/deployments'
import { getProjectById } from '@/lib/work/queries/projects'

export const metadata = { title: 'การเผยแพร่' }

/** Production deployments for one project. */
export default async function PortalDeploymentPage(
  props: PageProps<'/work/portal/projects/[id]/deployment'>,
) {
  const { id } = await props.params
  await requireProjectAccess(id)

  const [deployments, project] = await Promise.all([
    getDeployments({ projectId: id, environment: 'PRODUCTION' }),
    getProjectById(id),
  ])

  const live = deployments.find((deployment) => deployment.status === 'READY')

  return (
    <>
      <PageHeading
        eyebrow="โปรเจกต์"
        title="การเผยแพร่"
        description="เวอร์ชันที่ใช้งานจริงและประวัติการเผยแพร่"
      />

      <Panel className="ownership">
        <PanelHead title="สถานะปัจจุบัน" description="เวอร์ชันที่ให้บริการอยู่" />
        <div className="ownership-rows">
          <div>
            <span>เว็บไซต์</span>
            <strong>
              {live?.url ? (
                <a href={live.url} target="_blank" rel="noopener noreferrer">
                  {live.url} <ExternalLink size={13} />
                </a>
              ) : (
                'ยังไม่ได้เผยแพร่'
              )}
            </strong>
          </div>
          <div>
            <span>เวอร์ชัน</span>
            <strong>{live?.version ?? '—'}</strong>
          </div>
          <div>
            <span>เผยแพร่เมื่อ</span>
            <strong>{formatDateTime(live?.deployedAt ?? null)}</strong>
          </div>
          <div>
            <span>โฮสติ้ง</span>
            <strong>{project ? DELIVERY_METHOD_LABELS[project.deliveryMethod] : '—'}</strong>
          </div>
        </div>
      </Panel>

      <Panel className="projects-panel">
        <PanelHead title="ประวัติการเผยแพร่" description="ทุกเวอร์ชันที่เคยขึ้นใช้งานจริง" />
        {deployments.length === 0 ? (
          <p className="muted empty-inline">ยังไม่มีประวัติการเผยแพร่</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
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
                      <strong>{deployment.version ?? '—'}</strong>
                    </td>
                    <td>
                      <Status tone={deploymentStatusTone(deployment.status)}>
                        {DEPLOYMENT_STATUS_LABELS[deployment.status]}
                      </Status>
                    </td>
                    <td>
                      {deployment.url ? (
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
