'use client'

import { useActionState, useState } from 'react'
import { Archive, Download, FileUp, Pencil, RefreshCw } from 'lucide-react'

import { Status } from '@/components/work/data/status'
import { SubmitButton, useActionToast } from '@/components/work/forms'
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_VISIBILITY_LABELS,
  documentStatusTone,
  documentVisibilityTone,
  formatDate,
  formatFileSize,
} from '@/lib/work/format'
import type { DocumentListItem } from '@/lib/work/queries/documents'
import {
  archiveDocument,
  replaceDocument,
  setDocumentVisibility,
  updateDocument,
  uploadDocument,
} from '@/lib/work/services/documents'
import type { DocumentActionState } from '@/lib/work/services/documents'
import { DOCUMENT_TYPES, DOCUMENT_VISIBILITIES } from '@/lib/work/types/enums'

/**
 * Staff document management for one project.
 *
 * VISIBILITY IS SHOWN ON EVERY ROW, always, including on internal documents.
 * The one mistake this screen exists to prevent is a document reaching a
 * client who should never have seen it, and that mistake is only avoidable if
 * the current answer is visible without opening anything.
 *
 * Nothing here decides access. Every action re-authorizes server-side and RLS
 * re-checks underneath it; the buttons only decide what is worth offering.
 */
