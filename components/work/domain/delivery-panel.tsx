'use client'

import { useActionState, useState } from 'react'
import { CheckCircle2, ListPlus, Plus, Trash2 } from 'lucide-react'

import { Status } from '@/components/work/data/status'
import { SubmitButton, useActionToast } from '@/components/work/forms'
import {
  DELIVERABLE_STATUS_LABELS,
  DELIVERY_ITEM_LABELS,
  deliverableStatusTone,
  formatDateTime,
} from '@/lib/work/format'
import type { Deliverable, HandoverReadiness } from '@/lib/work/queries/delivery'
import {
  completeHandover,
  createDeliverable,
  deleteDeliverable,
  seedDeliverablesFromRequest,
  setDeliverableStatus,
} from '@/lib/work/services/delivery'
import type { DeliveryActionState } from '@/lib/work/services/delivery'
import { DELIVERABLE_STATUSES } from '@/lib/work/types/enums'

/**
 * Staff delivery checklist and handover.
 *
 * The three states the brief asks to keep apart are all visible here at once:
 * what the client REQUESTED (the "ลูกค้าขอ" badge, from `client_requested`),
 * what was AGREED (the rows themselves), and what has been DELIVERED (each
 * row's status). None of them is derived from another.
 *
 * The handover button is disabled while items are outstanding, but that is a
 * courtesy, not a control — `completeHandover` re-derives readiness from the
 * database and refuses regardless of what this component rendered.
 */
