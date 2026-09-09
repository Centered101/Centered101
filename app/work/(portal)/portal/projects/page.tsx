import Link from 'next/link'
import { Plus } from 'lucide-react'

import { PageHeading } from '@/components/work/data/panel'
import { MyProjectsGrid } from '@/components/work/domain/my-projects-grid'
import { requireClient } from '@/lib/work/auth/permissions'
import { getMyProjectsWithCollaboration } from '@/lib/work/queries/projects'

export const metadata = { title: 'โปรเจกต์' }

/**
 * The client's own projects — both agency-managed ones (a client_owner/
 * client_member row) and self-serve ones the caller owns or was invited
 * onto (an OWNER/MANAGER/MEMBER/VIEWER row, migration 0025). Same RLS policy
 * either way (`projects_select_visible` is role-blind on project_members),
 * so another client's project cannot appear here regardless of which kind
 * it is, and typing its UUID into the detail route does not reach it either.
 */
export default async function PortalProjectsPage() {
  await requireClient()
  const projects = await getMyProjectsWithCollaboration()

  return (
    <>
      <PageHeading
        title="โปรเจกต์ของคุณ"
        description={`ทั้งหมด ${projects.length} โปรเจกต์`}
        action={
          <Link href="/work/portal/projects/new" className="primary btn-sm">
            <Plus size={15} /> สร้างโปรเจกต์
          </Link>
        }
      />

      <MyProjectsGrid projects={projects} />
    </>
  )
}
