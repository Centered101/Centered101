import { Panel, PageHeading } from '@/components/work/data/panel'
import { ProjectsTable } from '@/components/work/data/projects-table'
import { requireClient } from '@/lib/work/auth/permissions'
import { getClientProjects } from '@/lib/work/queries/projects'

export const metadata = { title: 'โปรเจกต์' }

/**
 * The client's own projects.
 *
 * The list is whatever `project_members` says it is. Another client's project
 * cannot appear here, and typing its UUID into the detail route does not
 * reach it either — both are the same RLS policy, not two separate checks.
 */
export default async function PortalProjectsPage() {
  await requireClient()
  const projects = await getClientProjects()

  return (
    <>
      <PageHeading
        title="โปรเจกต์ของคุณ"
        description={`ทั้งหมด ${projects.length} โปรเจกต์`}
      />

      <Panel className="projects-panel">
        <ProjectsTable
          projects={projects}
          basePath="/work/portal/projects"
          emptyDescription="เมื่อทีมงานเพิ่มคุณเข้าโปรเจกต์แล้ว รายการจะแสดงที่นี่"
        />
      </Panel>
    </>
  )
}
