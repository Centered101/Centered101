'use client'

import { useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'

import { adminNav, isNavItemActive, portalNav } from '@/lib/work/nav'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'

const THEME_COOKIE = 'work-theme'

/**
 * The chrome shared by both portals: sidebar, topbar, content area.
 *
 * Client component because the mobile drawer and theme toggle are interactive.
 * Everything it renders inside `children` stays a Server Component — pages
 * pass already-rendered content in, so data fetching remains server-side.
 *
 * Theme: `initialDark` is read from a cookie on the server, so the first paint
 * already matches the user's choice. The prototype defaulted to light and
 * flipped after hydration, which flashed (audit D10). The `.app.dark` class
 * stays on this div, so no CSS changed.
 */
export function AppShell({
  activePortal,
  workspaceName,
  workspaceRole,
  workspaceInitial,
  userName,
  userEmail,
  userInitial,
  initialDark,
  children,
}: {
  activePortal: 'admin' | 'portal'
  workspaceName: string
  workspaceRole: string
  workspaceInitial: string
  userName: string
  userEmail: string
  userInitial: string
  initialDark: boolean
  children: ReactNode
}) {
  const [dark, setDark] = useState(initialDark)
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

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    // Persisted so the server can render the right theme on the next request.
    document.cookie = `${THEME_COOKIE}=${next ? 'dark' : 'light'}; path=/; max-age=31536000; samesite=lax`
  }

  return (
    <div className={dark ? 'app dark' : 'app'}>
      <Sidebar
        items={nav}
        workspaceName={workspaceName}
        workspaceRole={workspaceRole}
        workspaceInitial={workspaceInitial}
        userName={userName}
        userEmail={userEmail}
        userInitial={userInitial}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <main className="main">
        <Topbar
          breadcrumb={breadcrumb}
          activePortal={activePortal}
          userInitial={userInitial}
          dark={dark}
          onToggleTheme={toggleTheme}
          onOpenMobileNav={() => setMobileOpen(true)}
        />
        <div className="content">{children}</div>
      </main>
    </div>
  )
}
