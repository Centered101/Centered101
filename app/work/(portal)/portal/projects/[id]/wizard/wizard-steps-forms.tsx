'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { SubmitButton, useActionToast } from '@/components/work/forms'
import { AssetThumbnail } from '@/components/work/domain/asset-thumbnail'
import { useWizardDirty } from './wizard-dirty'
import {
  DELIVERY_ITEM_LABELS,
  PROJECT_ASSET_KIND_LABELS,
  PROJECT_ASSET_REVIEW_STATUS_LABELS,
  assetReviewStatusTone,
  formatMoney,
} from '@/lib/work/format'
import {
  addProjectAssetLink,
  removeProjectAsset,
  saveBudget,
  saveDeliveryRequest,
  savePaymentProposal,
  saveRequirements,
  saveScope,
  saveTimeline,
  uploadProjectAsset,
} from '@/lib/work/services/intake'
import type { ActionState } from '@/lib/work/services/projects'
import { DELIVERY_ITEM_KEYS } from '@/lib/work/validation/intake'
import { PAYMENT_PLAN_TYPES, PROJECT_ASSET_KINDS } from '@/lib/work/types/enums'
import type { ProjectAsset } from '@/lib/work/queries/assets'
import type { ProjectFeature } from '@/lib/work/queries/projects'
import type { ProjectIntake } from '@/lib/work/queries/projects'
import { Status } from '@/components/work/data/status'

const SCOPE_PRESETS = [
  'UI/UX',
  'Frontend',
  'Backend',
  'Database',
  'ระบบสมาชิก (Authentication)',
  'Admin Dashboard',
  'Responsive Design',
  'SEO',
  'Deployment',
  'การดูแลรักษา (Maintenance)',
  'การส่งมอบซอร์สโค้ด',
]

/**
 * Every step form calls its own action, then advances to the next step on
 * success — one router.push, matching the acceptAgreement/inviteMember
 * pattern already used elsewhere.
 *
 * `markDirty` is wired to the returned form's `onChange` at each call site —
 * WizardNav reads it before letting a tab click jump to another step, so an
 * edit made here and not yet saved is not silently lost under a click on
 * "3. ขอบเขตงาน" two tabs over. `clearDirty` runs in the same success
 * callback that already advances the step, since a save is exactly what
 * dirty is tracking the absence of.
 */
function useStepAction(action: (prev: ActionState, formData: FormData) => Promise<ActionState>, nextHref: string) {
  const router = useRouter()
  const { markDirty, clearDirty } = useWizardDirty()
  const [state, formAction] = useActionState<ActionState, FormData>(action, {})
  useActionToast(state, () => {
    clearDirty()
    router.push(nextHref)
  })
  return { state, formAction, markDirty }
}

