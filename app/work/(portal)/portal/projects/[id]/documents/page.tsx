import { Download } from 'lucide-react'

import { Panel, PageHeading, PanelHead } from '@/components/work/data/panel'
import { BrandDisplay } from '@/components/work/domain/brand-panel'
import { Status } from '@/components/work/data/status'
import { requireProjectAccess } from '@/lib/work/auth/permissions'
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  documentStatusTone,
  formatDate,
  formatFileSize,
  formatMoney,
} from '@/lib/work/format'
import { getDocuments } from '@/lib/work/queries/documents'
import { getProjectBrand } from '@/lib/work/queries/projects'

export const metadata = { title: 'เอกสาร' }

/**
 * Documents for one project, from the client's side.
 *
 * DRAFTS AND INTERNAL DOCUMENTS DO NOT APPEAR HERE, and not because this page
 * filters them out — `documents_select_client` withholds them (migrations
 * 0011 and 0039). An invoice still being edited is not something a client
 * should see, and neither is an internal design document that happens to be
 * ISSUED; both rules live where they cannot be forgotten. This page passes NO
 * visibility filter of its own, deliberately: a filter in a query is a bug
 * waiting to be deleted, whereas a policy is a guarantee.
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

  const [documents, brand] = await Promise.all([getDocuments({ projectId: id }), getProjectBrand(id)])

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
                  <th>โดย</th>
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
                    <td className="muted">{document.uploadedByName ?? '—'}</td>
                    <td>
                      {document.hasFile ? (
                        <a
                          className="text-btn"
                          href={`/work/api/documents/${document.id}/download`}
                        >
                          <Download size={14} /> {formatFileSize(document.fileSize)}
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

      <Panel className="projects-panel">
        <PanelHead
          title="แบรนด์ของโปรเจกต์"
          description="สีและฟอนต์ที่ทีมงานใช้จริงในโปรเจกต์นี้"
        />
        <BrandDisplay brand={brand} />
      </Panel>
    </>
  )
}
