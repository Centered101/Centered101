import { notFound } from 'next/navigation'
import { Code2, ExternalLink } from 'lucide-react'

import { Panel, PageHeading, PanelHead, ProgressBar } from '@/components/work/data/panel'
import { Status } from '@/components/work/data/status'
import { Timeline } from '@/components/work/data/timeline'
import { requireProjectAccess } from '@/lib/work/auth/permissions'
import {
  DELIVERY_METHOD_LABELS,
  DEPLOYMENT_ENVIRONMENT_LABELS,
  MILESTONE_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  SOURCE_OWNERSHIP_LABELS,
  formatDate,
  formatDateTime,
  formatMoney,
  idTone,
  milestoneStatusTone,
  projectStatusTone,
} from '@/lib/work/format'
import { getDeployments } from '@/lib/work/queries/deployments'
import { getProjectPaymentSummary } from '@/lib/work/queries/payments'
import {
  getProjectById,
  getProjectFeatures,
  getProjectMembers,
} from '@/lib/work/queries/projects'
import { ProjectPeople } from '@/components/work/data/project-people'
import { CreatedToast } from './created-toast'
import { DeploymentForm } from './deployment-form'
import { EditProjectForm } from './edit-form'

export const metadata = { title: 'รายละเอียดโปรเจกต์' }

/**
 * Admin project detail.
 *
 * The `[id]` segment is the project UUID. `requireProjectAccess()` resolves it
 * under the caller's session, so an id belonging to another organization is
 * answered with notFound() — never a 403, which would confirm the project
 * exists and turn URL guessing into an enumeration oracle.
 */
