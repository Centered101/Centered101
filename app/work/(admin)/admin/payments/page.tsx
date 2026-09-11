import { Clock3, WalletCards } from 'lucide-react'

import { Panel, PageHeading } from '@/components/work/data/panel'
import { WorkLink } from '@/components/work/layout/work-link'
import { StatCard } from '@/components/work/data/stat-card'
import { Status } from '@/components/work/data/status'
import { EmptyState } from '@/components/work/states'
import { requireCapability } from '@/lib/work/auth/permissions'
import {
  PAYMENT_STATUS_LABELS,
  formatDate,
  formatMoney,
  paymentStatusTone,
} from '@/lib/work/format'
import { getPayments } from '@/lib/work/queries/payments'

export const metadata = { title: 'การชำระเงิน' }

/**
 * Payments across every project.
 *
 * Guarded by the `finance:read` capability rather than by a role list, so an
 * accountant reaches it and a role added later inherits the rule from
 * CAPABILITIES instead of from a list that has to be edited in two places.
 */
export default async function AdminPaymentsPage() {
  await requireCapability('finance:read')
  const payments = await getPayments()

  const currency = payments[0]?.currency ?? 'THB'
  const paid = payments
    .filter((payment) => payment.status === 'PAID')
    .reduce((sum, payment) => sum + payment.amount, 0)
  const pending = payments
    .filter((payment) => payment.status === 'PENDING' || payment.status === 'PROCESSING')
    .reduce((sum, payment) => sum + payment.amount, 0)

  return (
    <>
      <PageHeading title="การชำระเงิน" description="รายการชำระเงินทั้งหมดในพื้นที่ทำงาน" />

      <section className="stats-grid">
        <StatCard
          label="ได้รับแล้ว"
          value={formatMoney(paid, currency)}
          icon={WalletCards}
          href="#payments-list"
        />
        <StatCard
          label="รอชำระ"
          value={formatMoney(pending, currency)}
          icon={Clock3}
          tone="orange"
          href="#payments-list"
        />
      </section>

      <Panel className="projects-panel" id="payments-list">
        {payments.length === 0 ? (
          <EmptyState
            title="ยังไม่มีการชำระเงิน"
            description="รายการจะปรากฏเมื่อมีการบันทึกหรือได้รับการชำระเงิน"
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>โปรเจกต์</th>
                  <th>ลูกค้า</th>
                  <th>ไมล์สโตน</th>
                  <th>จำนวน</th>
                  <th>สถานะ</th>
                  <th>ชำระเมื่อ</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <strong>
                        <WorkLink href={`/work/admin/projects/${payment.projectId}`}>
                          {payment.projectName}
                        </WorkLink>
                      </strong>
                    </td>
                    <td>{payment.clientName}</td>
                    <td className="muted">{payment.milestoneName ?? '—'}</td>
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
