import { WorkLink } from '@/components/work/layout/work-link'
import { Download } from 'lucide-react'

import { Panel, PageHeading } from '@/components/work/data/panel'
import { Status } from '@/components/work/data/status'
import { EmptyState } from '@/components/work/states'
import { requireCapability } from '@/lib/work/auth/permissions'
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  documentStatusTone,
  formatDate,
  formatMoney,
} from '@/lib/work/format'
import { getDocuments } from '@/lib/work/queries/documents'

export const metadata = { title: 'ไฟล์' }

/**
 * Documents.
 *
 * Files are reached through /work/api/documents/[id]/download, which re-checks
 * access before signing a one-minute URL. No storage path and no public URL is
 * ever rendered here.
 */
export default async function AdminDocumentsPage() {
  await requireCapability('document:read')
  const documents = await getDocuments()

  return (
    <>
      <PageHeading title="ไฟล์" description={`เอกสารทั้งหมด ${documents.length} รายการ`} />

      <Panel className="projects-panel">
        {documents.length === 0 ? (
          <EmptyState
            title="ยังไม่มีเอกสาร"
            description="ใบเสนอราคา ใบแจ้งหนี้ และสัญญาจะแสดงที่นี่"
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>เอกสาร</th>
                  <th>ประเภท</th>
                  <th>โปรเจกต์</th>
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
                    <td>
                      {document.projectId ? (
                        <WorkLink href={`/work/admin/projects/${document.projectId}`}>
                          {document.projectName}
                        </WorkLink>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>{formatMoney(document.amount, document.currency)}</td>
                    <td>
                      <Status tone={documentStatusTone(document.status)}>
                        {DOCUMENT_STATUS_LABELS[document.status]}
                      </Status>
                    </td>
                    <td className="muted">{formatDate(document.issuedAt)}</td>
                    <td>
                      {document.hasFile ? (
                        <a className="text-btn" href={`/work/api/documents/${document.id}/download`}>
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
