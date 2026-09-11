'use client'

import { useActionState, useState } from 'react'

import { GearIcon } from '@/components/work/data/gear-icon'
import { Panel, PanelHead } from '@/components/work/data/panel'
import { EmptyState } from '@/components/work/states'
import { SubmitButton, useActionToast } from '@/components/work/forms'
import { formatMoney } from '@/lib/work/format'
import {
  addPricingItem,
  removePricingItem,
  updateVatSettings,
  type PricingActionState,
} from '@/lib/work/services/pricing'
import { PRICING_ITEM_KINDS, type PricingItemKind } from '@/lib/work/types/enums'
import type { PricingItem, PricingTotals } from '@/lib/work/queries/pricing'

const KIND_LABELS: Record<PricingItemKind, string> = {
  LINE_ITEM: 'รายการ',
  ADDON: 'เพิ่มเติม',
  DISCOUNT: 'ส่วนลด',
}

/**
 * Itemised pricing for one project.
 *
 * Read-only for anyone who can read the project at all (staff, and the
 * client this project belongs to — `pricing_select` has no staff-only
 * restriction, see migration 0007). The add/remove controls below render
 * only for `canManageFinance` — a developer or a client sees the same
 * numbers with no button that would fail against RLS if pressed.
 *
 * `projects.total_amount` is never written from here: every insert/delete
 * fires the database trigger from migration 0019, which recomputes it. This
 * panel only ever shows what that trigger already computed.
 */
