import { notFound } from 'next/navigation'

import { Panel, PageHeading, PanelHead } from '@/components/work/data/panel'
import { ChangeRequestReview } from '@/components/work/domain/change-request-review'
import { requireProjectAccess } from '@/lib/work/auth/permissions'
import { getChangeRequests } from '@/lib/work/queries/change-requests'
import { getProjectById } from '@/lib/work/queries/projects'

export const metadata = { title: 'คำขอเปลี่ยนแปลง' }

/**
 * Staff review queue for one project's change requests (Phase 8).
 *
 * `requireProjectAccess` only — reading the queue is not a mutation, and every
 * decision re-authorizes through `requireProjectManage`, which mirrors
 * `change_requests_update_staff`. An accountant may read this page and is
 * refused by every action on it, which is the intended split: they see what
 * work is being agreed, they do not agree it.
 *
 * The org-wide queue at /work/admin/change-requests is unchanged; this is the
 * per-project view where decisions are actually made.
 */
export default async function AdminProjectChangeRequestsPage(
  props: PageProps<'/work/admin/projects/[id]/change-requests'>,
) {
  const { id } = await props.params
  await requireProjectAccess(id)

  const project = await getProjectById(id)
  if (!project) notFound()

  const requests = await getChangeRequests({ projectId: id })

  const open = requests.filter(
    (request) =>
      request.status !== 'COMPLETED' &&
      request.status !== 'REJECTED' &&
      request.status !== 'CANCELLED',
  )
  const closed = requests.filter(
    (request) =>
      request.status === 'COMPLETED' ||
      request.status === 'REJECTED' ||
      request.status === 'CANCELLED',
  )

  return (
    <>
      <PageHeading
        eyebrow={project.projectCode}
        title="คำขอเปลี่ยนแปลง"
        description="ตรวจสอบ ประเมินราคา และตัดสินใจคำขอจากลูกค้า"
      />

      <Panel className="projects-panel">
        <PanelHead
          title={`กำลังดำเนินการ (${open.length})`}
          description="ข้อความของลูกค้าจะไม่ถูกแก้ไข ขอบเขตที่ตกลงจะบันทึกแยกไว้ต่างหาก"
        />
        <ChangeRequestReview projectId={id} requests={open} />
      </Panel>

      {closed.length > 0 && (
        <Panel className="projects-panel">
          <PanelHead title={`ปิดแล้ว (${closed.length})`} description="เก็บไว้เป็นประวัติ" />
          <ChangeRequestReview projectId={id} requests={closed} />
        </Panel>
      )}
    </>
  )
}
