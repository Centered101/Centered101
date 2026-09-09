'use client'

import { useActionState, useState } from 'react'

import { Panel, PanelHead } from '@/components/work/data/panel'
import { Status } from '@/components/work/data/status'
import { useActionToast } from '@/components/work/forms'
import { PAYMENT_PLAN_CHANGE_STATUS_LABELS, formatDateTime, paymentPlanChangeStatusTone } from '@/lib/work/format'
import {
  resolvePaymentPlanChangeRequest,
  type PaymentPlanActionState,
} from '@/lib/work/services/payment-plans'
import type { PaymentPlanChangeRequestItem } from '@/lib/work/queries/payment-plans'

/**
 * Admin's inbox for "Request Changes" on a payment plan (docs/PAYMENT_PLAN.md
 * §9). Resolving here never edits a plan — it only closes the request;
 * drafting the actual response is the PaymentPlanForm above it.
 */
export function PaymentPlanChangeRequests({
  projectId,
  requests,
  canManageFinance,
}: {
  projectId: string
  requests: PaymentPlanChangeRequestItem[]
  canManageFinance: boolean
}) {
  if (requests.length === 0) return null

  return (
    <Panel className="projects-panel">
      <PanelHead title="คำขอเปลี่ยนแปลงแผนการชำระเงิน" description="ข้อความจากลูกค้าที่ขอแผนอื่น" />
      <ul className="change-request-list">
        {requests.map((request) => (
          <ChangeRequestRow key={request.id} projectId={projectId} request={request} canManageFinance={canManageFinance} />
        ))}
      </ul>
    </Panel>
  )
}

function ChangeRequestRow({
  projectId,
  request,
  canManageFinance,
}: {
  projectId: string
  request: PaymentPlanChangeRequestItem
  canManageFinance: boolean
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState<PaymentPlanActionState, FormData>(
    resolvePaymentPlanChangeRequest,
    {},
  )
  useActionToast(state, () => setOpen(false))

  return (
    <li className="change-request-row">
      <div className="change-request-head">
        <Status tone={paymentPlanChangeStatusTone(request.status)}>
          {PAYMENT_PLAN_CHANGE_STATUS_LABELS[request.status]}
        </Status>
        <span className="muted">
          {request.requestedByName ?? 'ลูกค้า'} · {formatDateTime(request.createdAt)}
          {request.planVersion && ` · เกี่ยวกับแผนเวอร์ชัน ${request.planVersion}`}
        </span>
      </div>
      <p>{request.message}</p>
      {request.resolutionNote && (
        <p className="muted">
          หมายเหตุจากทีมงาน: {request.resolutionNote}
          {request.resolvedByName && ` — ${request.resolvedByName}`}
        </p>
      )}

      {canManageFinance && request.status === 'OPEN' && (
        <>
          {!open ? (
            <button type="button" className="outline btn-sm" onClick={() => setOpen(true)}>
              ปิดคำขอ
            </button>
          ) : (
            <form action={formAction} className="work-form">
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="requestId" value={request.id} />
              <label className="full">
                <span>หมายเหตุ (บังคับหากปฏิเสธ)</span>
                <textarea name="note" maxLength={2000} rows={2} />
              </label>
              <div className="form-actions">
                {/* Two submit buttons, one form: the HTML name/value on
                    whichever button was actually clicked is what lands in
                    FormData — no client JS needed to pick the resolution. */}
                <button type="submit" name="resolution" value="ADDRESSED" className="primary">
                  จัดทำแผนใหม่แล้ว
                </button>
                <button type="submit" name="resolution" value="DISMISSED" className="outline">
                  ปฏิเสธคำขอ
                </button>
                <button type="button" className="outline btn-sm" onClick={() => setOpen(false)}>
                  ยกเลิก
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </li>
  )
}
