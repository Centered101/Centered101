'use client'

import { useActionState } from 'react'
import { Globe, Link2, Package, ShieldCheck } from 'lucide-react'

import { Status } from '@/components/work/data/status'
import { SubmitButton, useActionToast } from '@/components/work/forms'
import { formatDateTime } from '@/lib/work/format'
import type { DocumentListItem } from '@/lib/work/queries/documents'
import type { ProjectPublishing } from '@/lib/work/queries/publishing'
import {
  attachSourceCode,
  publishProject,
  savePublishing,
  unpublishProject,
} from '@/lib/work/services/publishing'
import type { PublishingActionState } from '@/lib/work/services/publishing'

/**
 * Staff publishing controls.
 *
 * Nothing on this screen decides authorization. Every action re-checks
 * `requireProjectManage` server-side and `project_publishing`'s policies check
 * it again underneath — the buttons only decide what is worth offering. An
 * accountant reaching this page sees the controls and is refused by the
 * action, with a real message rather than a silent no-op.
 */
export function PublishingPanel({
  projectId,
  publishing,
  attachableDocuments,
}: {
  projectId: string
  publishing: ProjectPublishing
  attachableDocuments: DocumentListItem[]
}) {
  return (
    <div className="publishing-panel">
      <PublishingState projectId={projectId} publishing={publishing} />
      <PublishingForm projectId={projectId} publishing={publishing} />
      <SourceCodeForm
        projectId={projectId}
        publishing={publishing}
        attachableDocuments={attachableDocuments}
      />
    </div>
  )
}

function PublishingState({
  projectId,
  publishing,
}: {
  projectId: string
  publishing: ProjectPublishing
}) {
  const [publishState, publishAction] = useActionState<PublishingActionState, FormData>(
    publishProject,
    {},
  )
  const [unpublishState, unpublishAction] = useActionState<PublishingActionState, FormData>(
    unpublishProject,
    {},
  )
  useActionToast(publishState)
  useActionToast(unpublishState)

  return (
    <div className="publishing-state">
      <div className="ownership-rows">
        <div>
          <span>สถานะการเผยแพร่</span>
          <strong>
            <Status tone={publishing.isPublished ? 'green' : 'orange'}>
              {publishing.isPublished ? 'เผยแพร่แล้ว' : 'ยังไม่เผยแพร่'}
            </Status>
          </strong>
        </div>
        <div>
          <span>เผยแพร่เมื่อ</span>
          <strong>{publishing.publishedAt ? formatDateTime(publishing.publishedAt) : '—'}</strong>
        </div>
        <div>
          <span>Production URL</span>
          <strong>
            {publishing.productionUrl ? (
              <a href={publishing.productionUrl} target="_blank" rel="noreferrer noopener">
                {publishing.productionUrl}
              </a>
            ) : (
              '—'
            )}
          </strong>
        </div>
        <div>
          <span>HTTPS</span>
          <strong>
            {publishing.productionUrl
              ? publishing.productionIsHttps
                ? 'ใช้ HTTPS'
                : 'ไม่ใช่ HTTPS'
              : '—'}
          </strong>
        </div>
      </div>

      {/* Says what it actually knows. Nothing here validates a certificate, so
          nothing here claims one is valid. */}
      <p className="muted">
        <ShieldCheck size={13} /> สถานะ HTTPS อ่านจากลิงก์ที่บันทึกไว้เท่านั้น
        ระบบไม่ได้ตรวจสอบใบรับรอง SSL จริง
      </p>

      <div className="form-actions">
        {publishing.isPublished ? (
          <form action={unpublishAction} className="inline-form">
            <input type="hidden" name="projectId" value={projectId} />
            <SubmitButton variant="outline" pendingLabel="กำลังยกเลิก...">
              ยกเลิกการเผยแพร่
            </SubmitButton>
          </form>
        ) : (
          <form action={publishAction} className="inline-form">
            <input type="hidden" name="projectId" value={projectId} />
            <SubmitButton pendingLabel="กำลังเผยแพร่...">
              <Globe size={14} /> เผยแพร่โปรเจกต์
            </SubmitButton>
          </form>
        )}
      </div>
    </div>
  )
}

