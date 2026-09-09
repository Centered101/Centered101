import { Panel, PanelHead } from '@/components/work/data/panel'
import { formatDate } from '@/lib/work/format'
import type { TimelineComparison as TimelineComparisonData } from '@/lib/work/queries/work-milestones'

/**
 * CLIENT REQUESTED vs ADMIN PROPOSED vs FINAL AGREED (§5).
 *
 * Three separate stored facts, shown as three separate columns. The client's
 * original request is never overwritten by either of the other two — it is
 * written once at intake (migrations 0030/0033) and read here unchanged, the
 * same way the payment-plan comparison treats their payment proposal.
 */
export function TimelineComparison({ comparison }: { comparison: TimelineComparisonData }) {
  const { clientRequested, adminProposed, finalAgreed } = comparison

  const hasAnything =
    clientRequested.startDate ||
    clientRequested.deadline ||
    clientRequested.duration ||
    clientRequested.launchDate ||
    adminProposed.deadline ||
    finalAgreed.startDate ||
    finalAgreed.deadline

  if (!hasAnything) return null

  return (
    <Panel className="projects-panel">
      <PanelHead title="กำหนดเวลา: คำขอเทียบกับที่ตกลง" description="สิ่งที่ลูกค้าขอ สิ่งที่ทีมงานเสนอ และวันที่ตกลงกันจริง" />

      <div className="timeline-comparison-grid">
        <div className="timeline-comparison-col">
          <h4>ลูกค้าขอมา</h4>
          <dl>
            <div>
              <dt>เริ่มงาน</dt>
              <dd>{formatDate(clientRequested.startDate)}</dd>
            </div>
            <div>
              <dt>ต้องการเสร็จ</dt>
              <dd>{formatDate(clientRequested.deadline)}</dd>
            </div>
            {clientRequested.duration && (
              <div>
                <dt>ระยะเวลาที่ประเมิน</dt>
                <dd>{clientRequested.duration}</dd>
              </div>
            )}
            {clientRequested.launchDate && (
              <div>
                <dt>วันเปิดตัวสำคัญ</dt>
                <dd>{formatDate(clientRequested.launchDate)}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="timeline-comparison-col">
          <h4>ทีมงานเสนอ</h4>
          <dl>
            <div>
              <dt>กำหนดส่งมอบที่เสนอ</dt>
              <dd>{formatDate(adminProposed.deadline)}</dd>
            </div>
          </dl>
        </div>

        <div className="timeline-comparison-col agreed">
          <h4>ตกลงกันจริง</h4>
          <dl>
            <div>
              <dt>เริ่มงาน</dt>
              <dd>{formatDate(finalAgreed.startDate)}</dd>
            </div>
            <div>
              <dt>กำหนดส่งมอบ</dt>
              <dd>{formatDate(finalAgreed.deadline)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </Panel>
  )
}
