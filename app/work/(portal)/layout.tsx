import type { ReactNode } from 'react'

import { AppShell } from '@/components/work/layout/app-shell'
import { SchemaNotice } from '@/components/work/states/schema-notice'
import { getSessionContext } from '@/lib/work/auth/session'
import { getInitialDark } from '@/lib/work/theme'

/**
 * Client portal shell.
 *
 * Same chrome as the admin portal, different navigation and identity — which
 * is the point of splitting them into separate route trees rather than
 * toggling a boolean in one page component.
 *
 * Authentication is enforced here by `getSessionContext()`. Which PROJECTS a
 * client can then see is decided by `project_members` and RLS, not by this
 * layout — a client typing another client's project UUID reaches the route and
 * gets no data (docs/ARCHITECTURE.md §7).
 */
export default async function PortalLayout({ children }: { children: ReactNode }) {
  const [session, initialDark] = await Promise.all([
    getSessionContext('/work/portal'),
    getInitialDark(),
  ])

  return (
    <AppShell
      activePortal="portal"
      workspaceName={session.displayName}
      workspaceRole="ลูกค้า"
      workspaceInitial={session.initial}
      userName={session.displayName}
      userEmail={session.email}
      userInitial={session.initial}
      initialDark={initialDark}
    >
      {session.schemaMissing && <SchemaNotice />}
      {children}
    </AppShell>
  )
}
