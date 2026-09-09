'use client'

import { useActionState, useState } from 'react'

import { Panel, PanelHead } from '@/components/work/data/panel'
import { SubmitButton, useActionToast } from '@/components/work/forms'
import { PAYMENT_PLAN_STATUS_LABELS, formatMoney } from '@/lib/work/format'
import { START_PAYMENT_MIN_SATANG } from '@/lib/work/validation/payment-plans'
import { createPaymentPlan, type PaymentPlanActionState } from '@/lib/work/services/payment-plans'
import {
  PAYMENT_PLAN_TYPES,
  UNLOCKABLE_RESOURCES,
  type PaymentPlanStatus,
  type PaymentPlanType,
  type UnlockableResource,
} from '@/lib/work/types/enums'
import { PAYMENT_PLAN_TYPE_LABELS, UNLOCKABLE_RESOURCE_LABELS } from '@/lib/work/format'

type DraftMilestone = {
  key: string
  name: string
  description: string
  percentageBp: string
  dueDate: string
  unlockRules: UnlockableResource[]
}

function rowsForType(type: PaymentPlanType): DraftMilestone[] {
  const key = () => crypto.randomUUID()
  switch (type) {
    case 'FULL_PAYMENT':
      return [
        {
          key: key(),
          name: 'ชำระเต็มจำนวน',
          description: '',
          percentageBp: '10000',
          dueDate: '',
          unlockRules: ['preview', 'source_code', 'deployment'],
        },
      ]
    case 'DEPOSIT_FINAL':
      return [
        { key: key(), name: 'เริ่มต้นโปรเจกต์', description: '', percentageBp: '3000', dueDate: '', unlockRules: ['preview'] },
        {
          key: key(),
          name: 'งวดสุดท้าย',
          description: '',
          percentageBp: '7000',
          dueDate: '',
          unlockRules: ['source_code', 'deployment'],
        },
      ]
    case 'INSTALLMENT': {
      const count = 3
      const each = Math.floor(10000 / count)
      const rows: DraftMilestone[] = []
      for (let i = 0; i < count; i++) {
        const isLast = i === count - 1
        rows.push({
          key: key(),
          name: i === 0 ? 'เริ่มต้นโปรเจกต์' : isLast ? 'งวดสุดท้าย' : `งวดที่ ${i + 1}`,
          description: '',
          percentageBp: String(isLast ? 10000 - each * (count - 1) : each),
          dueDate: '',
          unlockRules: isLast ? ['source_code', 'deployment'] : i === 0 ? ['preview'] : [],
        })
      }
      return rows
    }
    default:
      return [{ key: key(), name: 'เริ่มต้นโปรเจกต์', description: '', percentageBp: '10000', dueDate: '', unlockRules: [] }]
  }
}

/**
 * Creates a NEW VERSION of the project's payment plan (docs/PAYMENT_PLAN.md
 * §1–2). `createPaymentPlan` handles the versioning (supersede/insert) —
 * this form always submits a fresh draft; it never edits an existing plan's
 * rows client-side, matching "never overwrite an accepted historical plan".
 *
 * The FIRST milestone is the ฿250 start payment by default — every plan
 * needs exactly one, and it is what unblocks the project actually starting
 * once paid (docs/PAYMENT_PLAN.md §3). A different milestone can be marked
 * instead with the radio in its row.
 */
