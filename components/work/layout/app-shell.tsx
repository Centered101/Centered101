'use client'

import { useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'

import { accountHref, adminNav, isNavItemActive, portalNav } from '@/lib/work/nav'
import { Footer } from './footer'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'

/**
 * The chrome shared by both portals: sidebar, topbar, content area.
 *
 * Client component because the mobile drawer is interactive. Everything it
 * renders inside `children` stays a Server Component — pages pass
 * already-rendered content in, so data fetching remains server-side.
 *
 * LIGHT ONLY. A dark theme used to live here as a `useState` + cookie pair
 * feeding a `.app.dark` class. It has been removed: the palette existed in two
 * places, so every colour added since had to be chosen twice, and several were
 * only ever picked for light — which is why parts of the dark UI read as
 * low-contrast. One palette is the fix, not a second set of overrides.
 */
export function AppShell({
  activePortal,
  workspaceRole,
  userName,
  userEmail,
  userInitial,
  userAvatarUrl,
  notifications,
  latestActivityId,
  userId,
  children,
}: {
  activePortal: 'admin' | 'portal'
  /** One-line description of the workspace, under the brand — see Sidebar. */
  workspaceRole: string | null
  userName: string
  userEmail: string
  userInitial: string
  userAvatarUrl: string | null
  /** The activity feed for the bell, already rendered by the layout above. */
  notifications: ReactNode
  latestActivityId: number | null
  /** Namespaces the bell's per-account "seen" marker. */
  userId: string
  children: ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  // Resolved here rather than passed in: nav items carry Lucide icon
  // *components*, and functions cannot cross the server/client boundary as
  // props. Importing the config inside this client component keeps them on
  // the client where they are rendered.
  const nav = activePortal === 'admin' ? adminNav : portalNav

  // The prototype showed the active nav label here, tracked in local state.
  // Deriving it from the URL keeps that behaviour while surviving deep links.
  const breadcrumb = nav.find((item) => isNavItemActive(pathname, item.href))?.label ?? 'ภาพรวม'

  return (
    <div className="app">
      <Sidebar
        items={nav}
        workspaceRole={workspaceRole}
        accountHref={accountHref[activePortal]}
        userName={userName}
        userEmail={userEmail}
        userInitial={userInitial}
        userAvatarUrl={userAvatarUrl}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <main className="main">
        <Topbar
          breadcrumb={breadcrumb}
          onOpenMobileNav={() => setMobileOpen(true)}
          notifications={notifications}
          latestActivityId={latestActivityId}
          userId={userId}
        />
        {/* The footer is a sibling of .content, not a child: .main is a
            flex column filling the viewport, so `margin-top: auto` on the
            footer pins it to the bottom on short pages without it floating
            up under the last panel. */}
        <div className="content">{children}</div>
        <Footer />
      </main>
    </div>
  )
}
