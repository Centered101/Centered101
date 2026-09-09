'use client'

import { useActionState, useState } from 'react'
import { Plus, Trash2, Wrench } from 'lucide-react'

import { Status } from '@/components/work/data/status'
import { SubmitButton, useActionToast } from '@/components/work/forms'
import {
  BILLING_CYCLE_LABELS,
  MAINTENANCE_STATUS_LABELS,
  formatDate,
  formatMinutes,
  formatMoney,
  maintenanceStatusTone,
} from '@/lib/work/format'
import type { MaintenancePlan, MaintenanceRecord } from '@/lib/work/queries/maintenance'
import {
  createMaintenancePlan,
  createMaintenanceRecord,
  deleteMaintenanceRecord,
  setMaintenanceStatus,
  updateMaintenancePlan,
} from '@/lib/work/services/maintenance'
import type { MaintenanceActionState } from '@/lib/work/services/maintenance'
import { MAINTENANCE_BILLING_CYCLES, MAINTENANCE_STATUSES } from '@/lib/work/types/enums'

/**
 * Staff maintenance management.
 *
 * TWO HALVES WITH TWO DIFFERENT PERMISSIONS, and the split is the point:
 *
 *   the PLAN    — what is billed, on what cycle. `requireProjectFinance`,
 *                 so an accountant owns it.
 *   the RECORDS — what work was actually performed. `requireProjectManage`,
 *                 so an accountant cannot assert that engineering happened.
 *
 * Both halves are rendered together because they answer one question between
 * them ("what are we paying for, and what did we get"), but neither action
 * decides authorization — the server re-checks, and the policies re-check
 * underneath that.
 */
export function MaintenancePanel({
  projectId,
  plan,
  records,
}: {
  projectId: string
  plan: MaintenancePlan | null
  records: MaintenanceRecord[]
}) {
  return (
    <div className="maintenance-panel">
      {plan ? (
        <PlanForm projectId={projectId} plan={plan} />
      ) : (
        <PlanForm projectId={projectId} plan={null} />
      )}
      <RecordsSection projectId={projectId} plan={plan} records={records} />
    </div>
  )
}

