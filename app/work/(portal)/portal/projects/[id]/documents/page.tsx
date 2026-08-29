import { Download } from 'lucide-react'

import { Panel, PageHeading } from '@/components/work/data/panel'
import { Status } from '@/components/work/data/status'
import { requireProjectAccess } from '@/lib/work/auth/permissions'
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  documentStatusTone,
  formatDate,
  formatMoney,
} from '@/lib/work/format'
import { getDocuments } from '@/lib/work/queries/documents'

export const metadata = { title: 'เอกสาร' }

/**
 * Documents for one project, from the client's side.
 *
 * DRAFTS DO NOT APPEAR HERE, and not because this page filters them out —
 * `documents_select_client` withholds them (migration 0011). An invoice still
 * being edited is not something a client should see, and the rule lives where
 * it cannot be forgotten.
 *
 * Downloads go through /work/api/documents/[id]/download, which re-checks
 * access and signs a one-minute URL. No storage path reaches the browser, so
 * one client cannot guess their way to another's file.
 */
export default async function PortalDocumentsPage(
  props: PageProps<'/work/portal/projects/[id]/documents'>,
) {
  const { id } = await props.params
  await requireProjectAccess(id)

  const documents = await getDocuments({ projectId: id })

  return (
    <>
      <PageHeading
        eyebrow="โปรเจกต์"
        title="เอกสาร"
        description="ใบเสนอราคา ใบแจ้งหนี้ ใบเสร็จ และสัญญา"
      />

      <Panel className="projects-panel">
        {documents.length === 0 ? (
          <p className="muted empty-inline">ยังไม่มีเอกสารสำหรับโปรเจกต์นี้</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>เอกสาร</th>
                  <th>ประเภท</th>
                  <th>จำนวน</th>
                  <th>สถานะ</th>
                  <th>วันที่ออก</th>
                  <th>ไฟล์</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.id}>
                    <td>
                      <strong>{document.title}</strong>
                      {document.documentNumber && (
                        <>
                          <br />
                          <small className="muted">{document.documentNumber}</small>
                        </>
                      )}
                    </td>
                    <td>{DOCUMENT_TYPE_LABELS[document.type]}</td>
                    <td>{formatMoney(document.amount, document.currency)}</td>
                    <td>
                      <Status tone={documentStatusTone(document.status)}>
                        {DOCUMENT_STATUS_LABELS[document.status]}
                      </Status>
                    </td>
                    <td className="muted">{formatDate(document.issuedAt)}</td>
                    <td>
                      {document.hasFile ? (
                        <a
                          className="text-btn"
                          href={`/work/api/documents/${document.id}/download`}
                        >
                          <Download size={14} /> ดาวน์โหลด
                        </a>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  )
}
