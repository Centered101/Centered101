'use client'

import { useActionState, useState } from 'react'
import { CheckCircle2, MessageCircleQuestion, Play, XCircle } from 'lucide-react'

import { Status } from '@/components/work/data/status'
import { SubmitButton, useActionToast } from '@/components/work/forms'
import {
  CHANGE_REQUEST_PRIORITY_LABELS,
  CHANGE_REQUEST_STATUS_LABELS,
  changeRequestStatusTone,
  formatDateTime,
  formatMoney,
} from '@/lib/work/format'
import type { ChangeRequestItem } from '@/lib/work/queries/change-requests'
import {
  approveChangeRequest,
  cancelChangeRequest,
  completeChangeRequest,
  quoteChangeRequest,
  rejectChangeRequest,
  requestChangeRequestInformation,
  startChangeRequestReview,
  startChangeRequestWork,
} from '@/lib/work/services/change-requests'
import type { ChangeRequestActionState } from '@/lib/work/services/change-requests'

/**
 * Staff review of one project's change requests.
 *
 * The client's words and the team's decision are shown as two separate things,
 * because they ARE two separate columns: `description` is the request and is
 * never edited, `agreed_scope` is what the team agreed to do. A screen that
 * showed one field would have to overwrite the other.
 *
 * Which buttons appear follows the state machine in
 * lib/work/auth/change-request-status.ts, but that is presentation only —
 * every action re-asserts the transition server-side, so a stale page cannot
 * drive an illegal move.
 */
export function ChangeRequestReview({
  projectId,
  requests,
}: {
  projectId: string
  requests: ChangeRequestItem[]
}) {
  const [openId, setOpenId] = useState<string | null>(null)

  if (requests.length === 0) {
    return <p className="muted empty-inline">ยังไม่มีคำขอเปลี่ยนแปลงสำหรับโปรเจกต์นี้</p>
  }

  return (
    <div className="cr-review">
      {requests.map((request) => (
        <article key={request.id} className="cr-card">
          <header>
            <div>
              <strong>{request.title}</strong>
              {request.requestCode && (
                <>
                  {' '}
                  <small className="muted">{request.requestCode}</small>
                </>
              )}
              <br />
              <small className="muted">
                โดย {request.requestedByName ?? request.requestedByEmail ?? 'ไม่ทราบ'} ·{' '}
                {formatDateTime(request.createdAt)}
              </small>
            </div>
            <div className="cr-badges">
              <Status tone={changeRequestStatusTone(request.status)}>
                {CHANGE_REQUEST_STATUS_LABELS[request.status]}
              </Status>
              <span className="muted">{CHANGE_REQUEST_PRIORITY_LABELS[request.priority]}</span>
            </div>
          </header>

          {/* What the CLIENT asked for. Read-only, always. */}
          {request.description && (
            <blockquote className="cr-client-text">{request.description}</blockquote>
          )}

          <dl className="cr-facts">
            <div>
              <dt>ขอบเขตที่ตกลง</dt>
              <dd>{request.agreedScope ?? '—'}</dd>
            </div>
            <div>
              <dt>ราคาที่เสนอ</dt>
              <dd>
                {request.estimatedAmount === null
                  ? '—'
                  : formatMoney(request.estimatedAmount, request.currency)}
              </dd>
            </div>
            <div>
              <dt>ผลกระทบต่อกำหนดเวลา</dt>
              {/* NULL and 0 are different answers and are shown differently. */}
              <dd>{request.impactDays === null ? 'ยังไม่ประเมิน' : `${request.impactDays} วัน`}</dd>
            </div>
            <div>
              <dt>ผู้ตรวจสอบ</dt>
              <dd>
                {request.reviewedByName ?? '—'}
                {request.reviewedAt && (
                  <>
                    <br />
                    <small className="muted">{formatDateTime(request.reviewedAt)}</small>
                  </>
                )}
              </dd>
            </div>
          </dl>

          {request.decisionReason && (
            <p className="muted">
              <strong>เหตุผล/ข้อมูลที่ขอเพิ่ม:</strong> {request.decisionReason}
            </p>
          )}

          <ChangeRequestActions
            projectId={projectId}
            request={request}
            expanded={openId === request.id}
            onToggle={() => setOpenId(openId === request.id ? null : request.id)}
          />
        </article>
      ))}
    </div>
  )
}

