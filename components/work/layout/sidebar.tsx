'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { isNavItemActive, type NavItem } from '@/lib/work/nav'
import { APP_NAME } from '@/lib/work/branding'
import type { ProjectSwitcherItem } from '@/lib/work/queries/projects'
import { AccountMenu } from './account-menu'
import { ProjectSwitcher } from './project-switcher'

/**
 * Sidebar.
 *
 * Same markup and classes as the prototype. Two behavioural changes:
 *  - nav entries are <Link>s instead of buttons that only set local state
 *  - the active item is derived from the URL, not from a useState value
 */
export function Sidebar({
  items,
  workspaceRole,
  accountHref,
  accountLabel,
  userName,
  userEmail,
  userInitial,
  userAvatarUrl,
  mobileOpen,
  onClose,
  projects,
}: {
  items: NavItem[]
  /** Portal only — the client's own projects for the switcher. Undefined on the admin side. */
  projects?: ProjectSwitcherItem[]
  /**
   * What this workspace is, in one line under the brand — "ผู้ดูแลระบบ
   * สูงสุด", "ลูกค้า". Null renders nothing.
   *
   * REPLACED THE WORKSPACE CHIP that used to sit below the brand. The chip
   * carried the organization name, an avatar tile and a chevron — and the
   * chevron promised a workspace switcher that was never built. Worse, it was
   * fed the user's OWN display name in the client portal, where there is no
   * organization to name, so the sidebar said who you are three times over.
   * The one part that told you something is kept; the rest is gone.
   *
   * (The schema does allow one person to hold several memberships, and
   * `getAccessContext()` still takes only the oldest. That gap is unchanged
   * and now unadvertised, which is the honest state until a real switcher
   * exists.)
   */
  workspaceRole: string | null
  /** Destination for the identity card at the foot of the sidebar. */
  accountHref: string
  /** What that destination is called inside the account menu — see AccountMenu. */
  accountLabel: string
  userName: string
  userEmail: string
  userInitial: string
  userAvatarUrl: string | null
  mobileOpen: boolean
  onClose: () => void
}) {
  const pathname = usePathname()

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="brand">
        <div className="brand-mark brand-logo">
          <Image
            src="/work/favicon.ico"
            alt=""
            width={28}
            height={28}
            unoptimized
            /* Both dimensions inline: Tailwind preflight's `height: auto` on img
               otherwise trips next/image's aspect-ratio warning. */
            style={{ width: 28, height: 28 }}
          />
        </div>
        <div className="brand-text">
          <span>{APP_NAME}</span>
          {workspaceRole && <small>พื้นที่ทำงาน{workspaceRole}</small>}
        </div>
      </div>
      {projects && <ProjectSwitcher projects={projects} />}
      <nav>
        {items.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={isNavItemActive(pathname, href) ? 'active' : ''}
            onClick={onClose}
          >
            <Icon size={17} />
            {label}
          </Link>
        ))}
      </nav>
      {/* No Settings link down here.
          It used to be hardcoded, which broke twice over once the nav became
          real: it duplicated the ตั้งค่า entry in adminNav, and it pointed at
          /work/admin/settings from BOTH portals — so a client clicking it was
          bounced straight back out by requireAdmin(). Navigation belongs in
          lib/work/nav.ts, where each portal declares its own. */}
      <div className="sidebar-bottom">
        <AccountMenu
          accountHref={accountHref}
          accountLabel={accountLabel}
          userName={userName}
          userEmail={userEmail}
          userInitial={userInitial}
          userAvatarUrl={userAvatarUrl}
          isAccountPage={isNavItemActive(pathname, accountHref)}
          onNavigate={onClose}
        />
      </div>
    </aside>
  )
}