export function PaymentPlanForm({
  projectId,
  totalAmount,
  currency,
  existingPlan,
}: {
  projectId: string
  totalAmount: number
  currency: string
  existingPlan?: { status: PaymentPlanStatus; version: number } | null
}) {
  const [type, setType] = useState<PaymentPlanType>('DEPOSIT_FINAL')
  const [rows, setRows] = useState<DraftMilestone[]>(() => rowsForType('DEPOSIT_FINAL'))
  const [startKey, setStartKey] = useState<string | null>(null)
  const [state, formAction] = useActionState<PaymentPlanActionState, FormData>(createPaymentPlan, {})
  useActionToast(state)

  function changeType(next: PaymentPlanType) {
    setType(next)
    const nextRows = rowsForType(next)
    setRows(nextRows)
    setStartKey(null)
  }

  const totalBp = rows.reduce((sum, row) => sum + (Number(row.percentageBp) || 0), 0)
  const effectiveStartKey = startKey ?? rows[0]?.key ?? null
  const payload = rows.map((row) => ({
    name: row.name.trim(),
    description: row.description.trim() || undefined,
    percentageBp: Number(row.percentageBp) || 0,
    dueDate: row.dueDate || undefined,
    unlockRules: row.unlockRules,
    isStart: row.key === effectiveStartKey,
  }))

  const title = existingPlan
    ? `สร้างแผนการชำระเงินใหม่ (แทนที่เวอร์ชัน ${existingPlan.version} — ${PAYMENT_PLAN_STATUS_LABELS[existingPlan.status]})`
    : 'สร้างแผนการชำระเงิน'

  return (
    <Panel className="projects-panel">
      <PanelHead title={title} description={`มูลค่าโปรเจกต์ ${formatMoney(totalAmount, currency)}`} />

      <form action={formAction} className="work-form">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="milestonesJson" value={JSON.stringify(payload)} />

        <label className="full">
          <span>ประเภทการชำระเงิน</span>
          <select value={type} onChange={(e) => changeType(e.target.value as PaymentPlanType)} name="type">
            {PAYMENT_PLAN_TYPES.map((t) => (
              <option key={t} value={t}>
                {PAYMENT_PLAN_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>

        <p className="muted full">
          งวดที่เลือกเป็น &ldquo;งวดเริ่มต้น&rdquo; ต้องมีมูลค่าอย่างน้อย{' '}
          {formatMoney(START_PAYMENT_MIN_SATANG, currency)} — ชำระงวดนี้แล้วโปรเจกต์จึงเริ่มงานได้
        </p>

        <div className="pricing-fieldset-rows full">
          {rows.map((row) => {
            const amount = Math.round((totalAmount * (Number(row.percentageBp) || 0)) / 10000)
            const isStart = row.key === effectiveStartKey
            const belowMinimum = isStart && amount > 0 && amount < START_PAYMENT_MIN_SATANG
            return (
              <div className={`milestone-draft-row${isStart ? ' is-start' : ''}`} key={row.key}>
                <label className="checkbox start-payment-radio">
                  <input
                    type="radio"
                    name="startMilestone"
                    checked={isStart}
                    onChange={() => setStartKey(row.key)}
                  />
                  <span>งวดเริ่มต้น (฿250)</span>
                </label>
                <input
                  placeholder="ชื่องวด"
                  value={row.name}
                  onChange={(e) => setRows((r) => r.map((x) => (x.key === row.key ? { ...x, name: e.target.value } : x)))}
                />
                <input
                  type="number"
                  min={1}
                  max={100}
                  placeholder="สัดส่วน (%)"
                  value={row.percentageBp ? String(Number(row.percentageBp) / 100) : ''}
                  onChange={(e) =>
                    setRows((r) =>
                      r.map((x) => (x.key === row.key ? { ...x, percentageBp: String(Math.round(Number(e.target.value) * 100)) } : x)),
                    )
                  }
                />
                <input
                  type="date"
                  value={row.dueDate}
                  onChange={(e) => setRows((r) => r.map((x) => (x.key === row.key ? { ...x, dueDate: e.target.value } : x)))}
                />
                <input
                  placeholder="รายละเอียด (ไม่บังคับ)"
                  value={row.description}
                  onChange={(e) =>
                    setRows((r) => r.map((x) => (x.key === row.key ? { ...x, description: e.target.value } : x)))
                  }
                />
                <div className="unlock-checkboxes">
                  {UNLOCKABLE_RESOURCES.map((resource) => (
                    <label key={resource} className="checkbox">
                      <input
                        type="checkbox"
                        checked={row.unlockRules.includes(resource)}
                        onChange={(e) =>
                          setRows((r) =>
                            r.map((x) =>
                              x.key === row.key
                                ? {
                                    ...x,
                                    unlockRules: e.target.checked
                                      ? [...x.unlockRules, resource]
                                      : x.unlockRules.filter((v) => v !== resource),
                                  }
                                : x,
                            ),
                          )
                        }
                      />
                      <span>{UNLOCKABLE_RESOURCE_LABELS[resource]}</span>
                    </label>
                  ))}
                </div>
                {rows.length > 1 && (
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))}
                  >
                    ลบ
                  </button>
                )}
                <small className={belowMinimum ? 'field-error' : 'muted'}>
                  {formatMoney(amount, currency)}
                  {belowMinimum && ' — ต่ำกว่า ฿250'}
                </small>
              </div>
            )
          })}
        </div>

        {type === 'INSTALLMENT' && (
          <button
            type="button"
            className="outline full milestone-add"
            onClick={() =>
              setRows((r) => [
                ...r,
                { key: crypto.randomUUID(), name: `งวดที่ ${r.length + 1}`, description: '', percentageBp: '0', dueDate: '', unlockRules: [] },
              ])
            }
          >
            เพิ่มงวด
          </button>
        )}

        <p className={totalBp === 10000 ? 'muted full' : 'field-error full'}>
          รวมสัดส่วน {(totalBp / 100).toFixed(2)}% {totalBp !== 10000 && '(ต้องรวมเป็น 100%)'}
        </p>

        <div className="form-actions">
          <SubmitButton pendingLabel="กำลังส่ง...">
            {existingPlan ? 'ส่งแผนการชำระเงินใหม่' : 'สร้างแผนการชำระเงิน'}
          </SubmitButton>
        </div>
      </form>
    </Panel>
  )
}
