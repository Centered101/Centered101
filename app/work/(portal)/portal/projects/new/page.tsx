import { Panel, PageHeading } from '@/components/work/data/panel'
import { requireClient } from '@/lib/work/auth/permissions'
import { OwnProjectForm } from './own-project-form'

export const metadata = { title: 'สร้างโปรเจกต์' }

/**
 * A CLIENT creates their own project — the self-serve path, distinct from
 * the agency's own /admin/projects/new (which picks an existing client
 * company and is staff-only). See createOwnProject
 * (lib/work/services/projects.ts) for how organization/client/owner are
 * resolved without ever trusting this form for them.
 */
export default async function NewOwnProjectPage() {
  await requireClient()

  return (
    <>
      <PageHeading
        eyebrow="โปรเจกต์"
        title="สร้างโปรเจกต์ของคุณ"
        description="คุณจะเป็นเจ้าของโปรเจกต์นี้ และสามารถเชิญสมาชิกเข้าร่วมได้ภายหลัง"
      />

      <Panel>
        <OwnProjectForm />
      </Panel>
    </>
  )
}
