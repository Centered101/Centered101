import Link from 'next/link'

import { Panel, PageHeading } from '@/components/work/data/panel'
import { Status } from '@/components/work/data/status'
import { EmptyState } from '@/components/work/states'
import { requireCapability } from '@/lib/work/auth/permissions'
import {
  CHANGE_REQUEST_PRIORITY_LABELS,
  CHANGE_REQUEST_STATUS_LABELS,
  changeRequestStatusTone,
  formatDate,
  formatMoney,
} from '@/lib/work/format'
import { getChangeRequests } from '@/lib/work/queries/change-requests'

export const metadata = { title: 'คำขอเปลี่ยนแปลง' }

/**
 * Change requests raised by clients.
 *
 * Clients may create these on their own projects; only staff may price them or
 * change their status. That asymmetry is enforced by RLS (migration 0014), not
 * by which controls this page renders.
 */
export default async function AdminChangeRequestsPage() {
  await requireCapability('project:read')
  const requests = await getChangeRequests()

  const open = requests.filter(
    (request) => !['COMPLETED', 'REJECTED', 'CANCELLED'].includes(request.status),
  )

  return (
    <>
      <PageHeading
        title="คำขอเปลี่ยนแปลง"
        description={`เปิดอยู่ ${open.length} จากทั้งหมด ${requests.length} รายการ`}
      />

      <Panel className="projects-panel">
        {requests.length === 0 ? (
          <EmptyState
            title="ยังไม่มีคำขอเปลี่ยนแปลง"
            description="คำขอที่ลูกค้าส่งเข้ามาจะแสดงที่นี่"
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>รหัส</th>
                  <th>หัวข้อ</th>
                  <th>โปรเจกต์</th>
                  <th>ผู้ขอ</th>
                  <th>ความสำคัญ</th>
                  <th>สถานะ</th>
                  <th>ราคาที่เสนอ</th>
                  <th>ส่งเมื่อ</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td className="muted">{request.requestCode ?? '—'}</td>
                    <td>
                      <strong>{request.title}</strong>
                    </td>
                    <td>
                      <Link href={`/work/admin/projects/${request.projectId}`}>
                        {request.projectName ?? '—'}
                      </Link>
                    </td>
                    <td className="muted">
                      {request.requestedByName ?? request.requestedByEmail ?? '—'}
                    </td>
                    <td>{CHANGE_REQUEST_PRIORITY_LABELS[request.priority]}</td>
                    <td>
                      <Status tone={changeRequestStatusTone(request.status)}>
                        {CHANGE_REQUEST_STATUS_LABELS[request.status]}
                      </Status>
                    </td>
                    <td>
                      {request.estimatedAmount === null ? (
                        <span className="muted">ยังไม่เสนอราคา</span>
                      ) : (
                        <strong>{formatMoney(request.estimatedAmount, request.currency)}</strong>
                      )}
                    </td>
                    <td className="muted">{formatDate(request.createdAt)}</td>
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
