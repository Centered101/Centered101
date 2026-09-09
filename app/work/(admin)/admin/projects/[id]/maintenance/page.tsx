import { notFound } from 'next/navigation'

import { Panel, PageHeading, PanelHead } from '@/components/work/data/panel'
import { MaintenancePanel } from '@/components/work/domain/maintenance-panel'
import { requireProjectAccess } from '@/lib/work/auth/permissions'
import { getMaintenancePlan, getMaintenanceRecords } from '@/lib/work/queries/maintenance'
import { getProjectById } from '@/lib/work/queries/projects'

export const metadata = { title: 'การดูแลรักษา' }

/**
 * Staff maintenance for one project (Phase 8).
 *
 * `requireProjectAccess` only. The two halves below re-authorize differently
 * and deliberately: the PLAN through `requireProjectFinance` (an accountant
 * owns billing) and the RECORDS through `requireProjectManage` (an accountant
 * must not assert that engineering work happened). Neither is decided here.
 */
export default async function AdminProjectMaintenancePage(
  props: PageProps<'/work/admin/projects/[id]/maintenance'>,
) {
  const { id } = await props.params
  await requireProjectAccess(id)

  const project = await getProjectById(id)
  if (!project) notFound()

  const [plan, records] = await Promise.all([
    getMaintenancePlan(id),
    getMaintenanceRecords(id),
  ])

  return (
    <>
      <PageHeading
        eyebrow={project.projectCode}
        title="การดูแลรักษา"
        description="แผนที่เรียกเก็บ และงานที่ทำจริง"
      />

      <Panel className="projects-panel">
        <PanelHead
          title="แผนดูแลรักษา"
          description="สิ่งที่เรียกเก็บและรอบการเรียกเก็บ — จัดการโดยฝ่ายการเงิน"
        />
        <MaintenancePanel projectId={id} plan={plan} records={records} />
      </Panel>
    </>
  )
}
