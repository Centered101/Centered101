'use client'

import { useActionState, useRef } from 'react'

import { SubmitButton, useActionToast } from '@/components/work/forms'
import { createChangeRequest, type ActionState } from '@/lib/work/services/projects'

/**
 * The one write a client is allowed to make.
 *
 * Note what the form does NOT contain: status, and price. Those are agency
 * decisions, and RLS has no client UPDATE policy on change_requests at all —
 * so adding those fields to this form would not grant the ability, it would
 * only produce a rejected write.
 */
export function ChangeRequestForm({ projectId }: { projectId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(createChangeRequest, {})
  const formRef = useRef<HTMLFormElement>(null)

  // Cleared on success because this form stays on screen — the list above it
  // updates and the fields should not still hold the request just sent.
  useActionToast(state, () => formRef.current?.reset())

  return (
    <form ref={formRef} action={formAction} className="work-form">
      <input type="hidden" name="projectId" value={projectId} />

      <label>
        <span>หัวข้อ</span>
        <input name="title" required maxLength={200} placeholder="เพิ่มหน้าติดต่อเรา" />
        {state.fieldErrors?.title && (
          <small className="field-error">{state.fieldErrors.title}</small>
        )}
      </label>

      <label>
        <span>ความสำคัญ</span>
        <select name="priority" defaultValue="NORMAL">
          <option value="LOW">ต่ำ</option>
          <option value="NORMAL">ปกติ</option>
          <option value="HIGH">สูง</option>
          <option value="URGENT">ด่วนมาก</option>
        </select>
      </label>

      <label className="full">
        <span>รายละเอียด</span>
        <textarea name="description" rows={4} maxLength={4000} />
      </label>

      <div className="form-actions">
        <SubmitButton pendingLabel="กำลังส่ง…">ส่งคำขอ</SubmitButton>
      </div>
    </form>
  )
}
