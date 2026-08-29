'use client'

import type { ReactNode } from 'react'
import { Menu } from 'lucide-react'

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
 */
export function Topbar({
  breadcrumb,
  onOpenMobileNav,
  notifications,
  latestActivityId,
  userId,
}: {
  breadcrumb: string
  onOpenMobileNav: () => void
  /** The activity feed, rendered on the server — see NotificationBell. */
  notifications: ReactNode
  latestActivityId: number | null
  userId: string
}) {
  return (
    <header className="topbar">
      <button className="icon-btn menu-btn" onClick={onOpenMobileNav} aria-label="เปิดเมนู">
        <Menu size={20} />
      </button>
      <div className="breadcrumbs">
        <span>พื้นที่ทำงาน</span>
        <span>/</span>
        <strong>{breadcrumb}</strong>
      </div>
      <div className="top-actions">
        <NotificationBell userId={userId} latestId={latestActivityId}>
          {notifications}
        </NotificationBell>
      </div>
    </header>
  )
}
