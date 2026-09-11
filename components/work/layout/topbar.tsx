'use client'

import { Fragment, type ReactNode } from 'react'
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
  crumbs,
  onOpenMobileNav,
  notifications,
  latestActivityId,
  userId,
  changeRequestsHref,
}: {
  /**
   * The trail from the workspace root to the current page, resolved from the
   * real path (see AppShell). Two or more entries: the first is always
   * "พื้นที่ทำงาน", the last is the page you are on. Every crumb is a link —
   * the last one to its own URL, so it doubles as a reload.
   */
  crumbs: { label: string; href: string }[]
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
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1
          return (
            <Fragment key={`${crumb.href}:${index}`}>
              {index > 0 && <span aria-hidden="true">/</span>}
              <Link
                className={`crumb${index === 0 ? ' crumb-root' : ''}${
                  index > 0 && !isLast ? ' crumb-mid' : ''
                }${isLast ? ' crumb-current' : ''}`}
                href={crumb.href}
                aria-current={isLast ? 'page' : undefined}
              >
                {crumb.label}
              </Link>
            </Fragment>
          )
        })}
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
