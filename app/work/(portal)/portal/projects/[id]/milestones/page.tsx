import { Panel, PageHeading } from '@/components/work/data/panel'
import { Status } from '@/components/work/data/status'
import { requireProjectAccess } from '@/lib/work/auth/permissions'
import {
  MILESTONE_STATUS_LABELS,
  UNLOCKABLE_RESOURCE_LABELS,
  formatDate,
  formatMoney,
  milestoneStatusTone,
} from '@/lib/work/format'
import { getProjectPaymentSummary } from '@/lib/work/queries/payments'

export const metadata = { title: 'ไมล์สโตน' }

/**
 * Milestones tab — a dedicated route for what the Payments page already
 * lists (docs/PROJECT_WORKSPACE_IMPLEMENTATION.md Phase 1, §11). Same read
 * (`getProjectPaymentSummary().milestones`), no new write path — paying a
 * milestone still only happens from the Payments tab's checkout button.
 * Adds the "which resources unlock" column the brief specifically asks for
 * (`unlockRules`, newly exposed on MilestoneListItem for this).
 */
export default async function PortalMilestonesPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  await requireProjectAccess(id)

  const { milestones } = await getProjectPaymentSummary(id)

  return (
    <>
      <PageHeading eyebrow="โปรเจกต์" title="ไมล์สโตน" description="งวดการชำระเงินและสิ่งที่ปลดล็อกเมื่อชำระแล้ว" />

      <Panel className="projects-panel">
        {milestones.length === 0 ? (
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
                  <th>ปลดล็อกเมื่อชำระ</th>
                </tr>
              </thead>
              <tbody>
                {milestones.map((milestone) => (
                  <tr key={milestone.id}>
                    <td>
                      <strong>
                        {milestone.sequence}. {milestone.name}
                      </strong>
                      {milestone.description && (
                        <>
                          <br />
                          <small className="muted">{milestone.description}</small>
                        </>
                      )}
                    </td>
                    <td>
                      <strong>{formatMoney(milestone.amount, milestone.currency)}</strong>
                    </td>
                    <td className="muted">{formatDate(milestone.dueDate)}</td>
                    <td>
                      <Status tone={milestoneStatusTone(milestone.status)}>
                        {MILESTONE_STATUS_LABELS[milestone.status]}
                      </Status>
                    </td>
                    <td className="muted">
                      {milestone.unlockRules.length === 0
                        ? '—'
                        : milestone.unlockRules
                            .map((resource) => UNLOCKABLE_RESOURCE_LABELS[resource] ?? resource)
                            .join(', ')}
                    </td>
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
