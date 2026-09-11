import type { ReactNode } from 'react'

import { NotificationList } from '@/components/work/domain/notification-list'
import { AppShell } from '@/components/work/layout/app-shell'
import { SchemaNotice } from '@/components/work/states/schema-notice'
import { isWorkSubdomain } from '@/lib/work/auth/callback-url'
import { requireClient } from '@/lib/work/auth/permissions'
import { getNotifications } from '@/lib/work/queries/notifications'
import { getMyProjectSwitcherList } from '@/lib/work/queries/projects'

/**
 * Client portal shell.
 *
 * Same chrome as the admin portal, different navigation and identity — which
 * is the point of splitting them into separate route trees rather than
 * toggling a boolean in one page component.
 *
 * `requireClient()` keeps agency staff out — not because they are untrusted,
 * but because "your projects" is not a question the portal can answer for
 * them; they are redirected to the admin dashboard.
 *
 * Which PROJECTS a client sees is decided by `project_members` and RLS, never
 * by this layout: a client typing another client's project UUID reaches the
 * route and the database returns nothing (docs/ARCHITECTURE.md §7).
 */
export default async function PortalLayout({ children }: { children: ReactNode }) {
  const client = await requireClient()

  // Scoped by RLS to this user, exactly as every other read in this portal is.
  // The bell is now the person's OWN notifications rather than the project
  // activity feed: `notifications_select_own` is `recipient_id = auth.uid()`,
  // so it cannot become a window into a colleague's inbox either.
  const [notifications, projects, stripWorkPrefix] = await Promise.all([
    getNotifications({ limit: 20 }),
    getMyProjectSwitcherList(),
    isWorkSubdomain(),
  ])

  return (
    <AppShell
      activePortal="portal"
      stripWorkPrefix={stripWorkPrefix}
      /* Not the client's name — that is in the footer. What the line under
         the brand says is which side of the app you are on. */
      workspaceRole="ลูกค้า"
      userName={client.displayName}
      userEmail={client.email}
      userInitial={client.initial}
      userAvatarUrl={client.avatarUrl}
      notifications={<NotificationList items={notifications} portal="portal" />}
      latestActivityId={notifications[0]?.id ?? null}
      userId={client.userId}
      projects={projects}
    >
      {client.schemaMissing && <SchemaNotice />}
      {children}
    </AppShell>
  )
}
