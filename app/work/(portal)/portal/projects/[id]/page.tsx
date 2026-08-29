import { notFound } from 'next/navigation'
import { Clock3, Code2, ShieldCheck } from 'lucide-react'

import { Panel, PageHeading, PanelHead } from '@/components/work/data/panel'
import { Status } from '@/components/work/data/status'
import { Timeline } from '@/components/work/data/timeline'
import { requireProjectAccess } from '@/lib/work/auth/permissions'
import {
  DELIVERY_METHOD_LABELS,
  MILESTONE_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  SOURCE_OWNERSHIP_LABELS,
  formatDate,
  formatMoney,
  idTone,
  projectStatusTone,
} from '@/lib/work/format'
import { getProjectPaymentSummary } from '@/lib/work/queries/payments'
import {
  getProjectById,
  getProjectFeatures,
  getProjectMembers,
} from '@/lib/work/queries/projects'
import { ProjectPeople } from '@/components/work/data/project-people'

export const metadata = { title: 'โปรเจกต์' }

/**
 * Project overview in the client portal.
 *
 * `requireProjectAccess()` runs before anything is read, and the read itself
 * runs under the caller's session. Client A passing Client B's UUID gets
 * notFound() — the id being guessable is fine precisely because the database,
 * not this component, is the boundary (docs/ARCHITECTURE.md §7).
 */
export default async function PortalProjectPage(
  props: PageProps<'/work/portal/projects/[id]'>,
) {
  const { id } = await props.params
  await requireProjectAccess(id)

  const project = await getProjectById(id)
  if (!project) notFound()

  const [features, payments, members] = await Promise.all([
    getProjectFeatures(id),
    getProjectPaymentSummary(id),
    getProjectMembers(id),
  ])

  return (
    <>
      <PageHeading
        eyebrow={project.projectCode}
        title={project.name}
        description={project.description ?? project.clientName}
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
              <p className="muted">
                กำหนดส่งมอบ {formatDate(project.expectedDelivery)}
              </p>
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
            <small>{PROJECT_STATUS_LABELS[project.status]}</small>
          </div>
          <div className="hero-details">
            <div>
              <span>มูลค่าโปรเจกต์</span>
              <strong>{formatMoney(payments.total, payments.currency)}</strong>
            </div>
            <div>
              <span>ชำระแล้ว</span>
              <strong>{formatMoney(payments.paid, payments.currency)}</strong>
            </div>
            <div>
              <span>คงเหลือ</span>
              <strong className="orange-text">
                {formatMoney(payments.remaining, payments.currency)}
              </strong>
            </div>
          </div>
        </Panel>

        <Panel className="timeline-panel">
          <PanelHead title="ไทม์ไลน์โปรเจกต์" description="ติดตามทุกขั้นตอนจนเปิดใช้งาน" />
          <Timeline items={features} />
        </Panel>
      </section>

      <ProjectPeople project={project} members={members} />

      <section className="bottom-grid">
        <Panel className="ownership">
          <PanelHead
            title="ความเป็นเจ้าของและสิทธิ์เข้าถึง"
            description="ข้อมูลการส่งมอบที่ชัดเจน"
            action={<ShieldCheck className="panel-symbol" size={21} />}
          />
          <div className="ownership-rows">
            <div>
              <span>เจ้าของโปรเจกต์</span>
              <strong>{project.clientName}</strong>
            </div>
            <div>
              <span>ความเป็นเจ้าของซอร์สโค้ด</span>
              <strong>{SOURCE_OWNERSHIP_LABELS[project.sourceCodeOwnership]}</strong>
            </div>
            <div>
              <span>โฮสติ้ง</span>
              <strong>{DELIVERY_METHOD_LABELS[project.deliveryMethod]}</strong>
            </div>
            <div>
              <span>เริ่มงาน</span>
              <strong>{formatDate(project.startDate)}</strong>
            </div>
          </div>
        </Panel>

        <Panel className="next-payment">
          <PanelHead title="การชำระเงินถัดไป" description="ยอดที่ต้องชำระเพื่อดำเนินการต่อ" />
          {payments.nextDue ? (
            <>
              <div className="maintenance-price">
                <strong>
                  {formatMoney(payments.nextDue.amount, payments.nextDue.currency)}
                </strong>
                <span>{payments.nextDue.name}</span>
              </div>
              <div className="next-billing">
                <Clock3 size={15} />
                <span>
                  ครบกำหนด <strong>{formatDate(payments.nextDue.dueDate)}</strong> ·{' '}
                  {MILESTONE_STATUS_LABELS[payments.nextDue.status]}
                </span>
              </div>
            </>
          ) : (
            <p className="muted empty-inline">ไม่มียอดค้างชำระ</p>
          )}
        </Panel>
      </section>
    </>
  )
}
