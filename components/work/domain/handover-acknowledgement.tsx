'use client'

import { useActionState } from 'react'
import { CheckCircle2 } from 'lucide-react'

import { SubmitButton, useActionToast } from '@/components/work/forms'
import { formatDateTime } from '@/lib/work/format'
import type { HandoverAcknowledgement } from '@/lib/work/queries/delivery'
import { acknowledgeHandover } from '@/lib/work/services/delivery'
import type { DeliveryActionState } from '@/lib/work/services/delivery'

/**
 * The client confirming they received the handover.
 *
 * Records agreement; it does NOT change project status. The project reaching
 * DELIVERED is the agency's assertion, and the client agreeing is a separate
 * fact asserted by a different party — folding them together would mean a
 * client's click moved the project's state, which is exactly what the status
 * guard exists to prevent.
 *
 * Name and email are never collected here: the action reads them from the
 * authenticated profile, so this cannot be signed in someone else's name.
 */
export function HandoverAcknowledgementForm({
  projectId,
  acknowledgements,
  alreadyAcknowledged,
}: {
  projectId: string
  acknowledgements: HandoverAcknowledgement[]
  alreadyAcknowledged: boolean
}) {
  const [state, formAction] = useActionState<DeliveryActionState, FormData>(
    acknowledgeHandover,
    {},
  )
  useActionToast(state)

  return (
    <div className="handover-ack">
      {acknowledgements.length > 0 && (
        <ul className="handover-ack-list">
          {acknowledgements.map((ack) => (
            <li key={ack.id}>
              <CheckCircle2 size={14} />
              <span>
                <strong>{ack.acknowledgedName}</strong> ยืนยันรับมอบเมื่อ{' '}
                {formatDateTime(ack.acknowledgedAt)}
                {ack.note && (
                  <>
                    <br />
                    <small className="muted">{ack.note}</small>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {alreadyAcknowledged ? (
        <p className="muted">คุณได้ยืนยันการรับมอบโปรเจกต์นี้แล้ว</p>
      ) : (
        <form action={formAction} className="work-form">
          <input type="hidden" name="projectId" value={projectId} />

          <label className="full">
            <span>ข้อความเพิ่มเติม (ไม่บังคับ)</span>
            <textarea name="note" rows={2} maxLength={2000} />
          </label>

          <p className="muted full">
            การยืนยันนี้จะถูกบันทึกไว้อย่างถาวรและแก้ไขไม่ได้
            พร้อมชื่อและอีเมลของบัญชีที่คุณใช้อยู่
          </p>

          {state.error && <p className="field-error full">{state.error}</p>}

          <div className="form-actions">
            <SubmitButton pendingLabel="กำลังบันทึก...">
              <CheckCircle2 size={14} /> ยืนยันรับมอบงาน
            </SubmitButton>
          </div>
        </form>
      )}
    </div>
  )
}
