import { ExternalLink } from 'lucide-react'

import { Panel, PageHeading } from '@/components/work/data/panel'
import { Status } from '@/components/work/data/status'
import { requireProjectAccess } from '@/lib/work/auth/permissions'
import {
  DEPLOYMENT_ENVIRONMENT_LABELS,
  DEPLOYMENT_STATUS_LABELS,
  deploymentStatusTone,
  formatDateTime,
} from '@/lib/work/format'
import { getDeployments } from '@/lib/work/queries/deployments'

export const metadata = { title: 'ตัวอย่างงาน' }

/**
 * Preview builds for one project.
 *
 * Reads `project_deployments` where environment is PREVIEW or STAGING. Every
 * URL shown is one an admin actually saved — there is no placeholder link and
 * no example.vercel.app anywhere in this page.
 */
export default async function PortalPreviewPage(
  props: PageProps<'/work/portal/projects/[id]/preview'>,
) {
  const { id } = await props.params
  await requireProjectAccess(id)

  const deployments = await getDeployments({
    projectId: id,
    environment: ['PREVIEW', 'STAGING'],
  })

  return (
    <>
      <PageHeading
        eyebrow="โปรเจกต์"
        title="ตัวอย่างงาน"
        description="เวอร์ชันตัวอย่างที่ทีมงานเผยแพร่ให้ตรวจสอบ"
      />

      <Panel className="projects-panel">
        {deployments.length === 0 ? (
          <p className="muted empty-inline">ยังไม่มีตัวอย่างงานให้ตรวจสอบ</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>เวอร์ชัน</th>
                  <th>สภาพแวดล้อม</th>
                  <th>สถานะ</th>
                  <th>ลิงก์</th>
                  <th>Commit</th>
                  <th>สร้างเมื่อ</th>
                </tr>
              </thead>
              <tbody>
                {deployments.map((deployment) => (
                  <tr key={deployment.id}>
                    <td>
                      <strong>{deployment.version ?? '—'}</strong>
                      {deployment.notes && (
                        <>
                          <br />
                          <small className="muted">{deployment.notes}</small>
                        </>
                      )}
                    </td>
                    <td>{DEPLOYMENT_ENVIRONMENT_LABELS[deployment.environment]}</td>
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
                          เปิดตัวอย่าง <ExternalLink size={13} />
                        </a>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="muted">{deployment.commitSha?.slice(0, 7) ?? '—'}</td>
                    <td className="muted">{formatDateTime(deployment.createdAt)}</td>
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
