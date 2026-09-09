'use client'

import { useActionState, useState } from 'react'
import { ArrowDown, ArrowUp, ListChecks, Pencil, Plus } from 'lucide-react'

import { Panel, PanelHead } from '@/components/work/data/panel'
import { SubmitButton, useActionToast } from '@/components/work/forms'
import { WorkTimeline } from '@/components/work/domain/work-timeline'
import { WorkMilestoneAdminActions } from '@/components/work/domain/work-milestone-admin-actions'
import type { PaymentMilestoneOption } from '@/lib/work/format'
import {
  applyDefaultTimeline,
  createWorkMilestone,
  reorderWorkMilestones,
  updateWorkMilestone,
  type WorkMilestoneActionState,
} from '@/lib/work/services/work-milestones'
import { DEFAULT_PHASE_NAMES } from '@/lib/work/timeline-defaults'
import type { WorkMilestoneItem } from '@/lib/work/queries/work-milestones'
import type { AssignableMember } from '@/lib/work/queries/work-milestones'

/**
 * Admin timeline panel — the whole §21 control set on one page.
 *
 * Reordering is submitted as the full ordered id list rather than as
 * "move this one up": the server rewrites `sequence` from the list's own
 * indexes, so it never has to reason about what the browser thought the
 * previous order was.
 */
export function WorkTimelineAdmin({
  projectId,
  milestones,
  members,
  paymentMilestones,
  currency,
}: {
  projectId: string
  milestones: WorkMilestoneItem[]
  members: AssignableMember[]
  paymentMilestones: PaymentMilestoneOption[]
  currency: string
}) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <Panel className="projects-panel">
      <PanelHead
        title="ไทม์ไลน์งาน"
        description="ลำดับการทำงานจริงของโปรเจกต์ — แยกจากงวดการชำระเงิน"
      />

      <ReorderControls projectId={projectId} milestones={milestones} />

      <WorkTimeline
        milestones={milestones}
        currency={currency}
        emptyMessage="ยังไม่ได้กำหนดไทม์ไลน์งาน — เพิ่มไมล์สโตนแรกด้านล่าง"
        actions={(milestone) => (
          <>
            <WorkMilestoneAdminActions milestone={milestone} />
            {milestone.status !== 'COMPLETED' && milestone.status !== 'CANCELLED' && (
              <button
                type="button"
                className="outline btn-sm"
                onClick={() => setEditingId(editingId === milestone.id ? null : milestone.id)}
              >
                <Pencil size={13} /> แก้ไข
              </button>
            )}
            {editingId === milestone.id && (
              <MilestoneForm
                projectId={projectId}
                milestone={milestone}
                members={members}
                paymentMilestones={paymentMilestones}
                onDone={() => setEditingId(null)}
              />
            )}
          </>
        )}
      />

      {milestones.length === 0 && !adding && <DefaultTimelineButton projectId={projectId} />}

      {!adding ? (
        <button type="button" className="outline milestone-add" onClick={() => setAdding(true)}>
          <Plus size={15} /> เพิ่มไมล์สโตน
        </button>
      ) : (
        <MilestoneForm
          projectId={projectId}
          members={members}
          paymentMilestones={paymentMilestones}
          onDone={() => setAdding(false)}
        />
      )}
    </Panel>
  )
}

function ReorderControls({
  projectId,
  milestones,
}: {
  projectId: string
  milestones: WorkMilestoneItem[]
}) {
  const [order, setOrder] = useState<string[] | null>(null)
  const [state, formAction] = useActionState<WorkMilestoneActionState, FormData>(
    reorderWorkMilestones,
    {},
  )
  useActionToast(state, () => setOrder(null))

  if (milestones.length < 2) return null

  const current = order ?? milestones.map((m) => m.id)
  const byId = new Map(milestones.map((m) => [m.id, m]))

  function move(index: number, delta: number) {
    const next = [...current]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setOrder(next)
  }

  return (
    <div className="reorder-controls">
      <ol className="reorder-list">
        {current.map((id, index) => (
          <li key={id}>
            <span>{byId.get(id)?.title ?? '—'}</span>
            <button type="button" className="icon-button" aria-label="เลื่อนขึ้น" onClick={() => move(index, -1)}>
              <ArrowUp size={13} />
            </button>
            <button type="button" className="icon-button" aria-label="เลื่อนลง" onClick={() => move(index, 1)}>
              <ArrowDown size={13} />
            </button>
          </li>
        ))}
      </ol>
      {order && (
        <form action={formAction} className="inline-action">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="milestoneIds" value={JSON.stringify(order)} />
          <SubmitButton pendingLabel="กำลังบันทึก...">บันทึกลำดับใหม่</SubmitButton>
          <button type="button" className="outline btn-sm" onClick={() => setOrder(null)}>
            ยกเลิก
          </button>
        </form>
      )}
    </div>
  )
}

