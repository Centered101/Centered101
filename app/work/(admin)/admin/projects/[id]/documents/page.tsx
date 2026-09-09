import { notFound } from 'next/navigation'
import { Download } from 'lucide-react'

import { Panel, PageHeading, PanelHead } from '@/components/work/data/panel'
import { Status } from '@/components/work/data/status'
import { AssetThumbnail } from '@/components/work/domain/asset-thumbnail'
import { BrandEditor } from '@/components/work/domain/brand-panel'
import { DocumentManager } from '@/components/work/domain/document-manager'
import { requireProjectAccess } from '@/lib/work/auth/permissions'
import {
  PROJECT_ASSET_KIND_LABELS,
  PROJECT_ASSET_REVIEW_STATUS_LABELS,
  assetReviewStatusTone,
  formatFileSize,
} from '@/lib/work/format'
import { getProjectAssets } from '@/lib/work/queries/assets'
import { getDocuments } from '@/lib/work/queries/documents'
import { getProjectBrand, getProjectById } from '@/lib/work/queries/projects'

export const metadata = { title: 'เอกสารและแบรนด์' }

/**
 * Staff view of one project's documents and brand (Phase 5).
 *
 * `requireProjectAccess` only — reading is not a mutation, and every action
 * the panels below can fire re-authorizes on its own: documents through
 * `requireProjectFinance` (matching `documents_insert_staff`/`_update_staff`,
 * which do admit accountants) and the brand through `requireProjectManage`
 * (matching `projects_update_staff`, which does not). The page never decides
 * anything; it only decides what to render.
 *
 * `includeArchived` is safe to pass here and nowhere near a client: archived
 * documents are excluded from `documents_select_client` by RLS outright, so
 * this widens nothing for anyone who should not already see it.
 */
export default async function AdminProjectDocumentsPage(
  props: PageProps<'/work/admin/projects/[id]/documents'>,
) {
  const { id } = await props.params
  await requireProjectAccess(id)

  const project = await getProjectById(id)
  if (!project) notFound()

  const [documents, brand, assets] = await Promise.all([
    getDocuments({ projectId: id, includeArchived: true }),
    getProjectBrand(id),
    getProjectAssets(id),
  ])

  return (
    <>
      <PageHeading
        eyebrow={project.projectCode}
        title="เอกสารและแบรนด์"
        description="จัดการเอกสารของโปรเจกต์ กำหนดสิทธิ์การเข้าถึง และดูแลแบรนด์"
      />

      <Panel className="projects-panel">
        <PanelHead
          title="เอกสาร"
          description="เอกสารที่ตั้งเป็น “ภายในทีม” จะไม่ปรากฏในพอร์ทัลของลูกค้า"
        />
        <DocumentManager projectId={id} documents={documents} />
      </Panel>

      <Panel className="projects-panel">
        <PanelHead
          title="แบรนด์ของโปรเจกต์"
          description="สีและฟอนต์ที่ตกลงใช้จริง แยกจากสิ่งที่ลูกค้ากรอกไว้ตอนเริ่มโปรเจกต์"
        />
        <BrandEditor projectId={id} brand={brand} />
      </Panel>

      <Panel className="projects-panel">
        <PanelHead
          title="ไฟล์แบรนด์จากลูกค้า"
          description="โลโก้ ฟอนต์ และไฟล์อ้างอิงที่ลูกค้าอัปโหลดไว้"
        />
        {assets.length === 0 ? (
          <p className="muted empty-inline">ยังไม่มีไฟล์จากลูกค้า</p>
        ) : (
          <ul className="asset-grid">
            {assets.map((asset) => (
              <li key={asset.id}>
                <AssetThumbnail asset={asset} />
                <div>
                  <strong>{asset.name}</strong>
                  <br />
                  <small className="muted">
                    {PROJECT_ASSET_KIND_LABELS[asset.kind] ?? asset.kind} ·{' '}
                    {formatFileSize(asset.fileSize)}
                  </small>
                  <br />
                  <Status tone={assetReviewStatusTone(asset.reviewStatus)}>
                    {PROJECT_ASSET_REVIEW_STATUS_LABELS[asset.reviewStatus] ?? asset.reviewStatus}
                  </Status>
                </div>
                {asset.hasFile && (
                  <a className="text-btn" href={`/work/api/assets/${asset.id}/download`}>
                    <Download size={14} /> ดาวน์โหลด
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  )
}
