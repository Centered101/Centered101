'use client'

import { useActionState, useState } from 'react'

import { Panel, PanelHead } from '@/components/work/data/panel'
import { SubmitButton, useActionToast } from '@/components/work/forms'
import {
  requestTimelineChange,
  type WorkMilestoneActionState,
} from '@/lib/work/services/work-milestones'

/**
 * "Ask for a timeline change" (docs/PROJECT_TIMELINE.md §16).
 *
 * Does NOT edit the official timeline. It opens a row in the existing
 * `change_requests` table — the workflow that already knows how to review,
 * price and approve a change — so a request that turns out to affect scope
 * or price lands in the process that handles that, rather than silently
 * moving a deadline.
 */
export function TimelineChangeRequestForm({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState<WorkMilestoneActionState, FormData>(
    requestTimelineChange,
    {},
  )
  useActionToast(state, () => setOpen(false))

  return (
    <Panel className="projects-panel">
      <PanelHead
        title="ขอเปลี่ยนแปลงกำหนดเวลา"
        description="ส่งคำขอถึงทีมงาน — ไทม์ไลน์อย่างเป็นทางการจะไม่เปลี่ยนจนกว่าทีมงานจะพิจารณา"
      />

      {!open ? (
        <button type="button" className="outline milestone-add" onClick={() => setOpen(true)}>
          ส่งคำขอเปลี่ยนแปลง
        </button>
      ) : (
        <form action={formAction} className="work-form">
          <input type="hidden" name="projectId" value={projectId} />

          <label className="full">
            <span>หัวข้อ</span>
            <input name="title" required maxLength={200} placeholder="เช่น ขอเลื่อนกำหนดส่งมอบ" />
            {state.fieldErrors?.title && <small className="field-error">{state.fieldErrors.title}</small>}
          </label>

          <label className="full">
            <span>รายละเอียด</span>
            <textarea
              name="description"
              required
              rows={3}
              maxLength={2000}
              placeholder="อธิบายสิ่งที่ต้องการเปลี่ยนแปลงและเหตุผล"
            />
            {state.fieldErrors?.description && (
              <small className="field-error">{state.fieldErrors.description}</small>
            )}
          </label>

          <div className="form-actions">
            <SubmitButton pendingLabel="กำลังส่ง...">ส่งคำขอ</SubmitButton>
            <button type="button" className="outline btn-sm" onClick={() => setOpen(false)}>
              ยกเลิก
            </button>
          </div>
        </form>
      )}
    </Panel>
  )
}
