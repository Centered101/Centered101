import type { ReactNode } from 'react'

import { NotificationList } from '@/components/work/domain/notification-list'
import { getNotifications } from '@/lib/work/queries/notifications'
import { getMyProjectSwitcherList } from '@/lib/work/queries/projects'
import { AppShell } from '@/components/work/layout/app-shell'
import { SchemaNotice } from '@/components/work/states/schema-notice'
import { isWorkSubdomain } from '@/lib/work/auth/callback-url'
import { requireAdmin } from '@/lib/work/auth/permissions'
import { ORG_ROLE_LABELS } from '@/lib/work/format'

/**
 * Admin / developer portal shell.
 *
 * Server Component: it resolves the session and the caller's role here, so
 * pages underneath stay server-rendered and the interactive chrome receives
 * only plain data.
 *
 * `requireAdmin()` refuses anyone without an organization_members row — a
 * client who types /work/admin/dashboard is sent to their own portal instead.
 * It is NOT the security boundary: RLS is, and it would still return nothing
 * to a client if this layout vanished. The guard exists so the answer is a
 * redirect rather than a convincing but empty admin dashboard.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const staff = await requireAdmin()

  // Read here rather than inside the bell: the query is `server-only` and RLS
  // scopes it to what this caller may see, so the client component receives a
  // rendered list and an id — never a way to ask for more.

  const [notifications, projects, stripWorkPrefix] = await Promise.all([
    getNotifications({ limit: 20 }),
    // Feeds the section nav's project-name header. `includeArchived` so it
    // still resolves on an archived project's page, which staff can open.
    getMyProjectSwitcherList({ includeArchived: true }),
    isWorkSubdomain(),
  ])

  return (
    <AppShell
      activePortal="admin"
      stripWorkPrefix={stripWorkPrefix}
      workspaceRole={ORG_ROLE_LABELS[staff.role]}
      userName={staff.displayName}
      userEmail={staff.email}
      userInitial={staff.initial}
      userAvatarUrl={staff.avatarUrl}
      notifications={<NotificationList items={notifications} />}
      latestActivityId={notifications[0]?.id ?? null}
      userId={staff.userId}
      projects={projects}
    >
      {staff.schemaMissing && <SchemaNotice />}
      {children}
    </AppShell>
  )
}
