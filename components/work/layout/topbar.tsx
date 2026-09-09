'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Menu } from 'lucide-react'

import { FeedbackMenu } from './feedback-menu'
import { NotificationBell } from './notification-bell'

/**
 * Topbar: the mobile menu trigger and the breadcrumb.
 *
 * THREE CONTROLS WERE REMOVED HERE, all for the same reason — Phase 4 made
 * each of them a promise the app could not keep:
 *
 *   * The theme toggle. The workspace is light-only now.
 *
 *   * The admin/client switch. It predates real roles, when both portals were
 *     rendered from one page and flipping a boolean was enough. Staff and
 *     clients are now mutually exclusive: requireClient() bounces staff back
 *     to /work/admin and requireAdmin() bounces clients to /work/portal, so
 *     the switch could only ever return you to where you already were.
 *
 *   * The notification bell, and its unread dot. Nothing wrote notifications
 *     and nothing read them — a red dot that never clears is worse than no
 *     bell, because it trains people to ignore the one that eventually works.
 *     IT IS BACK, on `activity_logs` and with a dot that clears; see
 *     `notification-bell.tsx`. The objection was to the fake one, not to bells.
 *
 * The user avatar moved out too: identity already sits in the sidebar footer,
 * with the name, the email and the sign-out control next to it.
 *
 * ONE CONTROL WAS ADDED: the feedback widget, left of the bell. It is the only
 * thing in this bar that writes rather than reads, which is why it is a
 * labelled pill and the bell is an icon — see `feedback-menu.tsx`.
 */
export function Topbar({
  breadcrumb,
  breadcrumbHref,
  homeHref,
  onOpenMobileNav,
  notifications,
  latestActivityId,
  userId,
  changeRequestsHref,
}: {
  breadcrumb: string
  /** Where the current crumb points — its own page, so it also acts as a reload. */
  breadcrumbHref: string
  /** The portal's landing page, behind the "พื้นที่ทำงาน" crumb. */
  homeHref: string
  onOpenMobileNav: () => void
  /** The activity feed, rendered on the server — see NotificationBell. */
  notifications: ReactNode
  latestActivityId: number | null
  userId: string
  /** Where the help screen's change-request row goes — differs per portal. */
  changeRequestsHref: string
}) {
  return (
    <header className="topbar">
      <button className="icon-btn menu-btn" onClick={onOpenMobileNav} aria-label="เปิดเมนู">
        <Menu size={20} />
      </button>
      <nav className="breadcrumbs" aria-label="เส้นทางนำทาง">
        <Link className="crumb crumb-root" href={homeHref}>
          พื้นที่ทำงาน
        </Link>
        <span aria-hidden="true">/</span>
        <Link className="crumb crumb-current" href={breadcrumbHref} aria-current="page">
          {breadcrumb}
        </Link>
      </nav>
      <div className="top-actions">
        <FeedbackMenu changeRequestsHref={changeRequestsHref} />
        <NotificationBell userId={userId} latestId={latestActivityId}>
          {notifications}
        </NotificationBell>
      </div>
    </header>
  )
}
