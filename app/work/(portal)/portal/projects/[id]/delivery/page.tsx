import { notFound } from 'next/navigation'
import { PackageCheck } from 'lucide-react'

import { Panel, PageHeading, PanelHead } from '@/components/work/data/panel'
import { Status } from '@/components/work/data/status'
import { HandoverAcknowledgementForm } from '@/components/work/domain/handover-acknowledgement'
import { getUser } from '@/lib/work/auth/session'
import { requireProjectAccess } from '@/lib/work/auth/permissions'
import {
  DELIVERABLE_STATUS_LABELS,
  DELIVERY_ITEM_LABELS,
  PROJECT_STATUS_LABELS,
  deliverableStatusTone,
  formatDate,
  formatDateTime,
} from '@/lib/work/format'
import {
  computeHandoverReadiness,
  getDeliverables,
  getHandoverAcknowledgements,
} from '@/lib/work/queries/delivery'
import { getProjectById } from '@/lib/work/queries/projects'

export const metadata = { title: 'การส่งมอบ' }

/**
 * The client's view of delivery.
 *
 * READ-ONLY except for one thing: acknowledging the handover. Every status on
 * this page is set by staff and enforced by `project_deliverables`' policies —
 * there is no control here that changes a deliverable's state, and adding one
 * would not work anyway, because the policies admit only
 * `app.can_manage_project`.
 *
 * The acknowledgement form appears ONLY once the project is DELIVERED, and the
 * action re-checks that server-side: confirming a handover that has not
 * happened would be a confirmation of nothing.
 */
export default async function PortalDeliveryPage(
  props: PageProps<'/work/portal/projects/[id]/delivery'>,
) {
  const { id } = await props.params
  await requireProjectAccess(id)

  const project = await getProjectById(id)
  if (!project) notFound()

  const [deliverables, acknowledgements, user] = await Promise.all([
    getDeliverables(id),
    getHandoverAcknowledgements(id),
    getUser(),
  ])

  const readiness = computeHandoverReadiness(deliverables)
  const isDelivered = project.status === 'DELIVERED'

  // Purely for rendering: whether to show the form or the "already confirmed"
  // line. The unique index and the action decide the real answer.
  const alreadyAcknowledged = acknowledgements.some(
    (ack) => ack.acknowledgedEmail.toLowerCase() === (user?.email ?? '').toLowerCase(),
  )

  return (
    <>
      <PageHeading
        eyebrow="โปรเจกต์"
        title="การส่งมอบ"
        description="รายการที่ทีมงานจะส่งมอบ และสถานะของแต่ละรายการ"
      />

      <Panel className="ownership">
        <PanelHead
          title="สถานะการส่งมอบ"
          description={`สถานะโปรเจกต์: ${PROJECT_STATUS_LABELS[project.status]}`}
          action={<PackageCheck className="panel-symbol" size={21} />}
        />
        <div className="ownership-rows">
          <div>
            <span>ความคืบหน้า</span>
            <strong>
              {readiness.percent}% ({readiness.delivered}/{readiness.total - readiness.waived})
            </strong>
          </div>
          <div>
            <span>กำหนดส่งมอบ</span>
            <strong>{formatDate(project.expectedDelivery)}</strong>
          </div>
          <div>
            <span>ส่งมอบจริง</span>
            <strong>{formatDate(project.actualDelivery)}</strong>
          </div>
        </div>
      </Panel>

      <Panel className="projects-panel">
        <PanelHead title="รายการส่งมอบ" description="สิ่งที่ทีมงานตกลงจะส่งมอบให้คุณ" />
        {deliverables.length === 0 ? (
          <p className="muted empty-inline">ทีมงานยังไม่ได้กำหนดรายการส่งมอบ</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>รายการ</th>
                  <th>สถานะ</th>
                  <th>ส่งมอบเมื่อ</th>
                </tr>
              </thead>
              <tbody>
                {deliverables.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>
                        {item.itemKey ? DELIVERY_ITEM_LABELS[item.itemKey] ?? item.title : item.title}
                      </strong>
                      {item.description && (
                        <>
                          <br />
                          <small className="muted">{item.description}</small>
                        </>
                      )}
                    </td>
                    <td>
                      <Status tone={deliverableStatusTone(item.status)}>
                        {DELIVERABLE_STATUS_LABELS[item.status]}
                      </Status>
                    </td>
                    <td className="muted">
                      {item.deliveredAt ? formatDateTime(item.deliveredAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {isDelivered && (
        <Panel className="projects-panel">
          <PanelHead
            title="ยืนยันการรับมอบ"
            description="ยืนยันว่าคุณได้รับงานตามรายการข้างต้นแล้ว"
          />
          <HandoverAcknowledgementForm
            projectId={id}
            acknowledgements={acknowledgements}
            alreadyAcknowledged={alreadyAcknowledged}
          />
        </Panel>
      )}
    </>
  )
}
