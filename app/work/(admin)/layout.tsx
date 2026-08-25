import type { ReactNode } from 'react'

import { AppShell } from '@/components/work/layout/app-shell'
import { SchemaNotice } from '@/components/work/states/schema-notice'
import { getSessionContext } from '@/lib/work/auth/session'
import { getInitialDark } from '@/lib/work/theme'

/**
 * Admin / developer portal shell.
 *
 * Server Component: it resolves the session and the user's memberships here,
 * so pages underneath stay server-rendered and the interactive chrome receives
 * only plain data.
 *
 * `getSessionContext()` redirects to /login when there is no session, so this
 * layout IS a real authentication boundary — unlike the middleware, which is
 * only a convenience. Role enforcement (who may see WHICH organization's data)
 * arrives in Phase 4; today any signed-in user reaches these routes, and RLS
 * is what stops them seeing another tenant's rows.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const [session, initialDark] = await Promise.all([
    getSessionContext('/work/admin/dashboard'),
    getInitialDark(),
  ])

  const workspaceName = session.memberships[0]?.organizationName ?? session.displayName

  return (
    <AppShell
      activePortal="admin"
      workspaceName={workspaceName}
      workspaceRole="แอดมิน"
      workspaceInitial={(workspaceName.trim()[0] ?? '?').toUpperCase()}
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