/**
 * Offered only while the timeline is empty — the action refuses a non-empty
 * project anyway, and a button that is always visible but usually fails is
 * worse than one that appears when it applies.
 */
function DefaultTimelineButton({ projectId }: { projectId: string }) {
  const [state, formAction] = useActionState<WorkMilestoneActionState, FormData>(
    applyDefaultTimeline,
    {},
  )
  useActionToast(state)

  return (
    <form action={formAction} className="milestone-template-form">
      <input type="hidden" name="projectId" value={projectId} />
      <SubmitButton variant="outline" pendingLabel="กำลังสร้าง...">
        <ListChecks size={15} /> ใช้ไทม์ไลน์เริ่มต้น (6 เฟส)
      </SubmitButton>
      <small className="muted">สร้างไมล์สโตนตั้งต้น แก้ไขชื่อ วันที่ และลำดับได้ทั้งหมด</small>
    </form>
  )
}

function MilestoneForm({
  projectId,
  milestone,
  members,
  paymentMilestones,
  onDone,
}: {
  projectId: string
  milestone?: WorkMilestoneItem
  members: AssignableMember[]
  paymentMilestones: PaymentMilestoneOption[]
  onDone: () => void
}) {
  const [state, formAction] = useActionState<WorkMilestoneActionState, FormData>(
    milestone ? updateWorkMilestone : createWorkMilestone,
    {},
  )
  useActionToast(state, onDone)

  return (
    <form action={formAction} className="work-form milestone-edit-form">
      <input type="hidden" name="projectId" value={projectId} />
      {milestone && <input type="hidden" name="milestoneId" value={milestone.id} />}

      <label className="full">
        <span>ชื่อไมล์สโตน</span>
        <input name="title" required maxLength={200} defaultValue={milestone?.title ?? ''} placeholder="เช่น ออกแบบ UI/UX" />
        {state.fieldErrors?.title && <small className="field-error">{state.fieldErrors.title}</small>}
      </label>

      <label className="full">
        <span>รายละเอียด (ไม่บังคับ)</span>
        <textarea name="description" rows={2} maxLength={2000} defaultValue={milestone?.description ?? ''} />
      </label>

      <label>
        {/* Free text with SUGGESTIONS, not a closed dropdown: §4's phases are
            defaults, and a project must be able to invent its own. */}
        <span>เฟส (ไม่บังคับ)</span>
        <input
          name="phase"
          list="work-milestone-phases"
          maxLength={80}
          defaultValue={milestone?.phase ?? ''}
          placeholder="เช่น Development"
        />
        <datalist id="work-milestone-phases">
          {DEFAULT_PHASE_NAMES.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        {state.fieldErrors?.phase && <small className="field-error">{state.fieldErrors.phase}</small>}
      </label>

      <label>
        <span>วันเริ่ม</span>
        <input type="date" name="startDate" defaultValue={milestone?.startDate ?? ''} />
      </label>

      <label>
        <span>วันครบกำหนด</span>
        <input type="date" name="dueDate" defaultValue={milestone?.dueDate ?? ''} />
        {state.fieldErrors?.dueDate && <small className="field-error">{state.fieldErrors.dueDate}</small>}
      </label>

      <label>
        <span>ผู้รับผิดชอบ</span>
        <select name="responsibleId" defaultValue={milestone?.responsibleId ?? ''}>
          <option value="">— ยังไม่กำหนด —</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        {/* A REFERENCE, not a merge. Selecting a payment milestone records
            which invoice line this work belongs to; it never makes work
            status follow payment status or the reverse. */}
        <span>งวดการชำระเงินที่เกี่ยวข้อง (ไม่บังคับ)</span>
        <select name="paymentMilestoneId" defaultValue={milestone?.paymentMilestoneId ?? ''}>
          <option value="">— ไม่ผูกกับงวดชำระ —</option>
          {paymentMilestones.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        {state.fieldErrors?.paymentMilestoneId && (
          <small className="field-error">{state.fieldErrors.paymentMilestoneId}</small>
        )}
      </label>

      <label className="checkbox full">
        <input
          type="checkbox"
          name="clientReviewRequired"
          defaultChecked={milestone?.clientReviewRequired ?? false}
        />
        <span>ต้องให้ลูกค้าตรวจรับก่อนปิดงาน</span>
      </label>

      <label className="full">
        <span>บันทึกภายใน (ไม่บังคับ)</span>
        <textarea name="notes" rows={2} maxLength={2000} defaultValue={milestone?.notes ?? ''} />
      </label>

      <div className="form-actions">
        <SubmitButton pendingLabel="กำลังบันทึก...">
          {milestone ? 'บันทึกการแก้ไข' : 'เพิ่มไมล์สโตน'}
        </SubmitButton>
        <button type="button" className="outline btn-sm" onClick={onDone}>
          ยกเลิก
        </button>
      </div>
    </form>
  )
}
