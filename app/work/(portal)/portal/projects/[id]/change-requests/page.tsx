import { Panel, PageHeading, PanelHead } from '@/components/work/data/panel'
import { Status } from '@/components/work/data/status'
import { requireProjectAccess } from '@/lib/work/auth/permissions'
import {
  CHANGE_REQUEST_PRIORITY_LABELS,
  CHANGE_REQUEST_STATUS_LABELS,
  changeRequestStatusTone,
  formatDate,
  formatMoney,
} from '@/lib/work/format'
import { getChangeRequests } from '@/lib/work/queries/change-requests'
import { ChangeRequestForm } from './request-form'

export const metadata = { title: 'คำขอเปลี่ยนแปลง' }

/** Change requests on one project, plus the form to raise a new one. */
export default async function PortalChangeRequestsPage(
  props: PageProps<'/work/portal/projects/[id]/change-requests'>,
) {
  const { id } = await props.params
  await requireProjectAccess(id)

  const requests = await getChangeRequests({ projectId: id })

  return (
    <>
      <PageHeading
        eyebrow="โปรเจกต์"
        title="คำขอเปลี่ยนแปลง"
        description="ขอแก้ไขหรือเพิ่มงานนอกเหนือจากขอบเขตเดิม"
      />

      <Panel className="projects-panel">
        <PanelHead title="คำขอทั้งหมด" description={`${requests.length} รายการ`} />
        {requests.length === 0 ? (
          <p className="muted empty-inline">ยังไม่มีคำขอเปลี่ยนแปลง</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>รหัส</th>
                  <th>หัวข้อ</th>
                  <th>ความสำคัญ</th>
                  <th>สถานะ</th>
                  <th>ราคาที่เสนอ</th>
                  <th>ผลกระทบ</th>
                  <th>ส่งเมื่อ</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td className="muted">{request.requestCode ?? '—'}</td>
                    <td>
                      <strong>{request.title}</strong>
                      {request.description && (
                        <>
                          <br />
                          <small className="muted">{request.description}</small>
                        </>
                      )}
                    </td>
                    <td>{CHANGE_REQUEST_PRIORITY_LABELS[request.priority]}</td>
                    <td>
                      <Status tone={changeRequestStatusTone(request.status)}>
                        {CHANGE_REQUEST_STATUS_LABELS[request.status]}
                      </Status>
                    </td>
                    <td>
                      {request.estimatedAmount === null ? (
                        <span className="muted">รอเสนอราคา</span>
                      ) : (
                        <strong>{formatMoney(request.estimatedAmount, request.currency)}</strong>
                      )}
                    </td>
                    {/* NULL and 0 are different answers: "not assessed yet"
                        versus "assessed, and it costs no time". */}
                    <td className="muted">
                      {request.impactDays === null ? '—' : `+${request.impactDays} วัน`}
                    </td>
                    <td className="muted">{formatDate(request.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel>
        <PanelHead title="ส่งคำขอใหม่" description="ทีมงานจะตรวจสอบและเสนอราคากลับ" />
        <ChangeRequestForm projectId={id} />
      </Panel>
    </>
  )
}
