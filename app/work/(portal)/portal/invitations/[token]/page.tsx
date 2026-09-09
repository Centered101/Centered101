import { requireClient } from '@/lib/work/auth/permissions'
import { Panel, PageHeading } from '@/components/work/data/panel'
import { AcceptInvitationForm } from './accept-invitation-form'

export const metadata = { title: 'ยอมรับคำเชิญ' }

/**
 * The direct-link invitation flow (brief §4): someone follows the URL
 * `inviteMember` handed back once. Requires being signed in first —
 * `requireClient()` redirects to /work/login?next=... if not, and login
 * itself lands back on this exact URL afterward, so "the invited email does
 * not yet have an account" resolves by signing up, then landing right back
 * here to accept — no separate pending-invite storage needed for that case.
 *
 * The actual accept happens client-side (AcceptInvitationForm calling
 * acceptProjectInvitation), which re-verifies the token server-side under
 * this session regardless of anything this page renders.
 */
export default async function AcceptInvitationPage(props: { params: Promise<{ token: string }> }) {
  await requireClient()
  const { token } = await props.params

  return (
    <>
      <PageHeading title="คำเชิญเข้าร่วมโปรเจกต์" description="กดยอมรับเพื่อเข้าร่วมโปรเจกต์นี้" />
      <Panel>
        <AcceptInvitationForm token={token} />
      </Panel>
    </>
  )
}