export function DeliveryPanel({
  projectId,
  deliverables,
  readiness,
  canHandover,
  projectStatus,
}: {
  projectId: string
  deliverables: Deliverable[]
  readiness: HandoverReadiness
  canHandover: boolean
  projectStatus: string
}) {
  return (
    <div className="delivery-panel">
      <div className="delivery-progress">
        <div>
          <span className="muted">ความคืบหน้าการส่งมอบ</span>
          <strong className="delivery-percent">{readiness.percent}%</strong>
          <span className="muted">
            ส่งมอบแล้ว {readiness.delivered} จาก {readiness.total - readiness.waived} รายการ
            {readiness.waived > 0 && ` (ตกลงไม่ส่งมอบ ${readiness.waived})`}
          </span>
        </div>
        <SeedButton projectId={projectId} />
      </div>

      {deliverables.length === 0 ? (
        <p className="muted empty-inline">
          ยังไม่มีรายการส่งมอบ — เพิ่มจากคำขอของลูกค้า หรือเพิ่มเองด้านล่าง
        </p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>รายการ</th>
                <th>ที่มา</th>
                <th>สถานะ</th>
                <th>ส่งมอบเมื่อ</th>
                <th aria-label="การจัดการ" />
              </tr>
            </thead>
            <tbody>
              {deliverables.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.itemKey ? DELIVERY_ITEM_LABELS[item.itemKey] ?? item.title : item.title}</strong>
                    {item.description && (
                      <>
                        <br />
                        <small className="muted">{item.description}</small>
                      </>
                    )}
                  </td>
                  <td>
                    {/* The requested-vs-agreed distinction, visible per row. */}
                    {item.clientRequested ? (
                      <Status tone="blue">ลูกค้าขอ</Status>
                    ) : (
                      <span className="muted">ทีมงานเพิ่ม</span>
                    )}
                  </td>
                  <td>
                    <Status tone={deliverableStatusTone(item.status)}>
                      {DELIVERABLE_STATUS_LABELS[item.status]}
                    </Status>
                  </td>
                  <td className="muted">
                    {item.deliveredAt ? (
                      <>
                        {formatDateTime(item.deliveredAt)}
                        {item.deliveredByName && (
                          <>
                            <br />
                            <small>โดย {item.deliveredByName}</small>
                          </>
                        )}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="row-actions">
                    <StatusForm projectId={projectId} item={item} />
                    <DeleteButton projectId={projectId} deliverableId={item.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateForm projectId={projectId} />

      <HandoverForm
        projectId={projectId}
        readiness={readiness}
        canHandover={canHandover}
        projectStatus={projectStatus}
      />
    </div>
  )
}

function SeedButton({ projectId }: { projectId: string }) {
  const [state, formAction] = useActionState<DeliveryActionState, FormData>(
    seedDeliverablesFromRequest,
    {},
  )
  useActionToast(state)

  return (
    <form action={formAction} className="inline-form">
      <input type="hidden" name="projectId" value={projectId} />
      <SubmitButton variant="outline" pendingLabel="กำลังเพิ่ม...">
        <ListPlus size={14} /> เพิ่มจากคำขอของลูกค้า
      </SubmitButton>
    </form>
  )
}

function StatusForm({ projectId, item }: { projectId: string; item: Deliverable }) {
  const [state, formAction] = useActionState<DeliveryActionState, FormData>(
    setDeliverableStatus,
    {},
  )
  useActionToast(state)

  return (
    <form action={formAction} className="inline-form">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="deliverableId" value={item.id} />
      <select name="status" defaultValue={item.status} aria-label={`สถานะของ ${item.title}`}>
        {DELIVERABLE_STATUSES.map((value) => (
          <option key={value} value={value}>
            {DELIVERABLE_STATUS_LABELS[value]}
          </option>
        ))}
      </select>
      <SubmitButton variant="outline" pendingLabel="...">
        บันทึก
      </SubmitButton>
    </form>
  )
}

function DeleteButton({
  projectId,
  deliverableId,
}: {
  projectId: string
  deliverableId: string
}) {
  const [state, formAction] = useActionState<DeliveryActionState, FormData>(deleteDeliverable, {})
  useActionToast(state)

  return (
    <form action={formAction} className="inline-form">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="deliverableId" value={deliverableId} />
      <SubmitButton variant="outline" pendingLabel="...">
        <Trash2 size={14} />
      </SubmitButton>
    </form>
  )
}

function CreateForm({ projectId }: { projectId: string }) {
  const [state, formAction] = useActionState<DeliveryActionState, FormData>(createDeliverable, {})
  useActionToast(state)
  const [itemKey, setItemKey] = useState('')

  return (
    <form action={formAction} className="work-form">
      <input type="hidden" name="projectId" value={projectId} />

      <label>
        <span>ประเภท</span>
        <select name="itemKey" value={itemKey} onChange={(event) => setItemKey(event.target.value)}>
          <option value="">กำหนดเอง</option>
          {Object.entries(DELIVERY_ITEM_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>ชื่อรายการ</span>
        <input name="title" required maxLength={200} placeholder="เช่น คู่มือการใช้งานระบบแอดมิน" />
        {state.fieldErrors?.title && (
          <small className="field-error">{state.fieldErrors.title}</small>
        )}
      </label>

      <label className="full">
        <span>รายละเอียด (ลูกค้าเห็นได้)</span>
        <textarea name="description" rows={2} maxLength={2000} />
      </label>

      {state.error && <p className="field-error full">{state.error}</p>}

      <div className="form-actions">
        <SubmitButton variant="outline" pendingLabel="กำลังเพิ่ม...">
          <Plus size={14} /> เพิ่มรายการ
        </SubmitButton>
      </div>
    </form>
  )
}

function HandoverForm({
  projectId,
  readiness,
  canHandover,
  projectStatus,
}: {
  projectId: string
  readiness: HandoverReadiness
  canHandover: boolean
  projectStatus: string
}) {
  const [state, formAction] = useActionState<DeliveryActionState, FormData>(completeHandover, {})
  useActionToast(state)

  const blocked = !canHandover || !readiness.isComplete || readiness.total === 0

  return (
    <form action={formAction} className="work-form handover-form">
      <input type="hidden" name="projectId" value={projectId} />

      <label className="full">
        <span>สรุปการส่งมอบ (ไม่บังคับ)</span>
        <textarea name="summary" rows={2} maxLength={2000} />
      </label>

      {!canHandover && (
        <p className="muted full">
          โปรเจกต์ต้องอยู่ในสถานะ &ldquo;พร้อมส่งมอบ&rdquo; ก่อนจึงจะบันทึกการส่งมอบได้
          (สถานะปัจจุบัน: {projectStatus})
        </p>
      )}
      {canHandover && !readiness.isComplete && (
        <p className="muted full">
          ยังมีรายการที่ยังไม่ส่งมอบอีก {readiness.outstanding.length} รายการ
        </p>
      )}

      {state.error && <p className="field-error full">{state.error}</p>}

      <div className="form-actions">
        {/* Disabled is a courtesy; completeHandover re-checks everything. */}
        {blocked ? (
          <button type="button" className="primary" disabled>
            <CheckCircle2 size={14} /> บันทึกการส่งมอบ
          </button>
        ) : (
          <SubmitButton pendingLabel="กำลังบันทึก...">
            <CheckCircle2 size={14} /> บันทึกการส่งมอบ
          </SubmitButton>
        )}
      </div>
    </form>
  )
}