export function RequirementsStepForm({
  projectId,
  intake,
  nextHref,
}: {
  projectId: string
  intake: ProjectIntake
  nextHref: string
}) {
  const { state, formAction, markDirty } = useStepAction(saveRequirements, nextHref)
  const r = intake.requirements

  return (
    <form action={formAction} className="work-form" onChange={markDirty}>
      <input type="hidden" name="projectId" value={projectId} />
      <label className="full">
        <span>โปรเจกต์นี้ทำเพื่ออะไร (เป้าหมาย)</span>
        <textarea name="goals" rows={2} defaultValue={r.goals ?? ''} />
      </label>
      <label className="full">
        <span>กลุ่มเป้าหมาย</span>
        <input name="targetAudience" defaultValue={r.targetAudience ?? ''} />
      </label>
      <label className="full">
        <span>ฟีเจอร์ที่ต้องการ (บรรทัดละ 1 รายการ)</span>
        <textarea name="requiredFeatures" rows={3} defaultValue={r.requiredFeatures.join('\n')} />
      </label>
      <label className="full">
        <span>หน้าที่ต้องการ (บรรทัดละ 1 รายการ)</span>
        <textarea name="requiredPages" rows={3} defaultValue={r.requiredPages.join('\n')} />
      </label>
      <label className="full">
        <span>ระบบที่ต้องเชื่อมต่อ (Integrations เช่น payment gateway, LINE, CRM)</span>
        <textarea name="integrations" rows={2} defaultValue={r.integrations.join('\n')} />
      </label>
      <label className="full">
        <span>ระบบยืนยันตัวตน (Authentication)</span>
        <input name="authentication" defaultValue={r.authentication ?? ''} placeholder="เช่น เข้าสู่ระบบด้วยอีเมล, Google, LINE" />
      </label>
      <label className="full">
        <span>ความต้องการฝั่งแอดมิน (Admin Requirements)</span>
        <textarea name="adminRequirements" rows={2} defaultValue={r.adminRequirements ?? ''} />
      </label>
      <label className="full">
        <span>ความต้องการฝั่งผู้ใช้งาน (User Requirements)</span>
        <textarea name="userRequirements" rows={2} defaultValue={r.userRequirements ?? ''} />
      </label>
      <label className="full">
        <span>ความต้องการด้านเทคนิค (Technical Requirements)</span>
        <textarea name="technicalRequirements" rows={2} defaultValue={r.technicalRequirements.join('\n')} />
      </label>
      <label className="full">
        <span>เทคโนโลยีที่ต้องการ (ถ้ามี)</span>
        <textarea name="technology" rows={2} defaultValue={r.technology.join('\n')} />
      </label>
      <label className="full">
        <span>เว็บไซต์อ้างอิง / ลิงก์ (บรรทัดละ 1 รายการ)</span>
        <textarea name="referenceLinks" rows={2} defaultValue={r.referenceLinks.join('\n')} />
      </label>
      <label className="full">
        <span>สไตล์การออกแบบที่ชอบ</span>
        <textarea name="designPreferences" rows={2} defaultValue={r.designPreferences ?? ''} />
      </label>
      <label>
        <span>สีแบรนด์ (บรรทัดละ 1 สี เช่น #409EFE)</span>
        <textarea name="brandColors" rows={2} defaultValue={r.brandColors.join('\n')} />
      </label>
      <label>
        <span>ฟอนต์ (บรรทัดละ 1 ฟอนต์)</span>
        <textarea name="fonts" rows={2} defaultValue={r.fonts.join('\n')} />
      </label>
      <label className="full">
        <span>ความพร้อมของเนื้อหา (ข้อความ/รูป มีพร้อมหรือยัง)</span>
        <textarea name="contentAvailability" rows={2} defaultValue={r.contentAvailability ?? ''} />
      </label>
      <label className="full">
        <span>ความต้องการเกี่ยวกับโดเมน</span>
        <input name="domainRequirements" defaultValue={r.domainRequirements ?? ''} />
      </label>
      <label className="full">
        <span>บันทึกเพิ่มเติม</span>
        <textarea name="notes" rows={2} defaultValue={r.notes ?? ''} />
      </label>
      {state.error && <p className="field-error">{state.error}</p>}
      <div className="form-actions">
        <SubmitButton pendingLabel="กำลังบันทึก...">บันทึกและถัดไป</SubmitButton>
      </div>
    </form>
  )
}

export function ScopeStepForm({
  projectId,
  features,
  nextHref,
}: {
  projectId: string
  features: ProjectFeature[]
  nextHref: string
}) {
  const { state, formAction, markDirty } = useStepAction(saveScope, nextHref)
  const existingNames = new Set(features.map((f) => f.name))

  return (
    <form action={formAction} className="work-form" onChange={markDirty}>
      <input type="hidden" name="projectId" value={projectId} />
      <div className="full scope-checklist">
        {SCOPE_PRESETS.map((item) => (
          <label key={item} className="checkbox">
            <input type="checkbox" name="items" value={item} defaultChecked={existingNames.has(item)} />
            <span>{item}</span>
          </label>
        ))}
      </div>
      <label className="full">
        <span>รายการเพิ่มเติม (บรรทัดละ 1 รายการ)</span>
        <textarea
          name="customItems"
          rows={2}
          defaultValue={features.map((f) => f.name).filter((n) => !SCOPE_PRESETS.includes(n)).join('\n')}
        />
      </label>
      {state.error && <p className="field-error">{state.error}</p>}
      <div className="form-actions">
        <SubmitButton pendingLabel="กำลังบันทึก...">บันทึกและถัดไป</SubmitButton>
      </div>
    </form>
  )
}

export function TimelineStepForm({
  projectId,
  intake,
  nextHref,
}: {
  projectId: string
  intake: ProjectIntake
  nextHref: string
}) {
  const { state, formAction, markDirty } = useStepAction(saveTimeline, nextHref)

  return (
    <form action={formAction} className="work-form" onChange={markDirty}>
      <input type="hidden" name="projectId" value={projectId} />
      <label>
        <span>วันที่ต้องการเริ่มงาน</span>
        <input type="date" name="requestedStartDate" defaultValue={intake.requestedStartDate ?? ''} />
      </label>
      <label>
        <span>วันที่ต้องการส่งมอบ</span>
        <input type="date" name="requestedDeadline" defaultValue={intake.requestedDeadline ?? ''} />
      </label>
      <label>
        <span>วันสำคัญที่ต้องเปิดตัว (ถ้ามี)</span>
        <input type="date" name="importantLaunchDate" defaultValue={intake.importantLaunchDate ?? ''} />
      </label>
      <label>
        <span>ระยะเวลาโดยประมาณ</span>
        <input name="requestedDuration" defaultValue={intake.requestedDuration ?? ''} placeholder="เช่น 2 เดือน" />
      </label>
      <label>
        <span>ความสำคัญ/ความเร่งด่วน</span>
        <select name="requestedPriority" defaultValue={intake.requestedPriority ?? 'NORMAL'}>
          <option value="LOW">ต่ำ</option>
          <option value="NORMAL">ปกติ</option>
          <option value="HIGH">สูง</option>
          <option value="URGENT">ด่วนมาก</option>
        </select>
      </label>
      <p className="muted full">
        วันที่นี้เป็นความต้องการเบื้องต้นของคุณ ทีมงานจะเสนอกำหนดเวลาจริงกลับมาหลังตรวจสอบ
        (ระบบจะไม่รับปากวันส่งมอบที่เป็นไปไม่ได้โดยอัตโนมัติ)
      </p>
      {state.error && <p className="field-error">{state.error}</p>}
      <div className="form-actions">
        <SubmitButton pendingLabel="กำลังบันทึก...">บันทึกและถัดไป</SubmitButton>
      </div>
    </form>
  )
}

export function BudgetStepForm({
  projectId,
  intake,
  nextHref,
}: {
  projectId: string
  intake: ProjectIntake
  nextHref: string
}) {
  const { state, formAction, markDirty } = useStepAction(saveBudget, nextHref)

  return (
    <form action={formAction} className="work-form" onChange={markDirty}>
      <input type="hidden" name="projectId" value={projectId} />
      <label>
        <span>งบประมาณต่ำสุด (บาท)</span>
        <input
          name="requestedBudgetMin"
          inputMode="decimal"
          defaultValue={intake.requestedBudgetMin !== null ? intake.requestedBudgetMin / 100 : ''}
        />
      </label>
      <label>
        <span>งบประมาณสูงสุด (บาท)</span>
        <input
          name="requestedBudgetMax"
          inputMode="decimal"
          defaultValue={intake.requestedBudgetMax !== null ? intake.requestedBudgetMax / 100 : ''}
        />
      </label>
      <label>
        <span>งบประมาณที่ต้องการจริง ๆ (บาท, ไม่บังคับ)</span>
        <input
          name="requestedBudgetPreferred"
          inputMode="decimal"
          defaultValue={intake.requestedBudgetPreferred !== null ? intake.requestedBudgetPreferred / 100 : ''}
        />
      </label>
      <label>
        <span>สกุลเงิน</span>
        <input name="requestedCurrency" defaultValue={intake.requestedCurrency} maxLength={3} style={{ textTransform: 'uppercase' }} />
      </label>
      {state.error && <p className="field-error">{state.error}</p>}
      <div className="form-actions">
        <SubmitButton pendingLabel="กำลังบันทึก...">บันทึกและถัดไป</SubmitButton>
      </div>
    </form>
  )
}

type ProposedMilestone = { name: string; percentageBp: number; dueDate: string | null }

function rowsForType(type: string): ProposedMilestone[] {
  if (type === 'FULL_PAYMENT') return [{ name: 'ชำระเต็มจำนวน', percentageBp: 10000, dueDate: null }]
  if (type === 'DEPOSIT_FINAL')
    return [
      { name: 'มัดจำ', percentageBp: 3000, dueDate: null },
      { name: 'ชำระส่วนที่เหลือ', percentageBp: 7000, dueDate: null },
    ]
  return [
    { name: 'งวดที่ 1', percentageBp: 3334, dueDate: null },
    { name: 'งวดที่ 2', percentageBp: 3333, dueDate: null },
    { name: 'งวดที่ 3', percentageBp: 3333, dueDate: null },
  ]
}

export function PaymentProposalStepForm({
  projectId,
  intake,
  nextHref,
}: {
  projectId: string
  intake: ProjectIntake
  nextHref: string
}) {
  const { state, formAction, markDirty } = useStepAction(savePaymentProposal, nextHref)
  const [type, setType] = useState(intake.requestedPaymentPlan?.type ?? 'DEPOSIT_FINAL')
  const [rows, setRows] = useState<ProposedMilestone[]>(
    intake.requestedPaymentPlan?.milestones ?? rowsForType(intake.requestedPaymentPlan?.type ?? 'DEPOSIT_FINAL'),
  )
  const [notes, setNotes] = useState(intake.requestedPaymentPlan?.notes ?? '')

  // WHAT THE ESTIMATE IS COMPUTED FROM.
  //
  // The client's OWN preferred budget from step 5, never `projects.total_amount`.
  // That column is the pricing-derived OFFICIAL total (migrations 0019/0023):
  // during intake no pricing item exists yet so it is 0 — which is why this
  // column read '—' even after the client had entered a budget — and once
  // staff do price the project it becomes the AGENCY's figure, which has no
  // business appearing inside the client's own proposal.
  //
  // Deliberately NOT derived from requestedBudgetMin/Max. A range is not an
  // offer, and inventing a number the client never typed would put words in
  // their mouth on a screen whose entire purpose is recording what they asked
  // for. No preferred budget => '—'.
  const estimateBasis = intake.requestedBudgetPreferred
  const estimateCurrency = intake.requestedCurrency

  // Satang in, satang out. `percentageBp` is basis points, so this divides by
  // 10 000 and rounds ONCE, per row — the same integer-only shape the rest of
  // the money code uses. No floating-point baht ever exists here.
  const rowEstimate = (percentageBp: number) =>
    estimateBasis === null ? null : Math.round((estimateBasis * percentageBp) / 10000)

  // The sum of what is actually DISPLAYED, not the raw budget. If percentages
  // do not total 100% the difference stays visible instead of being hidden by
  // showing the budget back — the existing schema validation is what refuses
  // the submit (paymentProposalSchema, sum must be exactly 10000bp), and this
  // must not silently normalise around it.
  const estimatedTotal =
    estimateBasis === null
      ? null
      : rows.reduce((total, row) => total + (rowEstimate(row.percentageBp) ?? 0), 0)

  function changeType(next: string) {
    setType(next)
    if (next !== 'CUSTOM') setRows(rowsForType(next))
  }

  const TYPE_LABELS: Record<string, string> = {
    FULL_PAYMENT: 'จ่ายเต็มจำนวน',
    DEPOSIT_FINAL: 'มัดจำ + ส่วนที่เหลือ',
    INSTALLMENT: 'ผ่อนหลายงวด',
    CUSTOM: 'กำหนดเอง / ขอพูดคุยกับทีมงาน',
  }

  return (
    <form action={formAction} className="work-form" onChange={markDirty}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="milestonesJson" value={JSON.stringify(rows)} />

      <label>
        <span>รูปแบบการชำระเงินที่เสนอ</span>
        <select name="type" value={type} onChange={(event) => changeType(event.target.value)}>
          {PAYMENT_PLAN_TYPES.filter((t) => t !== 'MILESTONE').map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t] ?? t}
            </option>
          ))}
        </select>
      </label>

      {type === 'CUSTOM' ? (
        <label className="full">
          <span>รายละเอียดที่ต้องการพูดคุย</span>
          <textarea
            name="notes"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="เช่น อยากคุยเรื่องแผนการชำระเงินที่ยืดหยุ่นกว่านี้"
          />
        </label>
      ) : (
      <div className="full table-wrap">
        <table>
          <thead>
            <tr>
              <th>งวด</th>
              <th>สัดส่วน (%)</th>
              <th>จำนวนเงินโดยประมาณ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <td>
                  <input
                    value={row.name}
                    onChange={(event) => {
                      const next = [...rows]
                      next[index] = { ...row, name: event.target.value }
                      setRows(next)
                    }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={row.percentageBp / 100}
                    onChange={(event) => {
                      const next = [...rows]
                      next[index] = { ...row, percentageBp: Math.round(Number(event.target.value) * 100) }
                      setRows(next)
                    }}
                  />
                </td>
                <td className="muted">
                  {rowEstimate(row.percentageBp) === null
                    ? '—'
                    : `ประมาณ ${formatMoney(rowEstimate(row.percentageBp) as number, estimateCurrency)}`}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={2}>รวมโดยประมาณ</th>
              <td className="muted">
                {estimatedTotal === null ? '—' : formatMoney(estimatedTotal, estimateCurrency)}
              </td>
            </tr>
          </tfoot>
        </table>
        {estimateBasis === null && (
          <p className="muted">
            กรอก &ldquo;งบประมาณที่ต้องการจริง ๆ&rdquo; ในขั้นตอนงบประมาณ เพื่อให้ระบบคำนวณจำนวนเงินโดยประมาณให้
          </p>
        )}
      </div>
      )}
      {type !== 'CUSTOM' && <input type="hidden" name="notes" value="" />}
      <p className="muted full">
        จำนวนเงินโดยประมาณคำนวณจากงบประมาณที่คุณกรอกไว้เท่านั้น ยังไม่ใช่ราคาที่ตกลงกันแล้ว
        นี่คือข้อเสนอเบื้องต้นของคุณ ทีมงานจะพิจารณาและอาจเสนอแผนที่ต่างออกไป
        โดยจะแสดงให้เปรียบเทียบก่อนคุณยืนยันแผนสุดท้าย
      </p>
      {state.error && <p className="field-error">{state.error}</p>}
      <div className="form-actions">
        <SubmitButton pendingLabel="กำลังบันทึก...">บันทึกและถัดไป</SubmitButton>
      </div>
    </form>
  )
}