/** A one-field form used by several transitions that only need an id. */
function SimpleAction({
  projectId,
  requestId,
  action,
  label,
  pendingLabel,
  icon,
  variant = 'outline',
}: {
  projectId: string
  requestId: string
  action: (
    state: ChangeRequestActionState,
    formData: FormData,
  ) => Promise<ChangeRequestActionState>
  label: string
  pendingLabel: string
  icon?: React.ReactNode
  variant?: 'primary' | 'outline'
}) {
  const [state, formAction] = useActionState<ChangeRequestActionState, FormData>(action, {})
  useActionToast(state)

  return (
    <form action={formAction} className="inline-form">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="requestId" value={requestId} />
      <SubmitButton variant={variant} pendingLabel={pendingLabel}>
        {icon} {label}
      </SubmitButton>
    </form>
  )
}

function ChangeRequestActions({
  projectId,
  request,
  expanded,
  onToggle,
}: {
  projectId: string
  request: ChangeRequestItem
  expanded: boolean
  onToggle: () => void
}) {
  const terminal =
    request.status === 'COMPLETED' ||
    request.status === 'REJECTED' ||
    request.status === 'CANCELLED'

  if (terminal) {
    return <p className="muted">คำขอนี้ปิดแล้ว</p>
  }

  return (
    <>
      <div className="row-actions">
        {request.status === 'OPEN' && (
          <SimpleAction
            projectId={projectId}
            requestId={request.id}
            action={startChangeRequestReview}
            label="รับเข้าตรวจสอบ"
            pendingLabel="กำลังรับ..."
          />
        )}
        {request.status === 'APPROVED' && (
          <SimpleAction
            projectId={projectId}
            requestId={request.id}
            action={startChangeRequestWork}
            label="เริ่มดำเนินการ"
            pendingLabel="กำลังเริ่ม..."
            icon={<Play size={14} />}
          />
        )}
        {request.status === 'IN_PROGRESS' && (
          <SimpleAction
            projectId={projectId}
            requestId={request.id}
            action={completeChangeRequest}
            label="ปิดคำขอ"
            pendingLabel="กำลังปิด..."
            icon={<CheckCircle2 size={14} />}
            variant="primary"
          />
        )}
        {(request.status === 'OPEN' ||
          request.status === 'UNDER_REVIEW' ||
          request.status === 'QUOTED') && (
          <button type="button" className="text-btn" onClick={onToggle}>
            ประเมิน / ตัดสินใจ
          </button>
        )}
        <SimpleAction
          projectId={projectId}
          requestId={request.id}
          action={cancelChangeRequest}
          label="ยกเลิก"
          pendingLabel="กำลังยกเลิก..."
        />
      </div>

      {expanded && <DecisionForms projectId={projectId} request={request} />}
    </>
  )
}

