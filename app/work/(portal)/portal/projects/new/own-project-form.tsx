'use client'

import { useActionState } from 'react'

import { SubmitButton, useActionToast } from '@/components/work/forms'
import { createOwnProject } from '@/lib/work/services/projects'
import type { ActionState } from '@/lib/work/services/projects'
import { PROJECT_TYPES } from '@/lib/work/types/enums'
import { PROJECT_TYPE_LABELS } from '@/lib/work/format'

/**
 * Self-serve project creation form.
 *
 * Deliberately minimal: name, description, type — nothing that would let the
 * browser name an organization, a client company, or an owner. Those three
 * do not appear anywhere in this form because createOwnProject resolves them
 * server-side; there is nothing here for it to trust even if it wanted to.
 */
export function OwnProjectForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(createOwnProject, {})
  useActionToast(state)

  return (
    <form action={formAction} className="work-form">
      <label className="full">
        <span>ชื่อโปรเจกต์</span>
        <input name="name" required maxLength={200} placeholder="เช่น เว็บไซต์ร้านค้าออนไลน์" />
        {state.fieldErrors?.name && <small className="field-error">{state.fieldErrors.name}</small>}
      </label>

      <label>
        <span>ประเภทโปรเจกต์</span>
        <select name="type" defaultValue="WEBSITE">
          {PROJECT_TYPES.map((type) => (
            <option key={type} value={type}>
              {PROJECT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </label>

      <label className="full">
        <span>รายละเอียด (ไม่บังคับ)</span>
        <textarea name="description" rows={4} maxLength={2000} placeholder="อธิบายสิ่งที่ต้องการโดยย่อ" />
      </label>

      {state.error && <p className="field-error">{state.error}</p>}

      <div className="form-actions">
        <SubmitButton pendingLabel="กำลังสร้าง...">สร้างโปรเจกต์</SubmitButton>
      </div>
    </form>
  )
}
