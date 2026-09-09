import { Panel, PageHeading, PanelHead } from '@/components/work/data/panel'
import { requireProjectAccess } from '@/lib/work/auth/permissions'
import { getProjectInvitations, getProjectMembersList } from '@/lib/work/queries/collaboration'
import { MembersPanel } from './members-panel'

export const metadata = { title: 'สมาชิกโปรเจกต์' }

/**
 * Members tab — who is on this project, and (for an OWNER) inviting more.
 *
 * `requireProjectAccess` alone: reading the member list is allowed for
 * anyone who can read the project at all (RLS: project_members_select_project
 * is role-blind), the same as every other read-only tab. `canManageMembers`
 * (true only for the self-serve OWNER, or staff — see permissions.ts) is
 * what MembersPanel uses to decide whether to render the invite form and the
 * remove/change-role actions at all — never exposing management controls to
 * a MEMBER or VIEWER who could not use them anyway (RLS would refuse the
 * write), per the brief's own "never expose management actions to
 * unauthorized users".
 */
export default async function PortalMembersPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const access = await requireProjectAccess(id)

  const [members, invitations] = await Promise.all([
    getProjectMembersList(id),
    access.canManageMembers ? getProjectInvitations(id) : Promise.resolve([]),
  ])

  return (
    <>
      <PageHeading
        eyebrow="โปรเจกต์"
        title="สมาชิกโปรเจกต์"
        description="ผู้ที่เข้าถึงโปรเจกต์นี้ได้ และคำเชิญที่ส่งไว้"
      />

      <Panel className="projects-panel">
        <PanelHead title="สมาชิก" description={`ทั้งหมด ${members.length} คน`} />
        <MembersPanel
          projectId={id}
          members={members}
          invitations={invitations}
          canManage={access.canManageMembers}
          currentUserId={access.userId}
        />
      </Panel>
    </>
  )
}