function DecisionForms({
  projectId,
  request,
}: {
  projectId: string
  request: ChangeRequestItem
}) {
  const [quoteState, quoteAction] = useActionState<ChangeRequestActionState, FormData>(
    quoteChangeRequest,
    {},
  )
  const [approveState, approveAction] = useActionState<ChangeRequestActionState, FormData>(
    approveChangeRequest,
    {},
  )
  const [rejectState, rejectAction] = useActionState<ChangeRequestActionState, FormData>(
    rejectChangeRequest,
    {},
  )
  const [infoState, infoAction] = useActionState<ChangeRequestActionState, FormData>(
    requestChangeRequestInformation,
    {},
  )
  useActionToast(quoteState)
  useActionToast(approveState)
  useActionToast(rejectState)
  useActionToast(infoState)

  // Baht for display; the schema converts back to satang on submit.
  const bahtValue =
    request.estimatedAmount === null ? '' : String(request.estimatedAmount / 100)

  return (
    <div className="cr-decision">
      {request.status === 'UNDER_REVIEW' && (
        <form action={quoteAction} className="work-form">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="requestId" value={request.id} />
          <label className="full">
            <span>ขอบเขตที่ตกลง</span>
            <textarea name="agreedScope" rows={2} maxLength={4000} defaultValue={request.agreedScope ?? ''} />
          </label>
          <label>
            <span>ราคา (บาท)</span>
            <input name="estimatedAmount" type="number" min={0} step="0.01" defaultValue={bahtValue} />
            {quoteState.fieldErrors?.estimatedAmount && (
              <small className="field-error">{quoteState.fieldErrors.estimatedAmount}</small>
            )}
          </label>
          <label>
            <span>ผลกระทบ (วัน)</span>
            <input name="impactDays" type="number" min={0} max={3650} defaultValue={request.impactDays ?? ''} />
          </label>
          <div className="form-actions">
            <SubmitButton variant="outline" pendingLabel="กำลังส่ง...">
              ส่งราคาให้ลูกค้า
            </SubmitButton>
          </div>
        </form>
      )}

      <form action={approveAction} className="work-form">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="requestId" value={request.id} />
        <label className="full">
          <span>ขอบเขตที่ตกลง (จำเป็นสำหรับการอนุมัติ)</span>
          <textarea
            name="agreedScope"
            rows={2}
            required
            maxLength={4000}
            defaultValue={request.agreedScope ?? ''}
          />
          {approveState.fieldErrors?.agreedScope && (
            <small className="field-error">{approveState.fieldErrors.agreedScope}</small>
          )}
        </label>
        <label>
          <span>ราคา (บาท)</span>
          <input name="estimatedAmount" type="number" min={0} step="0.01" defaultValue={bahtValue} />
        </label>
        <label>
          <span>ผลกระทบ (วัน)</span>
          <input name="impactDays" type="number" min={0} max={3650} defaultValue={request.impactDays ?? ''} />
        </label>
        <p className="muted full">
          การอนุมัติจะบันทึกการตัดสินใจเท่านั้น ไม่แก้ราคาโปรเจกต์ ไม่ย้ายไมล์สโตน
          และไม่แตะแผนการชำระเงินที่ตกลงไว้แล้ว
        </p>
        <div className="form-actions">
          <SubmitButton pendingLabel="กำลังอนุมัติ...">
            <CheckCircle2 size={14} /> อนุมัติคำขอ
          </SubmitButton>
        </div>
      </form>

      <form action={infoAction} className="work-form">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="requestId" value={request.id} />
        <label className="full">
          <span>ขอข้อมูลเพิ่มเติมจากลูกค้า</span>
          <textarea name="decisionReason" rows={2} required minLength={5} maxLength={2000} />
          {infoState.fieldErrors?.decisionReason && (
            <small className="field-error">{infoState.fieldErrors.decisionReason}</small>
          )}
        </label>
        <div className="form-actions">
          <SubmitButton variant="outline" pendingLabel="กำลังส่ง...">
            <MessageCircleQuestion size={14} /> ขอข้อมูลเพิ่มเติม
          </SubmitButton>
        </div>
      </form>

      <form action={rejectAction} className="work-form">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="requestId" value={request.id} />
        <label className="full">
          <span>เหตุผลที่ปฏิเสธ (ลูกค้าจะเห็นข้อความนี้)</span>
          <textarea name="decisionReason" rows={2} required minLength={5} maxLength={2000} />
          {rejectState.fieldErrors?.decisionReason && (
            <small className="field-error">{rejectState.fieldErrors.decisionReason}</small>
          )}
        </label>
        <div className="form-actions">
          <SubmitButton variant="outline" pendingLabel="กำลังปฏิเสธ...">
            <XCircle size={14} /> ปฏิเสธคำขอ
          </SubmitButton>
        </div>
      </form>
    </div>
  )
}
