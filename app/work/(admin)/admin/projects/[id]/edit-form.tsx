'use client'

import { useActionState } from 'react'

import { SubmitButton, useActionToast } from '@/components/work/forms'
import {
  DELIVERY_METHOD_LABELS,
  PROJECT_STATUS_LABELS,
  SOURCE_OWNERSHIP_LABELS,
} from '@/lib/work/format'
import type { ProjectDetail } from '@/lib/work/queries/projects'
import { updateProject, type ActionState } from '@/lib/work/services/projects'
import {
  DELIVERY_METHODS,
  PROJECT_STATUSES,
  SOURCE_CODE_OWNERSHIPS,
} from '@/lib/work/types/enums'

/**
 * Edit a project.
 *
 * The project id travels in a hidden field and the action re-authorizes from
 * it — it is not trusted as proof of anything. Someone editing the hidden
 * value is asking to update a different project, and `requireProjectManage()`
 * plus RLS both answer no unless they really may.
 */
export function EditProjectForm({ project }: { project: ProjectDetail }) {
  const [state, formAction] = useActionState<ActionState, FormData>(updateProject, {})
  useActionToast(state)

  return (
    <form action={formAction} className="work-form">
      <input type="hidden" name="projectId" value={project.id} />

      <label>
        <span>ชื่อโปรเจกต์</span>
        <input name="name" required defaultValue={project.name} maxLength={200} />
        {state.fieldErrors?.name && <small className="field-error">{state.fieldErrors.name}</small>}
      </label>

      <label>
        <span>สถานะ</span>
        <select name="status" defaultValue={project.status}>
          {PROJECT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {PROJECT_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>

      <label className="full">
        <span>รายละเอียด</span>
        <textarea name="description" rows={3} maxLength={2000} defaultValue={project.description ?? ''} />
      </label>

      <label>
        <span>ความคืบหน้า (%)</span>
        <input
          name="progress"
          type="number"
          min={0}
          max={100}
          step={1}
          defaultValue={project.progress}
        />
        {state.fieldErrors?.progress && (
          <small className="field-error">{state.fieldErrors.progress}</small>
        )}
      </label>

      <label>
        <span>กำหนดส่งมอบ</span>
        <input name="expectedDelivery" type="date" defaultValue={project.expectedDelivery ?? ''} />
      </label>

      <label>
        <span>วิธีส่งมอบ</span>
        <select name="deliveryMethod" defaultValue={project.deliveryMethod}>
          {DELIVERY_METHODS.map((method) => (
            <option key={method} value={method}>
              {DELIVERY_METHOD_LABELS[method]}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>ความเป็นเจ้าของซอร์สโค้ด</span>
        <select name="sourceCodeOwnership" defaultValue={project.sourceCodeOwnership}>
          {SOURCE_CODE_OWNERSHIPS.map((ownership) => (
            <option key={ownership} value={ownership}>
              {SOURCE_OWNERSHIP_LABELS[ownership]}
            </option>
          ))}
        </select>
      </label>

      <p className="muted full">
        ราคารวมคำนวณจากรายการราคาด้านล่างโดยอัตโนมัติ — แก้ไขได้ที่นั่น
      </p>

      <div className="form-actions">
        <SubmitButton pendingLabel="กำลังบันทึก…">บันทึกการเปลี่ยนแปลง</SubmitButton>
      </div>
    </form>
  )
}