export function PricingPanel({
  projectId,
  items,
  totals,
  canManageFinance,
}: {
  projectId: string
  items: PricingItem[]
  totals: PricingTotals
  canManageFinance: boolean
}) {
  return (
    <Panel className="projects-panel">
      <PanelHead title="รายการราคา" description="ยอดรวมโปรเจกต์คำนวณจากรายการด้านล่าง" />

      {items.length === 0 ? (
        <EmptyState title="ยังไม่มีรายการราคา" description="เพิ่มรายการเพื่อกำหนดมูลค่าโปรเจกต์" />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ประเภท</th>
                <th>รายการ</th>
                <th>จำนวน</th>
                <th>ราคาต่อหน่วย</th>
                <th>รวม</th>
                {canManageFinance && <th></th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <PricingItemRow key={item.id} projectId={projectId} item={item} canManageFinance={canManageFinance} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="pricing-totals">
        <span>ยอดรวม {formatMoney(totals.subtotal, totals.currency)}</span>
        {totals.discountTotal > 0 && (
          <span>ส่วนลด -{formatMoney(totals.discountTotal, totals.currency)}</span>
        )}
        {totals.vatEnabled && (
          <span>
            VAT {(totals.vatRateBp / 100).toFixed(0)}% {formatMoney(totals.vatAmount, totals.currency)}
          </span>
        )}
        <strong>รวมสุทธิ {formatMoney(totals.grandTotal, totals.currency)}</strong>
      </div>

      {canManageFinance && <VatSettingsForm projectId={projectId} totals={totals} />}
      {canManageFinance && <AddPricingItemForm projectId={projectId} />}
    </Panel>
  )
}

/**
 * VAT toggle + rate — `projects.vat_enabled` / `vat_rate_bp`. One project-wide
 * setting, not per line item (migration 0019's own reasoning): VAT applies to
 * the whole invoice or not at all.
 *
 * Radio choice, not a bare checkbox — "not applicable" and "apply VAT" are
 * presented as two equally deliberate options, and the rate field only
 * appears once VAT is actually chosen, so there is nothing to fill in for
 * the (more common, for a small studio) not-VAT-registered case.
 *
 * THE DISCLAIMER BELOW IS LOAD-BEARING, NOT DECORATION: this system must
 * never present itself as tax advice. Whether a given engagement should
 * charge VAT depends on the service provider's own registration status and
 * the applicable Thai tax rules — a decision for the business, not this
 * form — so the copy says that explicitly rather than implying "VAT on"
 * is somehow the correct or default choice.
 */
function VatSettingsForm({ projectId, totals }: { projectId: string; totals: PricingTotals }) {
  const [state, formAction] = useActionState<PricingActionState, FormData>(updateVatSettings, {})
  useActionToast(state)
  const [vatEnabled, setVatEnabled] = useState(totals.vatEnabled)

  return (
    <form action={formAction} className="work-form vat-settings-form">
      <input type="hidden" name="projectId" value={projectId} />

      <fieldset className="vat-choice">
        <legend>VAT</legend>
        <label className="radio">
          <input
            type="radio"
            name="vatEnabled"
            value="off"
            checked={!vatEnabled}
            onChange={() => setVatEnabled(false)}
          />
          <GearIcon />
          <span>ไม่คิด VAT</span>
        </label>
        <label className="radio">
          <input
            type="radio"
            name="vatEnabled"
            value="on"
            checked={vatEnabled}
            onChange={() => setVatEnabled(true)}
          />
          <GearIcon />
          <span>คิด VAT</span>
        </label>
      </fieldset>

      {vatEnabled && (
        <label>
          <span>อัตรา VAT (%)</span>
          <input
            name="vatRatePercent"
            type="number"
            min={0}
            max={100}
            step="0.01"
            defaultValue={totals.vatRateBp / 100 || 7}
          />
        </label>
      )}

      <SubmitButton variant="outline" pendingLabel="กำลังบันทึก...">
        บันทึกการตั้งค่า VAT
      </SubmitButton>

      <p className="muted vat-disclaimer">
        เพราะไม่ใช่ทุกกรณีที่ควรเรียกเก็บ VAT — โปรดอัตโนมัติระบบไม่ได้ตัดสินแทนคุณ
        การตั้งค่านี้ขึ้นอยู่กับสถานะ/การจดทะเบียนภาษีจริงของผู้ให้บริการส่วนคุณเป็นผู้ประกอบการจด VAT
        และรายการนั้นอยู่ในข่าย VAT อัตราปัจจุบันคือ 7% ตามข้อมูลกรมสรรพากร
        (อัตราลดหย่อนขยายเวลาถึง 30 กันยายน 2570) — ระบบนี้ไม่ใช่คำแนะนำทางกฎหมายหรือภาษี
        โปรดตรวจสอบกับผู้เชี่ยวชาญด้านภาษีของคุณ
      </p>
    </form>
  )
}

function PricingItemRow({
  projectId,
  item,
  canManageFinance,
}: {
  projectId: string
  item: PricingItem
  canManageFinance: boolean
}) {
  const [state, formAction] = useActionState<PricingActionState, FormData>(removePricingItem, {})
  useActionToast(state)

  return (
    <tr>
      <td>{KIND_LABELS[item.kind]}</td>
      <td>{item.name}</td>
      <td>{item.quantity}</td>
      <td>{formatMoney(item.unitAmount, 'THB')}</td>
      <td>{item.kind === 'DISCOUNT' ? '-' : ''}{formatMoney(item.amount, 'THB')}</td>
      {canManageFinance && (
        <td>
          <form action={formAction}>
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="itemId" value={item.id} />
            <SubmitButton variant="outline" pendingLabel="กำลังลบ...">
              ลบ
            </SubmitButton>
          </form>
        </td>
      )}
    </tr>
  )
}

function AddPricingItemForm({ projectId }: { projectId: string }) {
  const [state, formAction] = useActionState<PricingActionState, FormData>(addPricingItem, {})
  useActionToast(state)

  return (
    <form action={formAction} className="work-form">
      <input type="hidden" name="projectId" value={projectId} />

      <label>
        <span>ประเภท</span>
        <select name="kind" defaultValue="LINE_ITEM">
          {PRICING_ITEM_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {KIND_LABELS[kind]}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>ชื่อรายการ</span>
        <input name="name" required maxLength={200} placeholder="เช่น พัฒนาเว็บไซต์" />
        {state.fieldErrors?.name && <small className="field-error">{state.fieldErrors.name}</small>}
      </label>

      <label>
        <span>จำนวน</span>
        <input name="quantity" type="number" min={1} defaultValue={1} />
        {state.fieldErrors?.quantity && (
          <small className="field-error">{state.fieldErrors.quantity}</small>
        )}
      </label>

      <label>
        <span>ราคาต่อหน่วย (บาท)</span>
        <input name="unitAmount" required inputMode="decimal" placeholder="30000" />
        {state.fieldErrors?.unitAmount && (
          <small className="field-error">{state.fieldErrors.unitAmount}</small>
        )}
      </label>

      <div className="form-actions">
        <SubmitButton pendingLabel="กำลังเพิ่ม...">เพิ่มรายการ</SubmitButton>
      </div>
    </form>
  )
}
