import Link from 'next/link'
import { Plus } from 'lucide-react'

import { Panel, PageHeading } from '@/components/work/data/panel'
import { ProjectsTable } from '@/components/work/data/projects-table'
import { requireAdmin } from '@/lib/work/auth/permissions'
import { getProjects } from '@/lib/work/queries/projects'

export const metadata = { title: 'โปรเจกต์' }

/**
 * All projects in the organization.
 *
 * `getProjects()` applies no organization filter of its own — RLS scopes the
 * result to the caller's memberships, so this page cannot show another
 * tenant's work even if the guard above were removed.
 */
export default async function AdminProjectsPage() {
  const staff = await requireAdmin()
  const projects = await getProjects()

  return (
    <>
      <PageHeading
        title="โปรเจกต์"
        description={`ทั้งหมด ${projects.length} โปรเจกต์`}
        action={
          staff.can('project:write') ? (
            <Link className="primary" href="/work/admin/projects/new">
              <Plus size={17} />
              สร้างโปรเจกต์
            </Link>
          ) : undefined
        }
      />

      <Panel className="projects-panel">
        <ProjectsTable projects={projects} />
      </Panel>
    </>
  )
}
