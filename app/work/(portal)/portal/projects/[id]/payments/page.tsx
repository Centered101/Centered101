import { Panel, PageHeading, PanelHead } from '@/components/work/data/panel'
import { StatCard } from '@/components/work/data/stat-card'
import { Status } from '@/components/work/data/status'
import { requireProjectAccess } from '@/lib/work/auth/permissions'
import {
  MILESTONE_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  formatDate,
  formatMoney,
  milestoneStatusTone,
  paymentStatusTone,
} from '@/lib/work/format'
import { getProjectPaymentSummary } from '@/lib/work/queries/payments'
import { Clock3, WalletCards } from 'lucide-react'

export const metadata = { title: 'การชำระเงิน' }

/**
 * Payments for one project, from the client's side.
 *
 * Read-only, and not merely in the UI: RLS gives clients SELECT on `payments`
 * and no write policy at all, so there is no request this page could make —
 * or that anyone could make with the same session — that changes a payment's
 * status.
 */
export default async function PortalPaymentsPage(
  props: PageProps<'/work/portal/projects/[id]/payments'>,
) {
  const { id } = await props.params
  await requireProjectAccess(id)

  const summary = await getProjectPaymentSummary(id)

  return (
    <>
      <PageHeading
        eyebrow="โปรเจกต์"
        title="การชำระเงิน"
        description="ไมล์สโตนและประวัติการชำระเงินของโปรเจกต์นี้"
      />

      <section className="stats-grid client-stats">
        <StatCard
          label="มูลค่าทั้งหมด"
          value={formatMoney(summary.total, summary.currency)}
          icon={WalletCards}
        />
        <StatCard
          label="ชำระแล้ว"
          value={formatMoney(summary.paid, summary.currency)}
          icon={WalletCards}
          tone="green"
        />
        <StatCard
          label="คงเหลือ"
          value={formatMoney(summary.remaining, summary.currency)}
          icon={Clock3}
          tone="orange"
        />
        <StatCard
          label="งวดถัดไป"
          value={
            summary.nextDue
              ? formatMoney(summary.nextDue.amount, summary.nextDue.currency)
              : 'ไม่มี'
          }
          icon={Clock3}
          tone="violet"
        />
      </section>

      <Panel className="projects-panel">
        <PanelHead title="ไมล์สโตน" description="งวดการชำระเงินตามแผน" />
        {summary.milestones.length === 0 ? (
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
                {summary.milestones.map((milestone) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel className="projects-panel">
        <PanelHead title="ประวัติการชำระเงิน" description="รายการที่บันทึกไว้ทั้งหมด" />
        {summary.payments.length === 0 ? (
          <p className="muted empty-inline">ยังไม่มีประวัติการชำระเงิน</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>รายการ</th>
                  <th>จำนวน</th>
                  <th>สถานะ</th>
                  <th>ชำระเมื่อ</th>
                </tr>
              </thead>
              <tbody>
                {summary.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.milestoneName ?? 'ชำระเพิ่มเติม'}</td>
                    <td>
                      <strong>{formatMoney(payment.amount, payment.currency)}</strong>
                    </td>
                    <td>
                      <Status tone={paymentStatusTone(payment.status)}>
                        {PAYMENT_STATUS_LABELS[payment.status]}
                      </Status>
                    </td>
                    <td className="muted">{formatDate(payment.paidAt)}</td>
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
