'use client'

import { useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'

import {
  accountHref,
  accountLabel,
  adminNav,
  adminProjectTabs,
  isNavItemActive,
  portalNav,
  portalProjectTabs,
  workHref,
  workPath,
} from '@/lib/work/nav'
import type { ProjectSwitcherItem } from '@/lib/work/queries/projects'
import { Footer } from './footer'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { WorkLinkProvider } from './work-link-context'

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
  stripWorkPrefix,
  workspaceRole,
  userName,
  userEmail,
  userInitial,
  userAvatarUrl,
  notifications,
  latestActivityId,
  userId,
  projects,
  children,
}: {
  activePortal: 'admin' | 'portal'
  /**
   * True when this request reached the workspace via work.<root>, where the
   * `/work` every href here is authored with is invisible — see
   * `isWorkSubdomain()` (lib/work/auth/callback-url.ts), resolved once by the
   * (admin)/(portal) layout and threaded down from here so every link in the
   * shell (and its own crumbs/accountHref) renders the host-correct path
   * instead of the raw filesystem one.
   */
  stripWorkPrefix: boolean
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
  /**
   * id → name for every project the caller can see. The portal's project
   * switcher renders from it; both portals use it for the section nav's
   * project-name header (see Sidebar / ProjectNav).
   */
  projects?: ProjectSwitcherItem[]
  children: ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  // Every href built below is authored /work-prefixed, matching nav.ts and
  // the filesystem it mirrors — this is what renders it correctly for the
  // host actually being served (see workHref's comment).
  const href = (h: string) => workHref(h, stripWorkPrefix)

  // Resolved here rather than passed in: nav items carry Lucide icon
  // *components*, and functions cannot cross the server/client boundary as
  // props. Importing the config inside this client component keeps them on
  // the client where they are rendered.
  const nav = activePortal === 'admin' ? adminNav : portalNav

  // Match against the prefix-normalised path — see workPath. `usePathname()`
  // is `/portal/…` on a hard load but `/work/portal/…` after a soft nav, so a
  // raw compare against the `/work/…` hrefs silently misses half the time.
  const path = workPath(pathname)
  const projectBaseNoPrefix = `/${activePortal}/projects`
  const activeItem = nav.find((item) => isNavItemActive(pathname, item.href)) ?? null

  // Inside a project the sidebar switches to that project's section nav, so
  // the breadcrumb names the project (and its open section) rather than the
  // now-hidden "โปรเจกต์" nav entry. Same UUID test the sidebar uses.
  const activeProjectId =
    path.match(new RegExp(`^${projectBaseNoPrefix}/([0-9a-f-]{36})(?:/|$)`))?.[1] ?? null
  const activeProjectName = activeProjectId
    ? projects?.find((project) => project.id === activeProjectId)?.name ?? null
    : null

  // The trail Topbar renders, built from the real path: workspace root, then
  // either the matched nav section, or — inside a project — โปรเจกต์ ›
  // <project name> › <open section>.
  const crumbs: { label: string; href: string }[] = [
    { label: 'พื้นที่ทำงาน', href: nav[0].href },
  ]
  if (activeProjectId) {
    const base = `/work/${activePortal}/projects/${activeProjectId}`
    const tabs = activePortal === 'admin' ? adminProjectTabs : portalProjectTabs
    const segment = path.slice(`${projectBaseNoPrefix}/${activeProjectId}`.length).split('/')[1]
    const section = segment ? tabs.find((tab) => tab.segment === segment) : null

    crumbs.push({ label: 'โปรเจกต์', href: `/work/${activePortal}/projects` })
    crumbs.push({ label: activeProjectName ?? 'โปรเจกต์นี้', href: base })
    if (section) crumbs.push({ label: section.label, href: `${base}/${section.segment}` })
  } else {
    const item = activeItem ?? nav[0]
    crumbs.push({ label: item.label, href: item.href })
  }

  return (
    // Provides stripWorkPrefix to every descendant that builds its own
    // /work-prefixed href client-side (ProjectNav, ProjectSwitcher) instead
    // of receiving an already-resolved one as a prop — see useWorkHref.
    <WorkLinkProvider stripPrefix={stripWorkPrefix}>
      <div className="app">
        <Sidebar
          activePortal={activePortal}
          items={nav.map((item) => ({ ...item, href: href(item.href) }))}
          workspaceRole={workspaceRole}
          accountHref={href(accountHref[activePortal])}
          accountLabel={accountLabel[activePortal]}
          userName={userName}
          userEmail={userEmail}
          userInitial={userInitial}
          userAvatarUrl={userAvatarUrl}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          projects={projects}
        />
        {mobileOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}
        <main className="main">
          <Topbar
            crumbs={crumbs.map((crumb) => ({ ...crumb, href: href(crumb.href) }))}
            onOpenMobileNav={() => setMobileOpen(true)}
            notifications={notifications}
            latestActivityId={latestActivityId}
            userId={userId}
            /* The help screen's first row has a different answer per audience:
               staff open the change-request queue, a client raises one from a
               project. Resolved here because this is where the portal is
               already known. */
            changeRequestsHref={href(
              activePortal === 'admin' ? '/work/admin/change-requests' : '/work/portal/projects',
            )}
          />
          {/* The footer is a sibling of .content, not a child: .main is a
              flex column filling the viewport, so `margin-top: auto` on the
              footer pins it to the bottom on short pages without it floating
              up under the last panel. */}
          <div className="content">{children}</div>
          <Footer />
        </main>
      </div>
    </WorkLinkProvider>
  )
}
