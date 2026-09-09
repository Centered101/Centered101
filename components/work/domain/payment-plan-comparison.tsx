import { Panel, PanelHead } from '@/components/work/data/panel'
import { Status } from '@/components/work/data/status'
import {
  PAYMENT_PLAN_STATUS_LABELS,
  formatDate,
  formatMoney,
  paymentPlanStatusTone,
} from '@/lib/work/format'
import type { PaymentPlanComparison as PaymentPlanComparisonData } from '@/lib/work/queries/payment-plans'

const PROPOSAL_TYPE_LABELS: Record<string, string> = {
  FULL_PAYMENT: 'จ่ายครั้งเดียว',
  DEPOSIT_FINAL: 'มัดจำ + จ่ายส่วนที่เหลือ',
  INSTALLMENT: 'ผ่อนหลายงวด',
  CUSTOM: 'ให้ทีมงานเสนอ',
}

/**
 * Client proposal vs official plan, side by side (docs/PAYMENT_PLAN.md §1).
 *
 * Read-only, and deliberately does not merge or "resolve" the two into one
 * view — the whole point is that admin sees both and decides, never that the
 * client's proposal is silently replaced (§1: "Do not silently replace the
 * client's proposal").
 */
export function PaymentPlanComparison({ comparison }: { comparison: PaymentPlanComparisonData }) {
  if (!comparison.clientProposal && !comparison.officialPlan) return null

  return (
    <Panel className="projects-panel">
      <PanelHead title="แผนการชำระเงิน: ข้อเสนอเทียบกับแผนจริง" description="ข้อเสนอของลูกค้าเทียบกับแผนที่ทีมงานจัดทำ" />

      <div className="plan-comparison-grid">
        <div className="plan-comparison-col">
          <h4>ข้อเสนอจากลูกค้า</h4>
          {comparison.clientProposal ? (
            <>
              <p className="muted">ประเภท: {PROPOSAL_TYPE_LABELS[comparison.clientProposal.type] ?? comparison.clientProposal.type}</p>
              {comparison.clientProposal.milestones.length > 0 ? (
                <ul className="plan-comparison-list">
                  {comparison.clientProposal.milestones.map((m, i) => (
                    <li key={i}>
                      <strong>{m.name}</strong>
                      <span>{(m.percentageBp / 100).toFixed(0)}%</span>
                      {m.dueDate && <small className="muted">ครบกำหนด {formatDate(m.dueDate)}</small>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">ลูกค้าขอให้ทีมงานเป็นผู้เสนอ</p>
              )}
              {(comparison.clientBudget.min || comparison.clientBudget.max || comparison.clientBudget.preferred) && (
                <p className="muted">
                  งบประมาณที่แจ้ง:{' '}
                  {comparison.clientBudget.preferred
                    ? formatMoney(comparison.clientBudget.preferred, comparison.clientBudget.currency)
                    : `${comparison.clientBudget.min ? formatMoney(comparison.clientBudget.min, comparison.clientBudget.currency) : '—'}–${
                        comparison.clientBudget.max ? formatMoney(comparison.clientBudget.max, comparison.clientBudget.currency) : '—'
                      }`}
                </p>
              )}
              {comparison.clientProposal.notes && <p className="muted">หมายเหตุ: {comparison.clientProposal.notes}</p>}
            </>
          ) : (
            <p className="muted empty-inline">ลูกค้ายังไม่ได้ส่งข้อเสนอ</p>
          )}
        </div>

        <div className="plan-comparison-col">
          <div className="plan-comparison-col-head">
            <h4>แผนที่ทีมงานจัดทำ</h4>
            {comparison.officialPlan && (
              <Status tone={paymentPlanStatusTone(comparison.officialPlan.status)}>
                {PAYMENT_PLAN_STATUS_LABELS[comparison.officialPlan.status]} · v{comparison.officialPlan.version}
              </Status>
            )}
          </div>
          {comparison.officialPlan ? (
            <>
              <p className="muted">ยอดรวม {formatMoney(comparison.officialPlan.totalAmount, comparison.officialPlan.currency)}</p>
              <ul className="plan-comparison-list">
                {comparison.officialPlan.milestones.map((m) => (
                  <li key={m.id}>
                    <strong>
                      {m.sequence}. {m.name}
                      {m.isStartPayment && ' · เริ่มต้น'}
                    </strong>
                    <span>{formatMoney(m.amount, m.currency)}</span>
                    {m.dueDate && <small className="muted">ครบกำหนด {formatDate(m.dueDate)}</small>}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="muted empty-inline">ยังไม่ได้จัดทำแผนอย่างเป็นทางการ</p>
          )}
        </div>
      </div>

      {comparison.clientProposal && comparison.officialPlan && (
        <p className="plan-comparison-diff muted">
          ตัวอย่าง: ลูกค้าเสนอ{' '}
          {comparison.clientProposal.milestones.map((m) => `${(m.percentageBp / 100).toFixed(0)}%`).join(' / ')} —
          ทีมงานเสนอ{' '}
          {comparison.officialPlan.milestones
            .map((m) => `${Math.round((m.amount / comparison.officialPlan!.totalAmount) * 100)}%`)
            .join(' / ')}
        </p>
      )}
    </Panel>
  )
}
