'use client'

import { useActionState, useState } from 'react'

import { Panel, PanelHead } from '@/components/work/data/panel'
import { Status } from '@/components/work/data/status'
import { SubmitButton, useActionToast } from '@/components/work/forms'
import { AGREEMENT_STATUS_LABELS, formatDateTime, formatMoney } from '@/lib/work/format'
import {
  sendAgreement,
  acceptAgreement,
  requestQuotationChanges,
  type AgreementActionState,
} from '@/lib/work/services/agreements'
import type { Agreement } from '@/lib/work/queries/agreements'

/**
 * The structured pricing/VAT breakdown a quotation version carries
 * (migration 0029) — null on any version sent before that migration, in
 * which case only the grand total is known and this renders nothing rather
 * than a fabricated ฿0 breakdown.
 */
function QuotationBreakdown({ version }: { version: NonNullable<Agreement['currentVersion']> }) {
  if (version.subtotal === null) return null

  return (
    <div className="pricing-totals">
      <span>ยอดก่อนส่วนลด {formatMoney(version.subtotal, version.currency)}</span>
      {(version.discountTotal ?? 0) > 0 && (
        <span>ส่วนลด -{formatMoney(version.discountTotal, version.currency)}</span>
      )}
      {version.vatEnabled && (
        <span>
          VAT {((version.vatRateBp ?? 0) / 100).toFixed(0)}% {formatMoney(version.vatAmount, version.currency)}
        </span>
      )}
      <strong>ยอดสุทธิ {formatMoney(version.totalAmount, version.currency)}</strong>
    </div>
  )
}

/**
 * Send / re-send the quotation-as-agreement. Staff-only (finance), never
 * rendered for a client — mirrors `agreements_insert_finance` /
 * `agreements_update_finance`.
 */
export function SendAgreementForm({
  projectId,
  agreement,
  defaultBody,
}: {
  projectId: string
  agreement: Agreement | null
  defaultBody: string
}) {
  const [state, formAction] = useActionState<AgreementActionState, FormData>(sendAgreement, {})
  useActionToast(state)
  const [body, setBody] = useState(agreement?.currentVersion?.body ?? defaultBody)

  return (
    <Panel className="projects-panel">
      <PanelHead
        title="ใบเสนอราคา"
        description={
          agreement
            ? `สถานะ: ${AGREEMENT_STATUS_LABELS[agreement.status]}${
                agreement.currentVersion
                  ? ` · เวอร์ชัน ${agreement.currentVersion.version}${
                      agreement.currentVersion.quotationNumber
                        ? ` · ${agreement.currentVersion.quotationNumber}`
                        : ''
                    }`
                  : ''
              }`
            : 'ยังไม่เคยส่งใบเสนอราคา'
        }
      />

      {agreement?.currentVersion && <QuotationBreakdown version={agreement.currentVersion} />}

      {agreement?.acceptance && (
        <p className="muted">
          ยืนยันโดย {agreement.acceptance.acceptedName} ({agreement.acceptance.acceptedEmail}) เมื่อ{' '}
          {formatDateTime(agreement.acceptance.acceptedAt)}
        </p>
      )}

      <form action={formAction} className="work-form">
        <input type="hidden" name="projectId" value={projectId} />
        <label className="full">
          <span>เนื้อหาใบเสนอราคา</span>
          <textarea name="body" rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
        <div className="form-actions">
          <SubmitButton pendingLabel="กำลังส่ง...">
            {agreement?.currentVersion ? 'ส่งเวอร์ชันใหม่' : 'ส่งใบเสนอราคา'}
          </SubmitButton>
        </div>
      </form>
    </Panel>
  )
}

/**
 * The client's view: read the current terms, confirm them.
 *
 * `requireProjectAccess` in the action re-derives everything this needs to
 * check — this component trusts nothing about who is looking beyond what the
 * server already resolved to render it.
 */
export function AgreementConfirmPanel({ projectId, agreement }: { projectId: string; agreement: Agreement }) {
  const [state, formAction] = useActionState<AgreementActionState, FormData>(acceptAgreement, {})
  useActionToast(state)
  const [changesState, changesAction] = useActionState<AgreementActionState, FormData>(
    requestQuotationChanges,
    {},
  )
  useActionToast(changesState)
  const [showChanges, setShowChanges] = useState(false)
  const [note, setNote] = useState('')

  if (!agreement.currentVersion) return null

  const alreadyAccepted = agreement.status === 'ACCEPTED'

  return (
    <Panel className="projects-panel">
      <PanelHead
        title="ใบเสนอราคา"
        description={`เวอร์ชัน ${agreement.currentVersion.version}${
          agreement.currentVersion.quotationNumber ? ` · ${agreement.currentVersion.quotationNumber}` : ''
        }`}
        action={
          <Status tone={alreadyAccepted ? 'green' : 'orange'}>{AGREEMENT_STATUS_LABELS[agreement.status]}</Status>
        }
      />

      <p className="agreement-body">{agreement.currentVersion.body}</p>

      <QuotationBreakdown version={agreement.currentVersion} />

      {alreadyAccepted ? (
        agreement.acceptance && (
          <p className="muted">
            ยืนยันโดย {agreement.acceptance.acceptedName} เมื่อ {formatDateTime(agreement.acceptance.acceptedAt)}
          </p>
        )
      ) : (
        <>
          <form action={formAction} className="work-form">
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="versionId" value={agreement.currentVersion.id} />
            <label className="full">
              <span>ชื่อผู้ยืนยัน</span>
              <input name="name" required maxLength={200} placeholder="ชื่อ-นามสกุล" />
            </label>
            <div className="form-actions">
              <SubmitButton pendingLabel="กำลังยืนยัน...">ยืนยันใบเสนอราคา</SubmitButton>
            </div>
          </form>

          {!showChanges ? (
            <button type="button" className="text-btn" onClick={() => setShowChanges(true)}>
              ขอแก้ไขใบเสนอราคา
            </button>
          ) : (
            <form action={changesAction} className="work-form">
              <input type="hidden" name="projectId" value={projectId} />
              <label className="full">
                <span>สิ่งที่ต้องการให้แก้ไข (ไม่บังคับ)</span>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="เช่น ต้องการปรับลดขอบเขตงานบางส่วน"
                />
              </label>
              <input type="hidden" name="note" value={note} />
              <div className="form-actions">
                <SubmitButton variant="outline" pendingLabel="กำลังส่ง...">
                  ส่งคำขอแก้ไข
                </SubmitButton>
              </div>
            </form>
          )}
        </>
      )}
    </Panel>
  )
}
