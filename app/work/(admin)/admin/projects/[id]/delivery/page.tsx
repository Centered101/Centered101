import { notFound } from 'next/navigation'

import { Panel, PageHeading, PanelHead } from '@/components/work/data/panel'
import { DeliveryPanel } from '@/components/work/domain/delivery-panel'
import { requireProjectAccess } from '@/lib/work/auth/permissions'
import { DELIVERY_ITEM_LABELS, PROJECT_STATUS_LABELS, formatDateTime } from '@/lib/work/format'
import {
  computeHandoverReadiness,
  getDeliverables,
  getHandoverAcknowledgements,
} from '@/lib/work/queries/delivery'
import { getProjectById, getProjectIntake } from '@/lib/work/queries/projects'

export const metadata = { title: 'การส่งมอบ' }

/**
 * Staff delivery checklist and handover for one project (Phase 7).
 *
 * Shows all three states side by side, which is the point: what the client
 * ASKED FOR (`projects.requested_delivery`, frozen at intake), what was AGREED
 * (`project_deliverables`), and what has been DELIVERED (each row's status).
 *
 * `requireProjectAccess` only — reading is not a mutation, and every action the
 * panel fires re-authorizes through `requireProjectManage`, which mirrors
 * `project_deliverables`' policies. An accountant may read this page and is
 * refused by every write.
 */
export default async function AdminProjectDeliveryPage(
  props: PageProps<'/work/admin/projects/[id]/delivery'>,
) {
  const { id } = await props.params
  await requireProjectAccess(id)

  const project = await getProjectById(id)
  if (!project) notFound()

  const [deliverables, acknowledgements, intake] = await Promise.all([
    getDeliverables(id),
    getHandoverAcknowledgements(id),
    getProjectIntake(id),
  ])

  const readiness = computeHandoverReadiness(deliverables)
  const canHandover = project.status === 'READY_FOR_DELIVERY'

  const requested = [
    ...(intake?.requestedDelivery ?? []),
    ...(intake?.requestedDeliveryCustom ?? []),
  ]

  return (
    <>
      <PageHeading
        eyebrow={project.projectCode}
        title="การส่งมอบ"
        description="รายการที่ตกลงส่งมอบ สถานะของแต่ละรายการ และการยืนยันรับมอบจากลูกค้า"
      />

      {/* The client's original ask, read-only and never edited — kept visibly
          separate from the agreed list below it. */}
      <Panel className="projects-panel">
        <PanelHead
          title="สิ่งที่ลูกค้าขอไว้ตอนเริ่มโปรเจกต์"
          description="บันทึกไว้ตั้งแต่ขั้นตอนเก็บข้อมูล และไม่ถูกแก้ไขอีก"
        />
        {requested.length === 0 ? (
          <p className="muted empty-inline">ลูกค้าไม่ได้ระบุรายการไว้</p>
        ) : (
          <ul className="requested-chips">
            {requested.map((key) => (
              <li key={key}>{DELIVERY_ITEM_LABELS[key] ?? key}</li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="projects-panel">
        <PanelHead
          title="รายการที่ตกลงส่งมอบ"
          description={`สถานะโปรเจกต์: ${PROJECT_STATUS_LABELS[project.status]}`}
        />
        <DeliveryPanel
          projectId={id}
          deliverables={deliverables}
          readiness={readiness}
          canHandover={canHandover}
          projectStatus={PROJECT_STATUS_LABELS[project.status]}
        />
      </Panel>

      <Panel className="projects-panel">
        <PanelHead
          title="การยืนยันรับมอบจากลูกค้า"
          description="บันทึกถาวร แก้ไขไม่ได้"
        />
        {acknowledgements.length === 0 ? (
          <p className="muted empty-inline">ลูกค้ายังไม่ได้ยืนยันรับมอบ</p>
        ) : (
          <ul className="handover-ack-list">
            {acknowledgements.map((ack) => (
              <li key={ack.id}>
                <span>
                  <strong>{ack.acknowledgedName}</strong>{' '}
                  <small className="muted">{ack.acknowledgedEmail}</small>
                  <br />
                  <small className="muted">{formatDateTime(ack.acknowledgedAt)}</small>
                  {ack.note && (
                    <>
                      <br />
                      <small>{ack.note}</small>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  )
}
