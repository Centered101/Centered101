'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'

import { GearIcon } from '@/components/work/data/gear-icon'
import { SubmitButton, useActionToast } from '@/components/work/forms'
import { useWorkHref } from '@/components/work/layout/work-link-context'
import { submitProject } from '@/lib/work/services/projects'
import type { ActionState } from '@/lib/work/services/projects'

/**
 * Step 9 — Review & Submit. Reuses the existing `submitProject` action
 * (docs/ADMIN_PROJECT_REVIEW.md) unchanged — this form only adds the
 * confirmation checkbox docs/CLIENT_PROJECT_INTAKE.md §9 requires, which
 * `submitProject` now also checks server-side (never trusts the button
 * being merely disabled).
 */
export function ReviewSubmitForm({ projectId }: { projectId: string }) {
  const router = useRouter()
  const projectHref = useWorkHref(`/work/portal/projects/${projectId}`)
  const [state, formAction] = useActionState<ActionState, FormData>(submitProject, {})
  useActionToast(state, () => router.push(projectHref))
  const [confirmed, setConfirmed] = useState(false)

  return (
    <form action={formAction} className="work-form">
      <input type="hidden" name="projectId" value={projectId} />
      <p className="muted full">
        ตรวจทานข้อมูลด้านบนให้ครบถ้วน เมื่อกดส่งคำขอแล้ว ทีมงานจะได้รับแจ้งและเริ่มตรวจสอบโปรเจกต์ของคุณ
      </p>
      <label className="checkbox full">
        <input
          type="checkbox"
          name="confirmed"
          required
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        <GearIcon />
        <span>ฉันยืนยันว่าข้อมูลที่ส่งถูกต้อง</span>
      </label>
      {state.error && <p className="field-error">{state.error}</p>}
      <div className="form-actions">
        {/* `required` on the checkbox above stops a native submit before this
            even fires; submitProject() re-checks `confirmed === 'on'`
            server-side regardless — see that action's own comment. */}
        <SubmitButton pendingLabel="กำลังส่ง...">ส่งคำขอโปรเจกต์</SubmitButton>
      </div>
    </form>
  )
}