export default async function AdminProjectDetailPage(
  props: PageProps<'/work/admin/projects/[id]'>,
) {
  const { id } = await props.params
  const { created } = await props.searchParams

  const access = await requireProjectAccess(id)
  const project = await getProjectById(id)

  // requireProjectAccess already proved the row is visible; a null here means
  // it was deleted between the two reads.
  if (!project) notFound()

  const [features, payments, deployments, members] = await Promise.all([
    getProjectFeatures(id),
    getProjectPaymentSummary(id),
    getDeployments({ projectId: id, limit: 5 }),
    getProjectMembers(id),
  ])

  return (
    <>
      {created === '1' && <CreatedToast />}

      <PageHeading
        eyebrow={project.projectCode}
        title={project.name}
        description={project.clientName}
        action={
          <Status tone={projectStatusTone(project.status)}>
            {PROJECT_STATUS_LABELS[project.status]}
          </Status>
        }
      />

      <section className="client-main">
        <Panel className="project-hero">
          <div className="hero-top">
            <div className={`project-icon ${idTone(project.id)} large`}>
              <Code2 size={22} />
            </div>
            <div>
              <p className="eyebrow">{project.projectCode}</p>
              <h2>{project.name}</h2>
              <p className="muted">{project.description ?? project.clientName}</p>
            </div>
            <Status tone={projectStatusTone(project.status)}>
              {PROJECT_STATUS_LABELS[project.status]}
            </Status>
          </div>
          <div className="big-progress">
            <div>
              <span>ความคืบหน้าโปรเจกต์</span>
              <strong>{project.progress}%</strong>
            </div>
            <div className="progress">
              <span style={{ width: `${project.progress}%` }} />
            </div>
            <small>กำหนดส่งมอบ {formatDate(project.expectedDelivery)}</small>
          </div>
          <div className="hero-details">
            <div>
              <span>มูลค่าโปรเจกต์</span>
              <strong>{formatMoney(project.totalAmount, project.currency)}</strong>
            </div>
            <div>
              <span>ชำระแล้ว</span>
              <strong className="green-text">
                {formatMoney(payments.paid, payments.currency)}
              </strong>
            </div>
            <div>
              <span>คงเหลือ</span>
              <strong className="orange-text">
                {formatMoney(payments.remaining, payments.currency)}
              </strong>
            </div>
            <div>
              <span>ความคืบหน้า</span>
              <ProgressBar value={project.progress} />
            </div>
          </div>
        </Panel>

        <Panel className="timeline-panel">
          <PanelHead title="ไทม์ไลน์โปรเจกต์" description="ขอบเขตงานที่ตกลงไว้" />
          <Timeline items={features} />
        </Panel>
      </section>

      <section className="bottom-grid">
        <Panel className="ownership">
          <PanelHead title="การส่งมอบ" description="เงื่อนไขที่ตกลงกับลูกค้า" />
          <div className="ownership-rows">
            <div>
              <span>ลูกค้า</span>
              <strong>{project.clientName}</strong>
            </div>
            <div>
              <span>ความเป็นเจ้าของซอร์สโค้ด</span>
              <strong>{SOURCE_OWNERSHIP_LABELS[project.sourceCodeOwnership]}</strong>
            </div>
            <div>
              <span>วิธีส่งมอบ</span>
              <strong>{DELIVERY_METHOD_LABELS[project.deliveryMethod]}</strong>
            </div>
            <div>
              <span>เริ่มงาน</span>
              <strong>{formatDate(project.startDate)}</strong>
            </div>
            <div>
              <span>ดูแลรักษา</span>
              <strong>{project.maintenanceEnabled ? 'เปิดใช้งาน' : 'ไม่เปิดใช้งาน'}</strong>
            </div>
          </div>
        </Panel>

        <Panel className="projects-panel">
          <PanelHead title="ไมล์สโตน" description="งวดการชำระเงินของโปรเจกต์นี้" />
          {payments.milestones.length === 0 ? (
            <p className="muted empty-inline">ยังไม่ได้กำหนดแผนการชำระเงิน</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>งวด</th>
                    <th>จำนวน</th>
                    <th>ครบกำหนด</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.milestones.map((milestone) => (
                    <tr key={milestone.id}>
                      <td>
                        <strong>
                          {milestone.sequence}. {milestone.name}
                        </strong>
                      </td>
                      <td>{formatMoney(milestone.amount, milestone.currency)}</td>
                      <td className="muted">{formatDate(milestone.dueDate)}</td>
                      <td>
                        <Status tone={milestoneStatusTone(milestone.status)}>
                          {MILESTONE_STATUS_LABELS[milestone.status]}
                        </Status>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </section>

      <ProjectPeople project={project} members={members} />

      <Panel className="projects-panel">
        <PanelHead title="การเผยแพร่ล่าสุด" description="ลิงก์ตัวอย่างและเวอร์ชันที่เผยแพร่" />
        {deployments.length === 0 ? (
          <p className="muted empty-inline">ยังไม่มีการเผยแพร่</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>สภาพแวดล้อม</th>
                  <th>เวอร์ชัน</th>
                  <th>ลิงก์</th>
                  <th>เผยแพร่เมื่อ</th>
                </tr>
              </thead>
              <tbody>
                {deployments.map((deployment) => (
                  <tr key={deployment.id}>
                    <td>{DEPLOYMENT_ENVIRONMENT_LABELS[deployment.environment]}</td>
                    <td className="muted">{deployment.version ?? '—'}</td>
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
                    <td className="muted">{formatDateTime(deployment.deployedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Editing controls render only for staff who may actually write. An
          accountant sees the project and its money, and no way to change it —
          matching what RLS would allow if they tried anyway. */}
      {access.canManage && (
        <>
          <Panel>
            <PanelHead title="แก้ไขโปรเจกต์" description="บันทึกลงฐานข้อมูลทันที" />
            <EditProjectForm project={project} />
          </Panel>

          <Panel>
            <PanelHead
              title="บันทึกการเผยแพร่"
              description="กรอก URL จริงของงานที่เผยแพร่แล้ว"
            />
            <DeploymentForm projectId={project.id} />
          </Panel>
        </>
      )}
    </>
  )
}
