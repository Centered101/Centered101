'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

import { formatMoney } from '@/lib/work/format'
import { PRICING_ITEM_KINDS, type PricingItemKind } from '@/lib/work/types/enums'

const KIND_LABELS: Record<PricingItemKind, string> = {
  LINE_ITEM: 'รายการ',
  ADDON: 'เพิ่มเติม',
  DISCOUNT: 'ส่วนลด',
}

type DraftItem = {
  key: string
  kind: PricingItemKind
  name: string
  quantity: string
  unitAmount: string
}

function emptyRow(): DraftItem {
  return { key: crypto.randomUUID(), kind: 'LINE_ITEM', name: '', quantity: '1', unitAmount: '' }
}

/**
 * Optional pricing rows added while CREATING a project.
 *
 * Purely a local draft — nothing here talks to Supabase. It serialises the
 * list into one hidden `pricingItemsJson` field for the surrounding
 * `<form action={createProject}>` to submit, and `draftPricingItemsSchema`
 * (lib/work/validation/pricing.ts) parses it server-side exactly like every
 * other field on that form. Only rendered for staff who hold `finance:write`
 * — the RLS policy behind the insert (`pricing_insert_finance`, migration
 * 0007) would refuse anyone else's rows anyway, and a form nobody can submit
 * successfully should not be shown at all.
 */
export function PricingItemsFieldset() {
  const [rows, setRows] = useState<DraftItem[]>([])

  const totals = rows.reduce(
    (acc, row) => {
      const qty = Number(row.quantity) || 0
      const unit = Number(row.unitAmount) || 0
      const lineTotal = qty * unit
      if (row.kind === 'DISCOUNT') acc.discount += lineTotal
      else acc.subtotal += lineTotal
      return acc
    },
    { subtotal: 0, discount: 0 },
  )
  const total = Math.max(totals.subtotal - totals.discount, 0)

  const payload = rows
    .filter((row) => row.name.trim() && Number(row.unitAmount) >= 0)
    .map((row) => ({
      kind: row.kind,
      name: row.name.trim(),
      quantity: Number(row.quantity) || 1,
      unitAmount: Number(row.unitAmount) || 0,
    }))

  return (
    <div className="pricing-fieldset full">
      <input type="hidden" name="pricingItemsJson" value={JSON.stringify(payload)} />

      <div className="pricing-fieldset-head">
        <span>รายการราคา (ไม่บังคับ — เพิ่มทีหลังได้)</span>
        <button type="button" className="outline" onClick={() => setRows((r) => [...r, emptyRow()])}>
          <Plus size={15} />
          เพิ่มรายการ
        </button>
      </div>

      {rows.length > 0 && (
        <div className="pricing-fieldset-rows">
          {rows.map((row) => (
            <div className="pricing-fieldset-row" key={row.key}>
              <select
                aria-label="ประเภทรายการ"
                value={row.kind}
                onChange={(e) =>
                  setRows((r) =>
                    r.map((x) => (x.key === row.key ? { ...x, kind: e.target.value as PricingItemKind } : x)),
                  )
                }
              >
                {PRICING_ITEM_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {KIND_LABELS[kind]}
                  </option>
                ))}
              </select>
              <input
                aria-label="ชื่อรายการ"
                placeholder="ชื่อรายการ"
                value={row.name}
                onChange={(e) =>
                  setRows((r) => r.map((x) => (x.key === row.key ? { ...x, name: e.target.value } : x)))
                }
              />
              <input
                aria-label="จำนวน"
                type="number"
                min={1}
                placeholder="จำนวน"
                value={row.quantity}
                onChange={(e) =>
                  setRows((r) => r.map((x) => (x.key === row.key ? { ...x, quantity: e.target.value } : x)))
                }
              />
              <input
                aria-label="ราคาต่อหน่วย (บาท)"
                type="number"
                min={0}
                placeholder="ราคาต่อหน่วย (บาท)"
                value={row.unitAmount}
                onChange={(e) =>
                  setRows((r) => r.map((x) => (x.key === row.key ? { ...x, unitAmount: e.target.value } : x)))
                }
              />
              <button
                type="button"
                className="icon-button"
                aria-label="ลบรายการ"
                onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <div className="pricing-fieldset-totals">
          <span>ยอดรวม {formatMoney(totals.subtotal * 100, 'THB')}</span>
          {totals.discount > 0 && <span>ส่วนลด -{formatMoney(totals.discount * 100, 'THB')}</span>}
          <strong>รวมสุทธิ {formatMoney(total * 100, 'THB')}</strong>
        </div>
      )}
    </div>
  )
}