function PublishingForm({
  projectId,
  publishing,
}: {
  projectId: string
  publishing: ProjectPublishing
}) {
  const [state, formAction] = useActionState<PublishingActionState, FormData>(savePublishing, {})
  useActionToast(state)

  return (
    <form action={formAction} className="work-form">
      <input type="hidden" name="projectId" value={projectId} />

      <label className="full">
        <span>
          <Link2 size={13} /> Repository URL
        </span>
        <input
          name="repositoryUrl"
          defaultValue={publishing.repositoryUrl ?? ''}
          placeholder="https://github.com/org/repo"
          maxLength={500}
        />
        {state.fieldErrors?.repositoryUrl && (
          <small className="field-error">{state.fieldErrors.repositoryUrl}</small>
        )}
      </label>

      <label>
        <span>Branch</span>
        <input
          name="repositoryBranch"
          defaultValue={publishing.repositoryBranch ?? ''}
          placeholder="main"
          maxLength={120}
        />
      </label>

      <label>
        <span>Commit SHA</span>
        <input
          name="repositoryCommitSha"
          defaultValue={publishing.repositoryCommitSha ?? ''}
          placeholder="a1b2c3d"
          maxLength={40}
        />
        {state.fieldErrors?.repositoryCommitSha && (
          <small className="field-error">{state.fieldErrors.repositoryCommitSha}</small>
        )}
      </label>

      <label>
        <span>Production URL</span>
        <input
          name="productionUrl"
          defaultValue={publishing.productionUrl ?? ''}
          placeholder="https://example.com"
          maxLength={500}
        />
        {state.fieldErrors?.productionUrl && (
          <small className="field-error">{state.fieldErrors.productionUrl}</small>
        )}
      </label>

      <label>
        <span>Preview URL</span>
        <input
          name="previewUrl"
          defaultValue={publishing.previewUrl ?? ''}
          placeholder="https://preview.example.com"
          maxLength={500}
        />
        {state.fieldErrors?.previewUrl && (
          <small className="field-error">{state.fieldErrors.previewUrl}</small>
        )}
      </label>

      <label>
        <span>โดเมน</span>
        <input name="domain" defaultValue={publishing.domain ?? ''} maxLength={253} />
      </label>

      <label>
        <span>ผู้ให้บริการโฮสติ้ง</span>
        <input
          name="hostingProvider"
          defaultValue={publishing.hostingProvider ?? ''}
          placeholder="Vercel"
          maxLength={120}
        />
      </label>

      <label className="full">
        <span>บันทึกการเผยแพร่ (ลูกค้าเห็นได้)</span>
        <textarea name="notes" rows={2} defaultValue={publishing.notes ?? ''} maxLength={2000} />
      </label>

      <label className="full">
        <span>บันทึกเกี่ยวกับ repository (ลูกค้าเห็นได้)</span>
        <textarea
          name="repositoryNotes"
          rows={2}
          defaultValue={publishing.repositoryNotes ?? ''}
          maxLength={2000}
        />
      </label>

      {/* Said where it can actually be read, not only in a policy document. */}
      <p className="muted full">
        ห้ามกรอก token, deploy key, หรือค่าใน .env ในช่องใด ๆ ข้างต้น —
        ข้อมูลเหล่านี้ลูกค้าอ่านได้ และระบบไม่มีที่เก็บความลับในตารางนี้
      </p>

      {state.error && <p className="field-error full">{state.error}</p>}

      <div className="form-actions">
        <SubmitButton pendingLabel="กำลังบันทึก...">บันทึกข้อมูลการเผยแพร่</SubmitButton>
      </div>
    </form>
  )
}

/**
 * Links an already-uploaded document as the source-code handover.
 *
 * The dropdown lists documents that already exist on this project — this
 * screen never uploads, so there is exactly one upload path (Phase 5) and one
 * place where file type and size are checked.
 */
function SourceCodeForm({
  projectId,
  publishing,
  attachableDocuments,
}: {
  projectId: string
  publishing: ProjectPublishing
  attachableDocuments: DocumentListItem[]
}) {
  const [state, formAction] = useActionState<PublishingActionState, FormData>(attachSourceCode, {})
  useActionToast(state)

  return (
    <form action={formAction} className="work-form">
      <input type="hidden" name="projectId" value={projectId} />

      <label className="full">
        <span>
          <Package size={13} /> ไฟล์ซอร์สโค้ดที่ส่งมอบ
        </span>
        {attachableDocuments.length === 0 ? (
          <p className="muted empty-inline">
            ยังไม่มีเอกสารที่มีไฟล์แนบในโปรเจกต์นี้ — อัปโหลดในหน้าเอกสารก่อน
          </p>
        ) : (
          <select name="documentId" defaultValue={publishing.sourceDocumentId ?? ''} required>
            <option value="" disabled>
              เลือกเอกสาร
            </option>
            {attachableDocuments.map((document) => (
              <option key={document.id} value={document.id}>
                {document.title}
              </option>
            ))}
          </select>
        )}
      </label>

      <label>
        <span>เวอร์ชันที่ส่งมอบ</span>
        <input
          name="deliveryVersion"
          defaultValue={publishing.deliveryVersion ?? ''}
          placeholder="v1.0.0"
          maxLength={60}
        />
      </label>

      <p className="muted full">
        การแนบไฟล์ไม่ได้ปลดล็อกให้ลูกค้าเอง — สิทธิ์ดาวน์โหลดยังคงตัดสินจาก unlock_rules
        ของงวดที่ชำระแล้วตามแผนการชำระเงินเดิมทุกครั้งที่มีการเรียกดาวน์โหลด
      </p>

      {state.error && <p className="field-error full">{state.error}</p>}

      <div className="form-actions">
        <SubmitButton pendingLabel="กำลังแนบ..." variant="outline">
          แนบไฟล์ซอร์สโค้ด
        </SubmitButton>
      </div>
    </form>
  )
}
