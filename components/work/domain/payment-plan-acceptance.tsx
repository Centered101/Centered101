'use client'

import { useActionState, useState } from 'react'

import { Panel, PanelHead } from '@/components/work/data/panel'
import { Status } from '@/components/work/data/status'
import { SubmitButton, useActionToast } from '@/components/work/forms'
import {
  MILESTONE_STATUS_LABELS,
  PAYMENT_PLAN_STATUS_LABELS,
  formatDate,
  formatMoney,
  milestoneStatusTone,
  paymentPlanStatusTone,
} from '@/lib/work/format'
import {
  acceptPaymentPlan,
  requestPaymentPlanChanges,
  type PaymentPlanActionState,
} from '@/lib/work/services/payment-plans'
import type { MilestoneListItem, PaymentPlan } from '@/lib/work/queries/payments'

/**
 * The client's view of the proposed payment plan, with the two decisions
 * they can make about it (docs/PAYMENT_PLAN.md §8–9): accept it, or ask for
 * changes with a required message.
 *
 * Neither button changes money or milestones. Accepting inserts an
 * append-only acceptance row and flips the plan to ACCEPTED (server-side);
 * requesting changes records a request and leaves the official plan exactly
 * as it stands, for admin to answer with a NEW version.
 */
export function PaymentPlanAcceptance({
  projectId,
  plan,
  milestones,
}: {
  projectId: string
  plan: PaymentPlan
  milestones: MilestoneListItem[]
}) {
  const [mode, setMode] = useState<'idle' | 'accept' | 'changes'>('idle')

  const [acceptState, acceptAction] = useActionState<PaymentPlanActionState, FormData>(
    acceptPaymentPlan,
    {},
  )
  const [changeState, changeAction] = useActionState<PaymentPlanActionState, FormData>(
    requestPaymentPlanChanges,
    {},
  )
  useActionToast(acceptState, () => setMode('idle'))
  useActionToast(changeState, () => setMode('idle'))

  const decided = plan.status === 'ACCEPTED'

  return (
    <Panel className="projects-panel">
      <PanelHead
        title="แผนการชำระเงินของโปรเจกต์"
        description={`ยอดรวม ${formatMoney(plan.totalAmount, plan.currency)} · เวอร์ชัน ${plan.version}`}
      />

      <div className="plan-status-line">
        <Status tone={paymentPlanStatusTone(plan.status)}>{PAYMENT_PLAN_STATUS_LABELS[plan.status]}</Status>
        {plan.acceptedAt && <span className="muted">ยืนยันเมื่อ {formatDate(plan.acceptedAt)}</span>}
      </div>

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
            {milestones.map((milestone) => (
              <tr key={milestone.id}>
                <td>
                  <strong>
                    {milestone.sequence}. {milestone.name}
                    {milestone.isStartPayment && ' · งวดเริ่มต้น'}
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

      {decided ? (
        <p className="muted empty-inline">
          คุณยืนยันแผนนี้แล้ว ชำระงวดเริ่มต้นเพื่อให้ทีมงานเริ่มงานได้เลย
        </p>
      ) : (
        <div className="plan-decision">
          {mode === 'idle' && (
            <div className="form-actions">
              <button type="button" className="primary" onClick={() => setMode('accept')}>
                ยอมรับแผนการชำระเงิน
              </button>
              <button type="button" className="outline" onClick={() => setMode('changes')}>
                ขอเปลี่ยนแปลง
              </button>
            </div>
          )}

          {mode === 'accept' && (
            <form action={acceptAction} className="work-form">
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="planId" value={plan.id} />
              <label className="full">
                <span>พิมพ์ชื่อของคุณเพื่อยืนยัน</span>
                <input name="name" required maxLength={200} placeholder="ชื่อ-นามสกุล" />
              </label>
              <div className="form-actions">
                <SubmitButton pendingLabel="กำลังยืนยัน...">ยืนยันแผนการชำระเงิน</SubmitButton>
                <button type="button" className="outline btn-sm" onClick={() => setMode('idle')}>
                  ยกเลิก
                </button>
              </div>
            </form>
          )}

          {mode === 'changes' && (
            <form action={changeAction} className="work-form">
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="planId" value={plan.id} />
              <label className="full">
                <span>สิ่งที่ต้องการเปลี่ยนแปลง</span>
                <textarea
                  name="message"
                  required
                  rows={3}
                  maxLength={2000}
                  placeholder="เช่น ขอแบ่งเป็น 4 งวด หรือขอเลื่อนกำหนดชำระงวดที่ 2"
                />
              </label>
              <div className="form-actions">
                <SubmitButton pendingLabel="กำลังส่ง...">ส่งคำขอเปลี่ยนแปลง</SubmitButton>
                <button type="button" className="outline btn-sm" onClick={() => setMode('idle')}>
                  ยกเลิก
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </Panel>
  )
}
