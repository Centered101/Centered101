import { Panel, PageHeading, PanelHead, ProgressBar } from '@/components/work/data/panel'
import { StatCard } from '@/components/work/data/stat-card'
import { Status } from '@/components/work/data/status'
import { requireProjectAccess } from '@/lib/work/auth/permissions'
import {
  MILESTONE_STATUS_LABELS,
  PAYMENT_PLAN_CHANGE_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  formatDate,
  formatDateTime,
  formatMoney,
  milestoneStatusTone,
  paymentPlanChangeStatusTone,
  paymentStatusTone,
} from '@/lib/work/format'
import { getProjectPaymentSummary } from '@/lib/work/queries/payments'
import { getPaymentPlanChangeRequests } from '@/lib/work/queries/payment-plans'
import { PaymentPlanAcceptance } from '@/components/work/domain/payment-plan-acceptance'
import { Clock3, WalletCards } from 'lucide-react'

import { CheckoutButton } from './checkout-button'
import { ManualProofForm } from './manual-proof-form'

export const metadata = { title: 'การชำระเงิน' }

/**
 * Milestones a client may start a checkout for.
 *
 * PAID and CANCELLED are excluded for the obvious reason; the server refuses
 * them again anyway, because a button that is merely absent is not a rule.
 */
const PAYABLE_STATUSES = ['PENDING', 'INVOICED', 'OVERDUE']

/**
 * What the browser is told after the provider hands it back.
 *
 * Neither branch claims a payment succeeded. Stripe returns the client to
 * `success_url` as soon as the session completes, which for PromptPay is
 * minutes before the money actually clears — and even for a card, this page
 * has no way to know until the webhook arrives. So it says what is true: the
 * attempt was made, and the status below updates when it is confirmed.
 */
const CHECKOUT_NOTICES: Record<string, string> = {
  complete:
    'ได้รับคำสั่งชำระเงินแล้ว สถานะจะอัปเดตเมื่อได้รับการยืนยันจากผู้ให้บริการ ' +
    'ซึ่งอาจใช้เวลาสักครู่',
  cancelled: 'คุณยกเลิกการชำระเงิน ยังไม่มีการเรียกเก็บเงินใด ๆ',
}

/**
 * Payments for one project, from the client's side.
 *
 * The client can now START a payment from here, and still cannot RECORD one.
 * RLS gives them SELECT on `payments` and no write policy at all; the checkout
 * row is inserted by the server on their behalf after it re-reads the
 * milestone, and only the provider's webhook ever writes PAID. So the button
 * below adds a way to pay, not a way to change what this page reports.
 */
export default async function PortalPaymentsPage(
  props: PageProps<'/work/portal/projects/[id]/payments'>,
) {
  const { id } = await props.params
  await requireProjectAccess(id)

  const [summary, changeRequests, searchParams] = await Promise.all([
    getProjectPaymentSummary(id),
    getPaymentPlanChangeRequests(id),
    props.searchParams,
  ])

  const checkout = searchParams.checkout
  const notice = typeof checkout === 'string' ? CHECKOUT_NOTICES[checkout] : undefined

  // docs/PAYMENT_PLAN.md §8: a client pays only against a plan they have
  // actually accepted. Before that the schedule is a proposal, and the Pay
  // buttons stay off — the server refuses too (`startMilestoneCheckout`
  // re-reads the milestone), so this is the honest UI, not the rule.
  const planAccepted = summary.plan?.status === 'ACCEPTED'
  const paymentProgress =
    summary.total > 0 ? Math.min(100, Math.round((summary.paid / summary.total) * 100)) : 0

  return (
    <>
      <PageHeading
        eyebrow="โปรเจกต์"
        title="การชำระเงิน"
        description="ไมล์สโตนและประวัติการชำระเงินของโปรเจกต์นี้"
      />

      {notice && <p className="checkout-notice">{notice}</p>}

      <section className="stats-grid client-stats">
        <StatCard
          label="มูลค่าทั้งหมด"
          value={formatMoney(summary.total, summary.currency)}
          icon={WalletCards}
          href="#payment-milestones"
        />
        <StatCard
          label="ชำระแล้ว"
          value={formatMoney(summary.paid, summary.currency)}
          icon={WalletCards}
          tone="green"
          href="#payment-history"
        />
        <StatCard
          label="คงเหลือ"
          value={formatMoney(summary.remaining, summary.currency)}
          icon={Clock3}
          tone="orange"
          href="#payment-milestones"
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
          href="#payment-milestones"
        />
      </section>

      <Panel className="projects-panel">
        <PanelHead title="ความคืบหน้าการชำระเงิน" description="สัดส่วนที่ชำระแล้วของมูลค่าโปรเจกต์" />
        <div className="payment-progress-row">
          <strong>{paymentProgress}%</strong>
          <ProgressBar value={paymentProgress} />
          <small className="muted">
            {formatMoney(summary.paid, summary.currency)} จาก {formatMoney(summary.total, summary.currency)}
          </small>
        </div>
      </Panel>

      {/* The plan itself, with Accept / Request Changes. Rendered whenever a
          plan exists — once ACCEPTED it becomes a read-only schedule. */}
      {summary.plan && (
        <PaymentPlanAcceptance projectId={id} plan={summary.plan} milestones={summary.milestones} />
      )}

      {changeRequests.length > 0 && (
        <Panel className="projects-panel">
          <PanelHead title="คำขอเปลี่ยนแปลงของคุณ" description="สถานะคำขอที่ส่งถึงทีมงาน" />
          <ul className="change-request-list">
            {changeRequests.map((request) => (
              <li key={request.id} className="change-request-row">
                <div className="change-request-head">
                  <Status tone={paymentPlanChangeStatusTone(request.status)}>
                    {PAYMENT_PLAN_CHANGE_STATUS_LABELS[request.status]}
                  </Status>
                  <span className="muted">{formatDateTime(request.createdAt)}</span>
                </div>
                <p>{request.message}</p>
                {request.resolutionNote && <p className="muted">ทีมงาน: {request.resolutionNote}</p>}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel className="projects-panel" id="payment-milestones">
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
                  <th />
                </tr>
              </thead>
              <tbody>
                {summary.milestones.map((milestone) => (
                  <tr key={milestone.id}>
                    <td>
                      <strong>
                        {milestone.sequence}. {milestone.name}
                      </strong>
                      {milestone.isStartPayment && (
                        <>
                          {' '}
                          <Status tone="violet">งวดเริ่มต้น</Status>
                        </>
                      )}
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
                    <td className="row-actions">
                      {PAYABLE_STATUSES.includes(milestone.status) && milestone.amount > 0 && (
                        planAccepted ? (
                          <>
                            <CheckoutButton
                              projectId={id}
                              milestoneId={milestone.id}
                              milestoneName={milestone.name}
                              projectName={milestone.projectName}
                              amountLabel={formatMoney(milestone.amount, milestone.currency)}
                              reference={`งวดที่ ${milestone.sequence} · ครบกำหนด ${formatDate(milestone.dueDate)}`}
                            />
                            <ManualProofForm
                              projectId={id}
                              milestoneId={milestone.id}
                              milestoneName={milestone.name}
                            />
                          </>
                        ) : (
                          <small className="muted">ยืนยันแผนการชำระเงินก่อนจึงจะชำระได้</small>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel className="projects-panel" id="payment-history">
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
