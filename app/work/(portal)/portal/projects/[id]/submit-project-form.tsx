'use client'

import { useActionState } from 'react'
import Link from 'next/link'

import { SubmitButton, useActionToast } from '@/components/work/forms'
import { useWorkHref } from '@/components/work/layout/work-link-context'
import { submitProject } from '@/lib/work/services/projects'
import type { ActionState } from '@/lib/work/services/projects'

/**
 * "Submit for review" — the only way a self-serve project ever leaves DRAFT
 * and reaches the Admin Project Inbox (docs/ADMIN_PROJECT_LIFECYCLE.md §2).
 * Shown only for a DRAFT project's OWNER (see page.tsx) — a MEMBER/VIEWER,
 * or anyone once the project has moved past DRAFT, never sees this.
 *
 * Also links back into the intake wizard — a project can sit in DRAFT for a
 * while as the owner works through requirements/scope/timeline/etc, and
 * this is how they resume it without hunting for the URL.
 */
export function SubmitProjectForm({ projectId }: { projectId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(submitProject, {})
  useActionToast(state)

  return (
    <div className="checkout-notice">
      <strong>ยังไม่ได้ส่งให้ทีมงานตรวจสอบ</strong>
      <p className="muted">
        โปรเจกต์นี้ยังเป็นฉบับร่าง — ทีมงานยังไม่เห็นจนกว่าคุณจะส่งคำขอ
      </p>
      <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
        <Link href={useWorkHref(`/work/portal/projects/${projectId}/wizard`)} className="outline btn-sm">
          กรอกข้อมูลเพิ่มเติม
        </Link>
        <form action={formAction}>
          <input type="hidden" name="projectId" value={projectId} />
          <SubmitButton pendingLabel="กำลังส่ง...">ส่งคำขอโปรเจกต์ให้ทีมงานตรวจสอบ</SubmitButton>
        </form>
      </div>
    </div>
  )
}
