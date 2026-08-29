import type { ReactNode } from 'react'

import { ActivityList } from '@/components/work/data/activity-list'
import { AppShell } from '@/components/work/layout/app-shell'
import { SchemaNotice } from '@/components/work/states/schema-notice'
import { requireClient } from '@/lib/work/auth/permissions'
import { getActivity } from '@/lib/work/queries/activity'

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

  // Scoped by RLS to the client's own projects, exactly as every other read in
  // this portal is — the bell cannot become a window into other clients' work.
  const activity = await getActivity({ limit: 8 })

  return (
    <AppShell
      activePortal="portal"
      /* Not the client's name — that is in the footer. What the line under
         the brand says is which side of the app you are on. */
      workspaceRole="ลูกค้า"
      userName={client.displayName}
      userEmail={client.email}
      userInitial={client.initial}
      userAvatarUrl={client.avatarUrl}
      notifications={<ActivityList items={activity} portal="portal" />}
      latestActivityId={activity[0]?.id ?? null}
      userId={client.userId}
    >
      {client.schemaMissing && <SchemaNotice />}
      {children}
    </AppShell>
  )
}
