'use client'

import { useActionState } from 'react'

import { SubmitButton, useActionToast } from '@/components/work/forms'
import { provideRequestedInformation } from '@/lib/work/services/projects'
import type { ActionState } from '@/lib/work/services/projects'

/**
 * "Additional Information Required" (docs/ADMIN_PROJECT_REVIEW.md §6) —
 * shown only when `project.status === 'NEEDS_INFORMATION'` (see page.tsx).
 * `note` is whatever `requestMoreInformation` (admin) attached to the
 * request, read from `activity_logs` by `getLatestInformationRequest`.
 */
export function NeedsInformationBanner({ projectId, note }: { projectId: string; note: string | null }) {
  const [state, formAction] = useActionState<ActionState, FormData>(provideRequestedInformation, {})
  useActionToast(state)

  return (
    <div className="checkout-notice needs-info-banner">
      <strong>ต้องการข้อมูลเพิ่มเติม</strong>
      {note && <p className="muted">{note}</p>}
      <p className="muted">
        กรุณาอัปเดตข้อมูลโปรเจกต์ตามที่ทีมงานร้องขอ แล้วกดปุ่มด้านล่างเพื่อส่งกลับให้ตรวจสอบอีกครั้ง
      </p>
      <form action={formAction}>
        <input type="hidden" name="projectId" value={projectId} />
        <SubmitButton pendingLabel="กำลังส่ง...">ส่งข้อมูลแล้ว</SubmitButton>
      </form>
    </div>
  )
}
