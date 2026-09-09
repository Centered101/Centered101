import { Panel, PageHeading } from '@/components/work/data/panel'
import { EmptyState } from '@/components/work/states'
import { requireCapability } from '@/lib/work/auth/permissions'
import { getClientOptions } from '@/lib/work/queries/clients'
import { ProjectForm } from './project-form'

export const metadata = { title: 'สร้างโปรเจกต์' }

/**
 * Create a project.
 *
 * Guarded by `project:write`, so an accountant reaching this URL is refused
 * rather than shown a form whose submission would fail at the database.
 */
export default async function NewProjectPage() {
  const staff = await requireCapability('project:write')
  const clients = await getClientOptions()

  return (
    <>
      <PageHeading
        eyebrow="โปรเจกต์"
        title="สร้างโปรเจกต์"
        description="กรอกข้อมูลเพื่อเริ่มโปรเจกต์ใหม่"
      />

      <Panel>
        {clients.length === 0 ? (
          <EmptyState
            title="ยังไม่มีลูกค้า"
            description="โปรเจกต์ต้องผูกกับลูกค้าเสมอ — เพิ่มลูกค้าก่อนจึงจะสร้างโปรเจกต์ได้"
          />
        ) : (
          <ProjectForm clients={clients} canPrice={staff.can('finance:write')} />
        )}
      </Panel>
    </>
  )
}