function PlanForm({ projectId, plan }: { projectId: string; plan: MaintenancePlan | null }) {
  const [state, formAction] = useActionState<MaintenanceActionState, FormData>(
    plan ? updateMaintenancePlan : createMaintenancePlan,
    {},
  )
  useActionToast(state)

  const [services, setServices] = useState<string[]>(plan?.services ?? [])
  const [draft, setDraft] = useState('')

  return (
    <form action={formAction} className="work-form">
      <input type="hidden" name="projectId" value={projectId} />
      {plan && <input type="hidden" name="planId" value={plan.id} />}
      <input type="hidden" name="servicesJson" value={JSON.stringify(services)} />

      {plan && (
        <div className="full plan-state">
          <Status tone={maintenanceStatusTone(plan.status)}>
            {MAINTENANCE_STATUS_LABELS[plan.status]}
          </Status>
          {/* The billed figure as stored, beside the editable baht field —
              so a mis-typed price is visible before it is saved. */}
          <span className="muted">
            {formatMoney(plan.priceAmount, plan.currency)} / {BILLING_CYCLE_LABELS[plan.billingCycle]}
          </span>
          <StatusForm projectId={projectId} planId={plan.id} current={plan.status} />
        </div>
      )}

      <label>
        <span>ชื่อแผน</span>
        <input name="name" required maxLength={200} defaultValue={plan?.name ?? ''} />
        {state.fieldErrors?.name && <small className="field-error">{state.fieldErrors.name}</small>}
      </label>

      <label>
        <span>รอบการเรียกเก็บ</span>
        <select name="billingCycle" defaultValue={plan?.billingCycle ?? 'MONTHLY'}>
          {MAINTENANCE_BILLING_CYCLES.map((cycle) => (
            <option key={cycle} value={cycle}>
              {BILLING_CYCLE_LABELS[cycle]}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>ราคา (บาท)</span>
        <input
          name="priceAmount"
          type="number"
          min={0}
          step="0.01"
          defaultValue={plan ? plan.priceAmount / 100 : ''}
        />
        {state.fieldErrors?.priceAmount && (
          <small className="field-error">{state.fieldErrors.priceAmount}</small>
        )}
      </label>

      <label>
        <span>เริ่มใช้งาน</span>
        <input name="startedOn" type="date" defaultValue={plan?.startedOn ?? ''} />
      </label>

      <label>
        <span>รอบถัดไป</span>
        <input name="nextBillingDate" type="date" defaultValue={plan?.nextBillingDate ?? ''} />
      </label>

      <div className="full">
        <span className="field-label">บริการที่ครอบคลุม</span>
        <div className="service-editor">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="เช่น สำรองข้อมูลรายสัปดาห์"
            maxLength={200}
            aria-label="เพิ่มบริการ"
          />
          <button
            type="button"
            className="text-btn"
            onClick={() => {
              const value = draft.trim()
              if (!value) return
              setServices([...services, value])
              setDraft('')
            }}
          >
            <Plus size={14} /> เพิ่ม
          </button>
        </div>
        {services.length > 0 && (
          <ul className="requested-chips">
            {services.map((service, index) => (
              <li key={`${service}-${index}`}>
                {service}{' '}
                <button
                  type="button"
                  className="text-btn"
                  aria-label={`ลบ ${service}`}
                  onClick={() => setServices(services.filter((_, i) => i !== index))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {state.error && <p className="field-error full">{state.error}</p>}

      <div className="form-actions">
        <SubmitButton pendingLabel="กำลังบันทึก...">
          {plan ? 'บันทึกแผน' : 'สร้างแผนดูแลรักษา'}
        </SubmitButton>
      </div>
    </form>
  )
}

function StatusForm({
  projectId,
  planId,
  current,
}: {
  projectId: string
  planId: string
  current: string
}) {
  const [state, formAction] = useActionState<MaintenanceActionState, FormData>(
    setMaintenanceStatus,
    {},
  )
  useActionToast(state)

  return (
    <form action={formAction} className="inline-form">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="planId" value={planId} />
      <select name="status" defaultValue={current} aria-label="สถานะแผน">
        {MAINTENANCE_STATUSES.map((value) => (
          <option key={value} value={value}>
            {MAINTENANCE_STATUS_LABELS[value]}
          </option>
        ))}
      </select>
      <SubmitButton variant="outline" pendingLabel="...">
        เปลี่ยนสถานะ
      </SubmitButton>
    </form>
  )
}

function RecordsSection({
  projectId,
  plan,
  records,
}: {
  projectId: string
  plan: MaintenancePlan | null
  records: MaintenanceRecord[]
}) {
  const [state, formAction] = useActionState<MaintenanceActionState, FormData>(
    createMaintenanceRecord,
    {},
  )
  useActionToast(state)

  return (
    <div className="maintenance-records">
      <h4>
        <Wrench size={14} /> ประวัติงานที่ทำจริง
      </h4>

      {records.length === 0 ? (
        <p className="muted empty-inline">ยังไม่มีบันทึกงานดูแลรักษา</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>วันที่</th>
                <th>งาน</th>
                <th>เวลา</th>
                <th>โดย</th>
                <th aria-label="การจัดการ" />
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="muted">{formatDate(record.performedOn)}</td>
                  <td>
                    <strong>{record.title}</strong>
                    {record.description && (
                      <>
                        <br />
                        <small className="muted">{record.description}</small>
                      </>
                    )}
                    {record.planName && (
                      <>
                        <br />
                        <small className="muted">แผน: {record.planName}</small>
                      </>
                    )}
                  </td>
                  <td className="muted">{formatMinutes(record.minutesSpent)}</td>
                  <td className="muted">{record.performedByName ?? '—'}</td>
                  <td className="row-actions">
                    <DeleteRecordButton projectId={projectId} recordId={record.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form action={formAction} className="work-form">
        <input type="hidden" name="projectId" value={projectId} />
        {plan && <input type="hidden" name="planId" value={plan.id} />}

        <label>
          <span>หัวข้องาน</span>
          <input name="title" required maxLength={200} placeholder="เช่น อัปเดตปลั๊กอินและสำรองข้อมูล" />
          {state.fieldErrors?.title && (
            <small className="field-error">{state.fieldErrors.title}</small>
          )}
        </label>

        <label>
          <span>วันที่ทำ</span>
          <input name="performedOn" type="date" />
        </label>

        <label>
          <span>เวลาที่ใช้ (นาที)</span>
          <input name="minutesSpent" type="number" min={0} max={100000} />
        </label>

        <label className="full">
          <span>รายละเอียด (ลูกค้าเห็นได้)</span>
          <textarea name="description" rows={2} maxLength={4000} />
        </label>

        {state.error && <p className="field-error full">{state.error}</p>}

        <div className="form-actions">
          <SubmitButton variant="outline" pendingLabel="กำลังบันทึก...">
            <Plus size={14} /> บันทึกงานที่ทำ
          </SubmitButton>
        </div>
      </form>
    </div>
  )
}

function DeleteRecordButton({ projectId, recordId }: { projectId: string; recordId: string }) {
  const [state, formAction] = useActionState<MaintenanceActionState, FormData>(
    deleteMaintenanceRecord,
    {},
  )
  useActionToast(state)

  return (
    <form action={formAction} className="inline-form">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="recordId" value={recordId} />
      <SubmitButton variant="outline" pendingLabel="...">
        <Trash2 size={14} />
      </SubmitButton>
    </form>
  )
}