export function DocumentManager({
  projectId,
  documents,
}: {
  projectId: string
  documents: DocumentListItem[]
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const [replacing, setReplacing] = useState<string | null>(null)

  const active = documents.filter((document) => document.archivedAt === null)
  const archived = documents.filter((document) => document.archivedAt !== null)

  return (
    <div className="document-manager">
      <UploadForm projectId={projectId} />

      {active.length === 0 ? (
        <p className="muted empty-inline">ยังไม่มีเอกสารสำหรับโปรเจกต์นี้</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>เอกสาร</th>
                <th>ประเภท</th>
                <th>สิทธิ์การเข้าถึง</th>
                <th>สถานะ</th>
                <th>อัปโหลดโดย</th>
                <th>วันที่</th>
                <th>ไฟล์</th>
                <th aria-label="การจัดการ" />
              </tr>
            </thead>
            <tbody>
              {active.map((document) => (
                <DocumentRow
                  key={document.id}
                  projectId={projectId}
                  document={document}
                  isEditing={editing === document.id}
                  isReplacing={replacing === document.id}
                  onEdit={() => {
                    setReplacing(null)
                    setEditing(editing === document.id ? null : document.id)
                  }}
                  onReplace={() => {
                    setEditing(null)
                    setReplacing(replacing === document.id ? null : document.id)
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {archived.length > 0 && (
        <details className="document-archive">
          <summary>เอกสารที่เก็บเข้าคลังแล้ว ({archived.length})</summary>
          <ul>
            {archived.map((document) => (
              <li key={document.id}>
                <span>
                  <strong>{document.title}</strong>{' '}
                  <small className="muted">{DOCUMENT_TYPE_LABELS[document.type]}</small>
                </span>
                <span className="muted">เก็บเมื่อ {formatDate(document.archivedAt)}</span>
                {document.hasFile && (
                  <a className="text-btn" href={`/work/api/documents/${document.id}/download`}>
                    <Download size={14} /> ดาวน์โหลด
                  </a>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function DocumentRow({
  projectId,
  document,
  isEditing,
  isReplacing,
  onEdit,
  onReplace,
}: {
  projectId: string
  document: DocumentListItem
  isEditing: boolean
  isReplacing: boolean
  onEdit: () => void
  onReplace: () => void
}) {
  return (
    <>
      <tr>
        <td>
          <strong>{document.title}</strong>
          {document.documentNumber && (
            <>
              <br />
              <small className="muted">{document.documentNumber}</small>
            </>
          )}
          {document.supersedesId && (
            <>
              <br />
              <small className="muted">แทนที่ฉบับก่อนหน้า</small>
            </>
          )}
        </td>
        <td>{DOCUMENT_TYPE_LABELS[document.type]}</td>
        <td>
          <Status tone={documentVisibilityTone(document.visibility)}>
            {DOCUMENT_VISIBILITY_LABELS[document.visibility]}
          </Status>
        </td>
        <td>
          <Status tone={documentStatusTone(document.status)}>
            {DOCUMENT_STATUS_LABELS[document.status]}
          </Status>
        </td>
        <td className="muted">{document.uploadedByName ?? '—'}</td>
        <td className="muted">{formatDate(document.createdAt)}</td>
        <td>
          {document.hasFile ? (
            <a className="text-btn" href={`/work/api/documents/${document.id}/download`}>
              <Download size={14} /> {formatFileSize(document.fileSize)}
            </a>
          ) : (
            <span className="muted">—</span>
          )}
        </td>
        <td className="row-actions">
          <VisibilityToggle projectId={projectId} document={document} />
          <button type="button" className="text-btn" onClick={onEdit}>
            <Pencil size={14} /> แก้ไข
          </button>
          <button type="button" className="text-btn" onClick={onReplace}>
            <RefreshCw size={14} /> แทนที่
          </button>
          <ArchiveButton projectId={projectId} documentId={document.id} />
        </td>
      </tr>

      {isEditing && (
        <tr className="row-drawer">
          <td colSpan={8}>
            <EditForm projectId={projectId} document={document} />
          </td>
        </tr>
      )}

      {isReplacing && (
        <tr className="row-drawer">
          <td colSpan={8}>
            <ReplaceForm projectId={projectId} document={document} />
          </td>
        </tr>
      )}
    </>
  )
}

/**
 * One-click INTERNAL <-> CLIENT_VISIBLE.
 *
 * The NEXT value is posted as a plain hidden field rather than toggled
 * server-side from the current one. The server re-reads the row and
 * re-authorizes regardless, so this cannot widen access on its own — and it
 * means a double-click cannot land as two flips.
 */
function VisibilityToggle({
  projectId,
  document,
}: {
  projectId: string
  document: DocumentListItem
}) {
  const [state, formAction] = useActionState<DocumentActionState, FormData>(
    setDocumentVisibility,
    {},
  )
  useActionToast(state)

  const next = document.visibility === 'CLIENT_VISIBLE' ? 'INTERNAL' : 'CLIENT_VISIBLE'

  return (
    <form action={formAction} className="inline-form">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="documentId" value={document.id} />
      <input type="hidden" name="visibility" value={next} />
      <SubmitButton variant="outline" pendingLabel="กำลังเปลี่ยน...">
        {next === 'CLIENT_VISIBLE' ? 'ให้ลูกค้าเห็น' : 'ซ่อนจากลูกค้า'}
      </SubmitButton>
    </form>
  )
}

function ArchiveButton({ projectId, documentId }: { projectId: string; documentId: string }) {
  const [state, formAction] = useActionState<DocumentActionState, FormData>(archiveDocument, {})
  useActionToast(state)

  return (
    <form action={formAction} className="inline-form">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="documentId" value={documentId} />
      <SubmitButton variant="outline" pendingLabel="กำลังเก็บ...">
        <Archive size={14} /> เก็บเข้าคลัง
      </SubmitButton>
    </form>
  )
}

function TypeAndVisibilityFields({
  type,
  visibility,
  fieldErrors,
}: {
  type?: string
  visibility?: string
  fieldErrors?: Record<string, string>
}) {
  return (
    <>
      <label>
        <span>ประเภท</span>
        <select name="type" defaultValue={type ?? 'OTHER'}>
          {DOCUMENT_TYPES.map((value) => (
            <option key={value} value={value}>
              {DOCUMENT_TYPE_LABELS[value]}
            </option>
          ))}
        </select>
        {fieldErrors?.type && <small className="field-error">{fieldErrors.type}</small>}
      </label>

      <label>
        <span>สิทธิ์การเข้าถึง</span>
        <select name="visibility" defaultValue={visibility ?? 'INTERNAL'}>
          {DOCUMENT_VISIBILITIES.map((value) => (
            <option key={value} value={value}>
              {DOCUMENT_VISIBILITY_LABELS[value]}
            </option>
          ))}
        </select>
        {fieldErrors?.visibility && (
          <small className="field-error">{fieldErrors.visibility}</small>
        )}
      </label>
    </>
  )
}

function UploadForm({ projectId }: { projectId: string }) {
  const [state, formAction] = useActionState<DocumentActionState, FormData>(uploadDocument, {})
  useActionToast(state)

  return (
    <form action={formAction} className="work-form document-upload-form">
      <input type="hidden" name="projectId" value={projectId} />

      <label>
        <span>ชื่อเอกสาร</span>
        <input name="title" required maxLength={200} placeholder="เช่น แบบร่างหน้าแรก v2" />
        {state.fieldErrors?.title && (
          <small className="field-error">{state.fieldErrors.title}</small>
        )}
      </label>

      <TypeAndVisibilityFields fieldErrors={state.fieldErrors} />

      <label>
        <span>ไฟล์</span>
        <input type="file" name="file" required />
        {state.fieldErrors?.file && <small className="field-error">{state.fieldErrors.file}</small>}
      </label>

      <label className="full">
        <span>บันทึก (ไม่บังคับ)</span>
        <textarea name="notes" rows={2} maxLength={2000} />
      </label>

      {state.error && <p className="field-error full">{state.error}</p>}

      <div className="form-actions">
        <SubmitButton pendingLabel="กำลังอัปโหลด...">
          <FileUp size={14} /> อัปโหลดเอกสาร
        </SubmitButton>
      </div>
    </form>
  )
}

function EditForm({ projectId, document }: { projectId: string; document: DocumentListItem }) {
  const [state, formAction] = useActionState<DocumentActionState, FormData>(updateDocument, {})
  useActionToast(state)

  return (
    <form action={formAction} className="work-form">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="documentId" value={document.id} />

      <label>
        <span>ชื่อเอกสาร</span>
        <input name="title" defaultValue={document.title} required maxLength={200} />
        {state.fieldErrors?.title && (
          <small className="field-error">{state.fieldErrors.title}</small>
        )}
      </label>

      <TypeAndVisibilityFields
        type={document.type}
        visibility={document.visibility}
        fieldErrors={state.fieldErrors}
      />

      <label className="full">
        <span>บันทึก</span>
        <textarea name="notes" rows={2} maxLength={2000} />
      </label>

      {state.error && <p className="field-error full">{state.error}</p>}

      <div className="form-actions">
        <SubmitButton pendingLabel="กำลังบันทึก...">บันทึกการแก้ไข</SubmitButton>
      </div>
    </form>
  )
}

/**
 * Replace keeps the old file and links the new one to it (`supersedes_id`), so
 * "what did they actually sign in March" stays answerable. It is not an edit
 * of the existing row.
 */
function ReplaceForm({ projectId, document }: { projectId: string; document: DocumentListItem }) {
  const [state, formAction] = useActionState<DocumentActionState, FormData>(replaceDocument, {})
  useActionToast(state)

  return (
    <form action={formAction} className="work-form">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="documentId" value={document.id} />

      <p className="muted full">
        อัปโหลดไฟล์ใหม่แทน <strong>{document.title}</strong> — ฉบับเดิมจะถูกเก็บเข้าคลังไว้
        และยังตรวจสอบย้อนหลังได้
      </p>

      <label>
        <span>ชื่อเอกสารฉบับใหม่</span>
        <input name="title" defaultValue={document.title} maxLength={200} />
      </label>

      <label>
        <span>ไฟล์ใหม่</span>
        <input type="file" name="file" required />
        {state.fieldErrors?.file && <small className="field-error">{state.fieldErrors.file}</small>}
      </label>

      {state.error && <p className="field-error full">{state.error}</p>}

      <div className="form-actions">
        <SubmitButton pendingLabel="กำลังแทนที่...">
          <RefreshCw size={14} /> แทนที่ด้วยฉบับนี้
        </SubmitButton>
      </div>
    </form>
  )
}
