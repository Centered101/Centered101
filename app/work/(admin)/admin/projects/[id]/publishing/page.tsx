import { notFound } from 'next/navigation'

import { Panel, PageHeading, PanelHead } from '@/components/work/data/panel'
import { PublishingPanel } from '@/components/work/domain/publishing-panel'
import { requireProjectAccess } from '@/lib/work/auth/permissions'
import { getDocuments } from '@/lib/work/queries/documents'
import { getProjectById } from '@/lib/work/queries/projects'
import { getProjectPublishing } from '@/lib/work/queries/publishing'

export const metadata = { title: 'การเผยแพร่และซอร์สโค้ด' }

/**
 * Staff publishing and source-code delivery for one project (Phase 6).
 *
 * `requireProjectAccess` only — reading is not a mutation, and every action
 * the panel can fire re-authorizes on its own through `requireProjectManage`,
 * which mirrors `project_publishing`'s policies exactly. The page decides what
 * to render, never who may act.
 *
 * The per-deploy history stays on the project overview (DeploymentForm and
 * `project_deployments`); this page is the project's publishing IDENTITY —
 * where the code lives, what was delivered, whether it is live.
 */
export default async function AdminProjectPublishingPage(
  props: PageProps<'/work/admin/projects/[id]/publishing'>,
) {
  const { id } = await props.params
  await requireProjectAccess(id)

  const project = await getProjectById(id)
  if (!project) notFound()

  const [publishing, documents] = await Promise.all([
    getProjectPublishing(id),
    getDocuments({ projectId: id }),
  ])

  // Only documents that actually carry a file can be a handover package.
  const attachable = documents.filter((document) => document.hasFile)

  return (
    <>
      <PageHeading
        eyebrow={project.projectCode}
        title="การเผยแพร่และซอร์สโค้ด"
        description="ที่อยู่ของโค้ด เวอร์ชันที่ส่งมอบ และสถานะการเผยแพร่"
      />

      <Panel className="projects-panel">
        <PanelHead
          title="การเผยแพร่"
          description="ลูกค้าเห็นลิงก์เหล่านี้ได้เมื่อปลดล็อกตามแผนการชำระเงิน"
        />
        <PublishingPanel
          projectId={id}
          publishing={publishing}
          attachableDocuments={attachable}
        />
      </Panel>
    </>
  )
}
