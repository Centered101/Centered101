import { WorkLink } from '@/components/work/layout/work-link'

import { Panel, PageHeading } from '@/components/work/data/panel'
import { Status } from '@/components/work/data/status'
import { EmptyState } from '@/components/work/states'
import { requireCapability } from '@/lib/work/auth/permissions'
import {
  MILESTONE_STATUS_LABELS,
  formatDate,
  formatMoney,
  milestoneStatusTone,
} from '@/lib/work/format'
import { getMilestones } from '@/lib/work/queries/payments'

export const metadata = { title: 'ไมล์สโตน' }

/** Payment milestones across every project, soonest due first. */
export default async function AdminMilestonesPage() {
  await requireCapability('finance:read')
  const milestones = await getMilestones()

  return (
    <>
      <PageHeading title="ไมล์สโตน" description="งวดการชำระเงินของทุกโปรเจกต์" />

      <Panel className="projects-panel">
        {milestones.length === 0 ? (
          <EmptyState
            title="ยังไม่มีไมล์สโตน"
            description="เมื่อกำหนดแผนการชำระเงินให้โปรเจกต์แล้ว งวดต่าง ๆ จะแสดงที่นี่"
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>งวด</th>
                  <th>โปรเจกต์</th>
                  <th>ลูกค้า</th>
                  <th>จำนวน</th>
                  <th>สถานะ</th>
                  <th>ครบกำหนด</th>
                </tr>
              </thead>
              <tbody>
                {milestones.map((milestone) => (
                  <tr key={milestone.id}>
                    <td>
                      <strong>
                        {milestone.sequence}. {milestone.name}
                      </strong>
                    </td>
                    <td>
                      <WorkLink href={`/work/admin/projects/${milestone.projectId}`}>
                        {milestone.projectName}
                      </WorkLink>
                    </td>
                    <td>{milestone.clientName}</td>
                    <td>
                      <strong>{formatMoney(milestone.amount, milestone.currency)}</strong>
                    </td>
                    <td>
                      <Status tone={milestoneStatusTone(milestone.status)}>
                        {MILESTONE_STATUS_LABELS[milestone.status]}
                      </Status>
                    </td>
                    <td className="muted">{formatDate(milestone.dueDate)}</td>
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