export function DeliveryStepForm({
  projectId,
  intake,
  nextHref,
}: {
  projectId: string
  intake: ProjectIntake
  nextHref: string
}) {
  const { state, formAction, markDirty } = useStepAction(saveDeliveryRequest, nextHref)

  return (
    <form action={formAction} className="work-form" onChange={markDirty}>
      <input type="hidden" name="projectId" value={projectId} />
      <div className="full scope-checklist">
        {DELIVERY_ITEM_KEYS.map((key) => (
          <label key={key} className="checkbox">
            <input type="checkbox" name="items" value={key} defaultChecked={intake.requestedDelivery.includes(key)} />
            <span>{DELIVERY_ITEM_LABELS[key]}</span>
          </label>
        ))}
      </div>
      <label className="full">
        <span>รายการอื่น ๆ ที่ต้องการให้ส่งมอบ (บรรทัดละ 1 รายการ)</span>
        <textarea
          name="customDeliverables"
          rows={2}
          defaultValue={intake.requestedDeliveryCustom.join('\n')}
        />
      </label>
      {state.error && <p className="field-error">{state.error}</p>}
      <div className="form-actions">
        <SubmitButton pendingLabel="กำลังบันทึก...">บันทึกและถัดไป</SubmitButton>
      </div>
    </form>
  )
}

