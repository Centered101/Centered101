import { Panel, PageHeading } from '@/components/work/data/panel'
import { EmptyState } from '@/components/work/states'
import { requireClient } from '@/lib/work/auth/permissions'
import { getMyPendingInvitations } from '@/lib/work/queries/collaboration'
import { InvitationsInbox } from './invitations-inbox'

export const metadata = { title: 'คำเชิญ' }

/**
 * "Login -> Invitations" (brief §4): every PENDING invitation addressed to
 * the signed-in user's own verified email. Scoped entirely by
 * `getMyPendingInvitations` / RLS (`project_invitations_select_own`) —
 * there is no email parameter anywhere on this page for a client to tamper
 * with, because there is nothing to pass: the row is matched to
 * `auth.uid()`'s own `profiles.email`, never a value the browser supplies.
 */
export default async function PortalInvitationsPage() {
  await requireClient()
  const invitations = await getMyPendingInvitations()

  return (
    <>
      <PageHeading
        title="คำเชิญของคุณ"
        description="คำเชิญเข้าร่วมโปรเจกต์ที่ส่งถึงอีเมลของคุณ"
      />

      <Panel className="projects-panel">
        {invitations.length === 0 ? (
          <EmptyState title="ไม่มีคำเชิญ" description="เมื่อมีคนเชิญคุณเข้าร่วมโปรเจกต์ รายการจะแสดงที่นี่" />
        ) : (
          <InvitationsInbox invitations={invitations} />
        )}
      </Panel>
    </>
  )
}