export function BrandStepForm({
  projectId,
  assets,
  nextHref,
}: {
  projectId: string
  assets: ProjectAsset[]
  nextHref: string
}) {
  const router = useRouter()
  const { dirty, markDirty, clearDirty } = useWizardDirty()
  const [uploadState, uploadAction] = useActionState<ActionState, FormData>(uploadProjectAsset, {})
  useActionToast(uploadState, clearDirty)
  const [linkState, linkAction] = useActionState<ActionState, FormData>(addProjectAssetLink, {})
  useActionToast(linkState, clearDirty)
  const [removeState, removeAction] = useActionState<ActionState, FormData>(removeProjectAsset, {})
  useActionToast(removeState)
  const [showLink, setShowLink] = useState(false)

  // Unlike every other step, "ถัดไป" here does not save anything itself — the
  // upload and link forms above it do, on their own submit. A file picked or a
  // name typed and then "ถัดไป" clicked instead of "อัปโหลดไฟล์"/"เพิ่มลิงก์"
  // used to discard it with no warning. `dirty` is the same shared flag
  // WizardNav guards its own tab clicks with — one signal, two places it can
  // stop you leaving. Arm-then-confirm on the button itself, the same
  // convention MemberRemoveButton uses instead of window.confirm() (see that
  // file) — one click warns and arms, a second within the window actually
  // leaves the step.
  const [armed, setArmed] = useState(false)

  function handleNext() {
    if (dirty && !armed) {
      toast.warning('มีข้อมูลที่กรอกไว้แต่ยังไม่ได้บันทึก กด "ถัดไป" อีกครั้งเพื่อไปต่อโดยไม่บันทึก')
      setArmed(true)
      window.setTimeout(() => setArmed(false), 4000)
      return
    }
    clearDirty()
    router.push(nextHref)
  }

  return (
    <div className="work-form">
      {assets.length > 0 && (
        <div className="full table-wrap">
          <table>
            <thead>
              <tr>
                <th />
                <th>ประเภท</th>
                <th>ชื่อ</th>
                <th>สถานะตรวจสอบ</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id}>
                  <td>
                    <AssetThumbnail asset={asset} />
                  </td>
                  <td>{PROJECT_ASSET_KIND_LABELS[asset.kind] ?? asset.kind}</td>
                  <td>
                    {asset.hasFile ? (
                      <a href={`/work/api/assets/${asset.id}/download`} target="_blank" rel="noreferrer">
                        {asset.name}
                      </a>
                    ) : (
                      <a href={asset.externalUrl ?? '#'} target="_blank" rel="noreferrer">
                        {asset.name}
                      </a>
                    )}
                  </td>
                  <td>
                    <Status tone={assetReviewStatusTone(asset.reviewStatus)}>
                      {PROJECT_ASSET_REVIEW_STATUS_LABELS[asset.reviewStatus]}
                    </Status>
                    {asset.reviewNote && <div className="muted">{asset.reviewNote}</div>}
                  </td>
                  <td>
                    <form action={removeAction}>
                      <input type="hidden" name="projectId" value={projectId} />
                      <input type="hidden" name="assetId" value={asset.id} />
                      <button type="submit" className="text-btn danger">
                        ลบ
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form
        action={uploadAction}
        className="work-form"
        style={{ gridColumn: '1 / -1' }}
        onChange={markDirty}
      >
        <input type="hidden" name="projectId" value={projectId} />
        <label>
          <span>ประเภทไฟล์</span>
          <select name="kind" defaultValue="LOGO">
            {PROJECT_ASSET_KINDS.filter((k) => k !== 'REFERENCE').map((k) => (
              <option key={k} value={k}>
                {PROJECT_ASSET_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>ชื่อไฟล์</span>
          <input name="name" required maxLength={200} placeholder="เช่น โลโก้หลัก" />
        </label>
        <label className="full">
          <span>ไฟล์ (PNG / JPG / WEBP / SVG / PDF / ฟอนต์ — สูงสุด 10MB)</span>
          <input type="file" name="file" required />
        </label>
        <div className="form-actions">
          <SubmitButton variant="outline" pendingLabel="กำลังอัปโหลด...">
            อัปโหลดไฟล์
          </SubmitButton>
        </div>
      </form>

      {!showLink ? (
        <button type="button" className="text-btn" onClick={() => setShowLink(true)}>
          + เพิ่มลิงก์เว็บไซต์อ้างอิง
        </button>
      ) : (
        <form
          action={linkAction}
          className="work-form"
          style={{ gridColumn: '1 / -1' }}
          onChange={markDirty}
        >
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="kind" value="REFERENCE" />
          <label>
            <span>ชื่อ</span>
            <input name="name" required maxLength={200} placeholder="เช่น เว็บไซต์ที่ชอบสไตล์" />
          </label>
          <label>
            <span>ลิงก์</span>
            <input name="externalUrl" required type="url" placeholder="https://" />
          </label>
          <div className="form-actions">
            <SubmitButton variant="outline" pendingLabel="กำลังเพิ่ม...">
              เพิ่มลิงก์
            </SubmitButton>
          </div>
        </form>
      )}

      <div className="form-actions full">
        <button type="button" className={`primary${armed ? ' armed' : ''}`} onClick={handleNext}>
          {armed ? 'ไปต่อโดยไม่บันทึก?' : 'ถัดไป'}
        </button>
      </div>
    </div>
  )
}
